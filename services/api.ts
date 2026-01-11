import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

export const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

export const authService = {
    register: (username, password) => api.post('/auth/register', { username, password }),
    login: (username, password) => api.post('/auth/login', { username, password }),
    logout: () => api.post('/auth/logout'),
    getCurrentUser: () => api.get('/auth/me'),
};

export const discoveryService = {
    start: () => api.post('/discovery/start'),
    getPeers: () => api.get('/discovery/peers'),
};

export const gameService = {
    leaveRoom: (gameId: string) => api.post(`/game/${gameId}/leave`),
    toggleReady: (gameId: string) => api.post(`/game/${gameId}/ready`),
    startGame: (gameId: string) => api.post(`/game/${gameId}/start`),

    // Remote helpers (Direct to Host)
    getGameStateRemote: (hostIp: string, gameId: string) =>
        axios.get(`http://${hostIp}:5001/api/game/${gameId}/state`),

    toggleReadyRemote: (hostIp: string, gameId: string) =>
        api.post('/game/proxy_ready', { host_ip: hostIp, game_id: gameId }), // Proxy ready toggle to attach User Identity

    // Proxy Ready Endpoint needs to be added to Game.py?
    // Actually, simple toggle ready is fine via proxy. I need to implement `proxy_ready` in backend.

    // Legacy support
    sendChallenge: (targetIp: string, targetUsername: string, password?: string) =>
        api.post('/game/challenge', { target_ip: targetIp, target_username: targetUsername, password }),
    getGameState: (gameId: string, hostIp?: string) => {
        const url = hostIp ? `http://${hostIp}:5001/api/game/${gameId}/state` : `/game/${gameId}/state`;
        return axios.get(url, { withCredentials: true });
    },
    getLeaderboard: () => api.get('/game/leaderboard'),
    sendEmote: (gameId: string, emoteId: string, sender: string, hostIp?: string) => {
        const url = hostIp ? `http://${hostIp}:5001/api/game/${gameId}/emote` : `/game/${gameId}/emote`;
        return axios.post(url, { emote: emoteId, sender }, { withCredentials: true }); // emoteId mapped to emote field
    },

    // Missing Methods
    getInvites: () => api.get('/game/invites'),
    joinRoom: (gameId: string, hostIp?: string, password?: string) => {
        // If hostIp provided, we join via proxy (remote_join called by backend) or direct?
        // Actually, `join_invite` endpoint in backend handles accepting invitations.
        // But `join_room` is for joining via Room ID/Discovery? 
        // Logic: if Host IP is known, we tell OUR backend to join THAT room (proxy join)?
        // OR we tell OUR backend to accept an invite?

        // MultiplayerManager uses joinRoom when accepting an Invite.
        // Invite has `game_id` and `from_ip`.
        // We calculate if it is a "standard invite accept" or a "new join".
        // Use `acceptInvite` logic?
        return api.post(`/game/${gameId}/accept`, { host_ip: hostIp, password });
    },
    createRoom: (maxPlayers: number, bestOf: number, password?: string) =>
        api.post('/game/create_room', { max_players: maxPlayers, best_of: bestOf, password }),

    submitMove: (gameId: string, username: string, move: string, hostIp?: string) => {
        const url = hostIp ? `http://${hostIp}:5001/api/game/${gameId}/move` : `/game/${gameId}/move`;
        return axios.post(url, { move: move, username }, { withCredentials: true });
    }
};
