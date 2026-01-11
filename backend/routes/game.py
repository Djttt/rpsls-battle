import uuid
import requests
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
import time

game_bp = Blueprint('game', __name__)

# Simple in-memory storage for games and invites
# In a real app, use Redis or DB
games = {} # {game_id: {host, guest, host_move, guest_move, state, result}}
invites = {} # {username: [{from_user, from_ip, game_id}]}

@game_bp.route('/invite', methods=['POST'])
def receive_invite():
    # Another server calls this to invite a local user
    data = request.json
    target_user = data.get('target_user')
    from_user = data.get('from_user')
    from_ip = data.get('from_ip')
    game_id = data.get('game_id')
    
    if not (target_user and from_user and from_ip and game_id):
        return jsonify({'error': 'Missing data'}), 400
        
    if target_user not in invites:
        invites[target_user] = []
    
    invites[target_user].append({
        'from_user': from_user,
        'from_ip': from_ip,
        'game_id': game_id,
        'timestamp': time.time()
    })
    
    return jsonify({'message': 'Invite received'}), 200

@game_bp.route('/invites', methods=['GET'])
@login_required
def get_invites():
    my_invites = invites.get(current_user.username, [])
    # Clear old invites? For now, keep them until accepted or rejected mechanism added
    # Just return them
    return jsonify(my_invites), 200

@game_bp.route('/challenge', methods=['POST'])
@login_required
def send_challenge():
    data = request.json
    target_ip = data.get('target_ip')
    target_username = data.get('target_username')
    
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
        'created_at': time.time()
    }
    
    # Send invite to target's backend
    try:
        # Assuming port 5001 for all peers for now, or we could have exchanged ports in discovery
        target_url = f"http://{target_ip}:5001/api/game/invite"
        payload = {
            'target_user': target_username,
            'from_user': current_user.username,
            'from_ip': request.remote_addr, # Trying to guess my IP from request, might need better way
            'game_id': game_id
        }
        # Hack: request.remote_addr is 127.0.0.1 if behind proxy, need actual LAN IP
        # For now, let's rely on the frontend sending 'my_ip' or similar if possible? 
        # Or even better, the Discovery service already knows my IP.
        # Let's just pass `host_ip` from frontend or discovery.
        # UPDATE: The discovery service broadcasts my IP. The target knows my IP from discovery.
        # But here I need to tell the target where to reply.
        # Let's assume the target can reach me at the IP they discovered me at. 
        # Ideally, we should include 'from_ip' explicitly if we know it.
        # For simplicity, we'll try to rely on the payload.
        
        # Better approach: 
        # The frontend knows my IP (from discovery peers list? no). 
        # The backend knows its own IP? Maybe.
        # Let's ask the Frontend to include "my_ip" in the /challenge request, 
        # or we just rely on the Caller's IP address when the request hits the target?
        
        # When I call target_url, target sees my IP as remote_addr.
        pass 
    except Exception as e:
        del games[game_id]
        return jsonify({'error': f'Failed to contact peer: {str(e)}'}), 500

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
    # I need to notify the Host that I accepted
    data = request.json
    host_ip = data.get('host_ip')
    
    if not host_ip:
        return jsonify({'error': 'Missing host IP'}), 400
        
    try:
        host_url = f"http://{host_ip}:5001/api/game/{game_id}/notify_accept"
        requests.post(host_url, json={'guest_user': current_user.username}, timeout=5)
    except Exception as e:
        return jsonify({'error': f'Failed to notify host: {str(e)}'}), 500
        
    return jsonify({'message': 'Accepted', 'game_id': game_id}), 200

@game_bp.route('/<game_id>/notify_accept', methods=['POST'])
def notify_accept(game_id):
    # Host receives this
    print(f"Notify accept for {game_id}")
    if game_id in games:
        games[game_id]['state'] = 'active'
        return jsonify({'message': 'Game active'}), 200
    return jsonify({'error': 'Game not found'}), 404

@game_bp.route('/<game_id>/move', methods=['POST'])
@login_required # OR if it is a peer call? 
# Wait, if I am the Host, I receive moves from:
# 1. My local frontend (Host player)
# 2. The Guest's backend (proxying Guest player move) OR Guest frontend directly?
# Let's say Guest Frontend sends move to Host Backend directly.
# But Guest Frontend needs to know Host IP. (It does).
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
        # Calculate result here or let frontend do it? 
        # Better backend does it to avoid cheating, but simplest is just reveal moves.
        
    return jsonify({'message': 'Move received'}), 200

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
        'guest_moved': game['guest_move'] is not None
    }
    
    if game['state'] == 'finished':
        response['host_move'] = game['host_move']
        response['guest_move'] = game['guest_move']
        
    return jsonify(response), 200
