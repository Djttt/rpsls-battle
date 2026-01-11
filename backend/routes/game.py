import uuid
import requests
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
import time
from models import db, User

game_bp = Blueprint('game', __name__)

# In-memory storage
# Structure:
# games[game_id] = {
#   'host': 'username',
#   'state': 'lobby' | 'active' | 'finished',
#   'settings': {'max_players': 2, 'best_of': 1, 'password': ''},
#   'players': {
#       'username': {'status': 'not_ready', 'score': 0, 'move': None, 'ip': '...', 'joined_at': ...}
#   },
#   'current_round': 1,
#   'last_event': None
# }
games = {} 
invites = {} 

@game_bp.route('/leaderboard', methods=['GET'])
def get_leaderboard():
    users = User.query.order_by(User.wins.desc()).limit(10).all()
    result = []
    for u in users:
        result.append({
            'username': u.username,
            'wins': u.wins,
            'losses': u.losses,
            'draws': u.draws
        })
    return jsonify(result), 200

# --- Room Management ---

@game_bp.route('/create_room', methods=['POST'])
@login_required
def create_room():
    data = request.json
    max_players = data.get('max_players', 2)
    best_of = data.get('best_of', 1)
    password = data.get('password', '')
    
    game_id = str(uuid.uuid4())
    
    games[game_id] = {
        'host': current_user.username,
        'state': 'lobby',
        'settings': {
            'max_players': int(max_players),
            'best_of': int(best_of),
            'password': password
        },
        'players': {
            current_user.username: {
                'status': 'ready', # Host is always conceptually ready or manually sets it? Let's say Host must click Start.
                'score': 0,
                'move': None,
                'ip': request.remote_addr,
                'joined_at': time.time()
            }
        },
        'current_round': 1,
        'last_event': {'type': 'room_created', 'timestamp': time.time()}
    }
    
    return jsonify({'game_id': game_id, 'message': 'Room created'}), 200

@game_bp.route('/remote_join', methods=['POST'])
def remote_join():
    # Public endpoint for guests to join
    data = request.json
    game_id = data.get('game_id')
    username = data.get('username')
    ip = data.get('ip')
    password = data.get('password')
    
    if not (game_id and username and ip):
         return jsonify({'error': 'Missing data'}), 400
         
    if game_id not in games:
        return jsonify({'error': 'Room not found'}), 404
    
    game = games[game_id]
    
    if game['settings']['password'] and game['settings']['password'] != password:
        return jsonify({'error': 'Invalid password'}), 403
        
    if len(game['players']) >= game['settings']['max_players']:
        return jsonify({'error': 'Room full'}), 400
        
    if game['state'] != 'lobby':
        return jsonify({'error': 'Game already in progress'}), 400

    # Add Player
    game['players'][username] = {
        'status': 'not_ready',
        'score': 0,
        'move': None,
        'ip': ip,
        'joined_at': time.time()
    }
    
    game['last_event'] = {'type': 'player_joined', 'user': username, 'timestamp': time.time()}
    
    return jsonify({'message': 'Joined room', 'game_id': game_id}), 200

@game_bp.route('/proxy_join', methods=['POST'])
@login_required
def proxy_join():
    # Guest FE calls this -> This calls Host BE remote_join
    data = request.json
    host_ip = data.get('host_ip')
    game_id = data.get('game_id')
    password = data.get('password')
    
    target_url = f"http://{host_ip}:5001/api/game/remote_join"
    payload = {
        'game_id': game_id,
        'username': current_user.username,
        'ip': request.remote_addr, # My IP (Guest IP)
        'password': password
    }
    
    try:
        resp = requests.post(target_url, json=payload, timeout=5)
        if resp.status_code == 200:
            return jsonify(resp.json()), 200
        else:
            return jsonify({'error': f'Host refused: {resp.text}'}), resp.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@game_bp.route('/remote_ready', methods=['POST'])
def remote_ready():
    # Public endpoint
    data = request.json
    game_id = data.get('game_id')
    username = data.get('username')
    
    if game_id not in games: return jsonify({'error': 'Game not found'}), 404
    game = games[game_id]
    
    if username not in game['players']:
        return jsonify({'error': 'Not in room'}), 403
        
    current_status = game['players'][username]['status']
    new_status = 'ready' if current_status == 'not_ready' else 'not_ready'
    game['players'][username]['status'] = new_status
    
    game['last_event'] = {'type': 'ready_update', 'user': username, 'status': new_status, 'timestamp': time.time()}
    return jsonify({'status': new_status}), 200

