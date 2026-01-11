from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from services.lan import lan_service

discovery_bp = Blueprint('discovery', __name__)

@discovery_bp.route('/start', methods=['POST'])
@login_required
def start_discovery():
    lan_service.start_listening()
    lan_service.start_broadcasting(current_user.username)
    return jsonify({'message': 'Discovery started'}), 200

@discovery_bp.route('/peers', methods=['GET'])
def get_peers():
    # We might want to filter out ourselves if the frontend doesn't
    peers = lan_service.get_active_peers()
    # Filter only if logged in
    if current_user.is_authenticated:
       peers = [p for p in peers if p['username'] != current_user.username]
       
    return jsonify(peers), 200
