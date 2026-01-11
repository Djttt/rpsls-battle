import socket
import threading
import time
import json

BROADCAST_PORT = 5050
BROADCAST_INTERVAL = 2  # Seconds

class LANDiscovery:
    def __init__(self):
        self.peers = {} # {ip: {username, last_seen}}
        self.running = False
        self.username = None
        self.broadcast_thread = None
        self.listen_thread = None

    def start_listening(self):
        if self.running: return
        self.running = True
        
        # Start listening
        self.listen_thread = threading.Thread(target=self._listen_loop, daemon=True)
        self.listen_thread.start()

    def start_broadcasting(self, username):
        self.username = username
        if self.broadcast_thread and self.broadcast_thread.is_alive():
            return 
        self.broadcast_thread = threading.Thread(target=self._broadcast_loop, daemon=True)
        self.broadcast_thread.start()

    def _broadcast_loop(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        
        while self.running and self.username:
            message = json.dumps({'username': self.username, 'type': 'discovery'})
            try:
                sock.sendto(message.encode(), ('<broadcast>', BROADCAST_PORT))
            except Exception as e:
                print(f"Broadcast error: {e}")
            time.sleep(BROADCAST_INTERVAL)
        sock.close()

    def _listen_loop(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        # On Mac, might need SO_REUSEPORT as well
        try:
             sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
        except AttributeError:
             pass
             
        sock.bind(('', BROADCAST_PORT))
        
        while self.running:
            try:
                data, addr = sock.recvfrom(1024)
                message = json.loads(data.decode())
                if message.get('type') == 'discovery':
                    peer_ip = addr[0]
                    self.peers[peer_ip] = {
                        'username': message['username'],
                        'last_seen': time.time(),
                        'ip': peer_ip
                    }
            except Exception as e:
                # print(f"Listen error: {e}")
                pass
        sock.close()

    def get_active_peers(self):
        # Filter out peers not seen in last 10 seconds
        now = time.time()
        active = []
        to_remove = []
        for ip, info in self.peers.items():
            if now - info['last_seen'] < 10:
                active.append(info)
            else:
                to_remove.append(ip)
        
        for ip in to_remove:
            del self.peers[ip]
            
        return active

lan_service = LANDiscovery()