@game_bp.route('/proxy_ready', methods=['POST'])
@login_required
def proxy_ready():
    data = request.json
    host_ip = data.get('host_ip')
    game_id = data.get('game_id')
    
    target_url = f"http://{host_ip}:5001/api/game/remote_ready"
    payload = {
        'game_id': game_id,
        'username': current_user.username
    }
    
    try:
        requests.post(target_url, json=payload, timeout=2)
        return jsonify({'message': 'Toggled'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@game_bp.route('/join_room', methods=['POST'])
@login_required
def join_room():
    # Local join (for Host or if we implement local sessions)
    # Actually Host is auto-joined on create.
    # This might be unused if we rely on proxy_join?
    # Or if Host opens a new tab?
    # Let's keep it but delegate to logic.
    pass
    return jsonify({'error': 'Use proxy_join'}), 400

@game_bp.route('/<game_id>/leave', methods=['POST'])
@login_required
def leave_room(game_id):
    if game_id in games:
        if current_user.username in games[game_id]['players']:
            del games[game_id]['players'][current_user.username]
            # If host left, maybe destroy room or assign new host? For now destroy if empty or host leaves
            if len(games[game_id]['players']) == 0 or current_user.username == games[game_id]['host']:
                del games[game_id]
            else:
                 games[game_id]['last_event'] = {'type': 'player_left', 'user': current_user.username, 'timestamp': time.time()}
                 
    return jsonify({'message': 'Left room'}), 200

@game_bp.route('/<game_id>/ready', methods=['POST'])
@login_required
def toggle_ready(game_id):
    if game_id not in games: return jsonify({'error': 'Game not found'}), 404
    game = games[game_id]
    
    if current_user.username not in game['players']:
        return jsonify({'error': 'Not in room'}), 403
        
    # Toggle
    current_status = game['players'][current_user.username]['status']
    new_status = 'ready' if current_status == 'not_ready' else 'not_ready'
    game['players'][current_user.username]['status'] = new_status
    
    game['last_event'] = {'type': 'ready_update', 'user': current_user.username, 'status': new_status, 'timestamp': time.time()}
    
    return jsonify({'status': new_status}), 200

@game_bp.route('/<game_id>/start', methods=['POST'])
@login_required
def start_game(game_id):
    if game_id not in games: return jsonify({'error': 'Game not found'}), 404
    game = games[game_id]
    
    if game['host'] != current_user.username:
        return jsonify({'error': 'Only host can start'}), 403
        
    # Check all ready
    if len(game['players']) < 2:
         return jsonify({'error': 'Need at least 2 players'}), 400
         
    for p_name, p_data in game['players'].items():
        if p_name != game['host'] and p_data['status'] != 'ready':
             return jsonify({'error': f'{p_name} is not ready'}), 400
             
    game['state'] = 'active'
    game['current_round'] = 1
    # Reset scores just in case
    for p in game['players'].values():
        p['score'] = 0
        p['move'] = None
        
    game['last_event'] = {'type': 'game_start', 'timestamp': time.time()}
    
    return jsonify({'message': 'Game started'}), 200

# --- Gameplay ---

@game_bp.route('/<game_id>/move', methods=['POST'])
@login_required
def submit_move(game_id):
    if game_id not in games: return jsonify({'error': 'Game not found'}), 404
    game = games[game_id]
    
    move = request.json.get('move')
    if not move: return jsonify({'error': 'No move provided'}), 400
    
    if current_user.username not in game['players']:
        return jsonify({'error': 'Not in game'}), 403
        
    game['players'][current_user.username]['move'] = move
    
    # Check if all moved
    all_moved = all(p['move'] is not None for p in game['players'].values())
    
    if all_moved:
        # Resolve Round
        resolve_round(game)
    else:
        # Just notify someone moved (generic)
        game['last_event'] = {'type': 'move_submitted', 'user': current_user.username, 'timestamp': time.time()}
        
    return jsonify({'message': 'Move submitted'}), 200

def resolve_round(game):
    # Logic: 
    # For each player, compare with every other player.
    # Win = +1 pt, Draw/Loss = 0.
    
    round_results = {} # {username: {score_delta: 0, beats: []}}
    
    players = list(game['players'].keys())
    # Reset deltas
    for p in players: round_results[p] = {'score_delta': 0, 'wins_against': []}
    
    # Pairwise comparison
    for i in range(len(players)):
        p1 = players[i]
        move1 = game['players'][p1]['move']
        
        for j in range(i + 1, len(players)):
            p2 = players[j]
            move2 = game['players'][p2]['move']
            
            res = get_result(move1, move2)
            if res == 'win':
                round_results[p1]['score_delta'] += 1
                round_results[p1]['wins_against'].append(p2)
            elif res == 'lose':
                round_results[p2]['score_delta'] += 1
                round_results[p2]['wins_against'].append(p1)
                
    # Apply results
    for p in players:
        game['players'][p]['score'] += round_results[p]['score_delta']
        
    # Check Game Over (Best of N rounds)
    # Actually wait. Standard Best of N is usually "First to N wins". 
    # But for multiplayer, "Play N rounds, highest score wins" is better.
    # User said "3局2胜" (Best of 3, 2 wins). That implies 1v1.
    # For 4 players, let's stick to "Play N rounds".
    
    is_game_over = game['current_round'] >= game['settings']['best_of']
    
    event_type = 'game_over' if is_game_over else 'round_over'
    
    game['last_event'] = {
        'type': event_type, 
        'round': game['current_round'],
        'results': round_results, # detailed results for this round
        'moves': {p: game['players'][p]['move'] for p in players}, # Reveal moves
        'scores': {p: game['players'][p]['score'] for p in players},
        'timestamp': time.time()
    }
    
    if is_game_over:
        game['state'] = 'finished'
        # Update Leaderboard DB
        with db.session.no_autoflush:
            for p_name in players:
                user_db = User.query.filter_by(username=p_name).first()
                if user_db:
                    # Very simple logic: Winner is max score. If tie, multiple winners.
                    max_score = max(p['score'] for p in game['players'].values())
                    my_score = game['players'][p_name]['score']
                    
                    if my_score == max_score and my_score > 0:
                        user_db.wins += 1
                    else:
                        user_db.losses += 1 # Or split into 2nd/3rd place? Keep simple.
            db.session.commit()
    else:
        # Prepare next round
        game['current_round'] += 1
        for p in game['players'].values():
            p['move'] = None

def get_result(m1, m2):
    # m1 vs m2
    if m1 == m2: return 'draw'
    
    # Moves list for simple lookup or standard rules
    # Rock, Paper, Scissors, Lizard, Spock
    beats = {
        'rock': ['scissors', 'lizard'],
        'paper': ['rock', 'spock'],
        'scissors': ['paper', 'lizard'],
        'lizard': ['spock', 'paper'],
        'spock': ['rock', 'scissors']
    }
    
    if m2 in beats.get(m1, []): return 'win'
    return 'lose'

@game_bp.route('/<game_id>/state', methods=['GET'])
@login_required
def get_game_state(game_id):
    if game_id not in games: return jsonify({'error': 'Game not found'}), 404
    return jsonify(games[game_id]), 200

@game_bp.route('/<game_id>/emote', methods=['POST'])
@login_required
def send_emote(game_id):
    if game_id not in games: return jsonify({'error': 'Game not found'}), 404
    game = games[game_id]
    
    emote_id = request.json.get('emoteId')
    game['last_event'] = {
        'type': 'emote',
        'sender': current_user.username,
        'emoteId': emote_id,
        'timestamp': time.time()
    }
    return jsonify({'message': 'Emote sent'}), 200

# Legacy/Discovery Support (Modified for Rooms)
# Allow inviting to a specific room
@game_bp.route('/invite', methods=['POST'])
def receive_invite():
    # Another server calls this to invite a local user
    data = request.json
    target_user = data.get('target_user')
    from_user = data.get('from_user')
    from_ip = data.get('from_ip')
    game_id = data.get('game_id')
    has_password = data.get('has_password', False)
    
    if not (target_user and from_user and from_ip and game_id):
        return jsonify({'error': 'Missing data'}), 400
        
    if target_user not in invites:
        invites[target_user] = []
    
    invites[target_user].append({
        'from_user': from_user,
        'from_ip': from_ip,
        'game_id': game_id,
        'has_password': has_password,
        'timestamp': time.time()
    })
    
    return jsonify({'message': 'Invite received'}), 200

@game_bp.route('/invites', methods=['GET'])
@login_required
def get_invites():
    my_invites = invites.get(current_user.username, [])
    # Cleanup old?
    return jsonify(my_invites), 200

@game_bp.route('/challenge', methods=['POST'])
@login_required
def send_challenge():
    # Legacy wrapper: Create room then invite
    # This keeps old UI working mostly, or we update UI.
    # The UI calls this to "Challenge" someone. 
    # Let's adapt this to Create a 2-player room and invite.
    
    data = request.json
    target_ip = data.get('target_ip')
    target_username = data.get('target_username')
    password = data.get('password', '')
    
    # 1. Create Room
    game_id = str(uuid.uuid4())
    games[game_id] = {
        'host': current_user.username,
        'state': 'lobby',
        'settings': {
            'max_players': 2,
            'best_of': 1, # Default 1v1
            'password': password
        },
        'players': {
            current_user.username: {
                'status': 'ready',
                'score': 0,
                'move': None,
                'ip': request.remote_addr,
                'joined_at': time.time()
            }
        },
        'current_round': 1,
        'last_event': None
    }
    
    # 2. Send Invite
    try:
        target_url = f"http://{target_ip}:5001/api/game/invite"
        payload = {
            'target_user': target_username,
            'from_user': current_user.username,
            'from_ip': request.remote_addr,
            'game_id': game_id,
            'has_password': bool(password)
        }
        requests.post(target_url, json=payload, timeout=2)
    except Exception as e:
        del games[game_id]
        return jsonify({'error': f'Failed: {str(e)}'}), 500
        
    return jsonify({'game_id': game_id, 'message': 'Challenge sent'}), 200

@game_bp.route('/<game_id>/accept', methods=['POST']) # Renaming for clarity if needed, but keeping compat?
@login_required
def accept_invite(game_id):
    
    game = games[game_id]
    response = {
        'state': game['state'],
        'host': game['host'],
        'guest': game['guest'],
        # Hide moves until finished
        'host_moved': game['host_move'] is not None,
        'guest_moved': game['guest_move'] is not None,
        'last_event': game['last_event']
    }
    
    if game['state'] == 'finished':
        response['host_move'] = game['host_move']
        response['guest_move'] = game['guest_move']
        
    return jsonify(response), 200
