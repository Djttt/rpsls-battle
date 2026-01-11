import uuid
import requests
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
import time
from models import db, User

game_bp = Blueprint('game', __name__)

# Simple in-memory storage for games and invites
# In a real app, use Redis or DB
games = {} # {game_id: {host, guest, host_move, guest_move, state, result, password, last_event}}
invites = {} # {username: [{from_user, from_ip, game_id, has_password}]}

@game_bp.route('/leaderboard', methods=['GET'])
def get_leaderboard():
    # Top 10 users by wins
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
    return jsonify(my_invites), 200

@game_bp.route('/challenge', methods=['POST'])
@login_required
def send_challenge():
    data = request.json
    target_ip = data.get('target_ip')
    target_username = data.get('target_username')
    password = data.get('password') # Optional
    
    if not target_ip or not target_username:
        return jsonify({'error': 'Missing target info'}), 400
        
    # Create a new Game ID
    game_id = str(uuid.uuid4())
    
    # Store game state locally (I am the Host)
    games[game_id] = {
        'host': current_user.username,
        'guest': target_username,
        'host_move': None,
        'guest_move': None,
        'state': 'waiting_accept', # waiting_accept, active, finished
        'created_at': time.time(),
        'password': password,
        'last_event': None # {type: 'emote'|'move'|'end', data: ..., timestamp: ...}
    }
    
    # Send invite to target's backend
    try:
        target_url = f"http://{target_ip}:5001/api/game/invite"
        payload = {
            'target_user': target_username,
            'from_user': current_user.username,
            'from_ip': request.remote_addr,
            'game_id': game_id,
            'has_password': bool(password)
        }
        
    except Exception as e:
        del games[game_id]
        return jsonify({'error': f'Failed to prepare peer: {str(e)}'}), 500

    # Actually perform the request
    try:
        requests.post(target_url, json=payload, timeout=5)
    except Exception as e:
        del games[game_id]
        return jsonify({'error': f'Failed to send invite: {str(e)}'}), 500

    return jsonify({'game_id': game_id, 'status': 'invite_sent'}), 200

@game_bp.route('/<game_id>/accept', methods=['POST'])
@login_required
def accept_invite(game_id):
    # I am the Guest accepting an invite
    data = request.json
    host_ip = data.get('host_ip')
    password = data.get('password')
    
    if not host_ip:
        return jsonify({'error': 'Missing host IP'}), 400
        
    try:
        host_url = f"http://{host_ip}:5001/api/game/{game_id}/notify_accept"
        payload = {'guest_user': current_user.username}
        if password:
            payload['password'] = password
            
        requests.post(host_url, json=payload, timeout=5)
    except Exception as e:
        # If password fail, it triggers 500 or 403 on host, which raises exception here
        if '403' in str(e):
             return jsonify({'error': 'Invalid password'}), 403
        return jsonify({'error': f'Failed to notify host: {str(e)}'}), 500
        
    return jsonify({'message': 'Accepted', 'game_id': game_id}), 200

@game_bp.route('/<game_id>/notify_accept', methods=['POST'])
def notify_accept(game_id):
    # Host receives this
    data = request.json
    password_attempt = data.get('password')
    
    if game_id not in games:
        return jsonify({'error': 'Game not found'}), 404
        
    game = games[game_id]
    
    if game['password'] and game['password'] != password_attempt:
        return jsonify({'error': 'Invalid password'}), 403
        
    game['state'] = 'active'
    # Initial event
    game['last_event'] = {'type': 'start', 'timestamp': time.time()}
    
    return jsonify({'message': 'Game active'}), 200

@game_bp.route('/<game_id>/move', methods=['POST'])
def submit_move(game_id):
    data = request.json
    player = data.get('username')
    move = data.get('move')
    
    if game_id not in games:
        return jsonify({'error': 'Game not found'}), 404
        
    game = games[game_id]
    
    # Check if player is part of game
    if player == game['host']:
        game['host_move'] = move
    elif player == game['guest']:
        game['guest_move'] = move
    else:
        return jsonify({'error': 'Unauthorized player'}), 403
        
    # Check if both moved
    if game['host_move'] and game['guest_move']:
        game['state'] = 'finished'
        game['last_event'] = {'type': 'fight', 'timestamp': time.time()}
        
        # Calculate result and update leaderboard
        # Determine winner
        from app import create_app # Cyclic? No, create_app is factory. 
        # We need to access DB context. 
        # Actually logic for winning is duplicated in frontend.
        # Let's do a simple check here for stats.
        # Rules:
        # Rock: Scissors, Lizard
        # Paper: Rock, Spock
        # Scissors: Paper, Lizard
        # Lizard: Spock, Paper
        # Spock: Scissors, Rock
        rules = {
            'rock': ['scissors', 'lizard'],
            'paper': ['rock', 'spock'],
            'scissors': ['paper', 'lizard'],
            'lizard': ['spock', 'paper'],
            'spock': ['scissors', 'rock']
        }
        
        host_wins = False
        guest_wins = False
        draw = False
        
        hm = game['host_move']
        gm = game['guest_move']
        
        if hm == gm:
            draw = True
        elif gm in rules[hm]:
            host_wins = True
        else:
            guest_wins = True
            
        with db.session.begin(): # This might need app context if not running in request? We are in request.
             host_user = User.query.filter_by(username=game['host']).first()
             guest_user = User.query.filter_by(username=game['guest']).first()
             
             if host_user and guest_user:
                 if draw:
                     host_user.draws += 1
                     guest_user.draws += 1
                 elif host_wins:
                     host_user.wins += 1
                     guest_user.losses += 1
                 else:
                     host_user.losses += 1
                     guest_user.wins += 1
             
             db.session.commit()
    
    return jsonify({'message': 'Move received'}), 200

@game_bp.route('/<game_id>/emote', methods=['POST'])
def send_emote(game_id):
    data = request.json
    emote = data.get('emote')
    sender = data.get('sender')
    
    if game_id not in games:
        return jsonify({'error': 'Game not found'}), 404
    
    games[game_id]['last_event'] = {
        'type': 'emote',
        'emote': emote,
        'sender': sender,
        'timestamp': time.time()
    }
    return jsonify({'message': 'Emote sent'}), 200

@game_bp.route('/<game_id>/state', methods=['GET'])
def get_game_state(game_id):
    # Both Frontends poll this from the Host Backend
    if game_id not in games:
        return jsonify({'error': 'Game not found'}), 404
    
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
