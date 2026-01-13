import axios from 'axios';

const resolveApiUrl = (): string => {
    const envUrl = import.meta.env.VITE_API_URL?.trim();
    if (envUrl) {
        return `${envUrl.replace(/\/$/, '')}/api`;
    }

    if (typeof window !== 'undefined') {
        const { protocol, hostname } = window.location;
        const port = import.meta.env.VITE_API_PORT || '5001';
        return `${protocol}//${hostname}:${port}/api`;
    }

    return 'http://localhost:5001/api';
};

export const api = axios.create({
    baseURL: resolveApiUrl(),
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
    getInvites: () => api.get('/game/invites'),
    sendChallenge: (targetIp: string, targetUsername: string, password?: string) => api.post('/game/challenge', { target_ip: targetIp, target_username: targetUsername, password }),
    acceptInvite: (gameId: string, hostIp: string, password?: string) => api.post(`/game/${gameId}/accept`, { host_ip: hostIp, password }),
    submitMove: (gameId: string, username: string, move: string, hostIp?: string) => {
        // If we are guest, we need to send move to HOST's backend.
        // But for simplicity/security (CORS), maybe we proxy through our backend?
        // Or if we have hostIp, we can call Host directly if CORS allows.
        // My backend configured CORS for localhost:5173. 
        // If I call Host backend directly from Guest Frontend, my Origin is localhost:5173.
        // Converting hostIp to URL:
        const url = hostIp ? `http://${hostIp}:5001/api/game/${gameId}/move` : `/game/${gameId}/move`;
        return axios.post(url, { username, move }, { withCredentials: true });
    },
    getGameState: (gameId: string, hostIp?: string) => {
        const url = hostIp ? `http://${hostIp}:5001/api/game/${gameId}/state` : `/game/${gameId}/state`;
        return axios.get(url, { withCredentials: true });
    },
    getLeaderboard: () => api.get('/game/leaderboard'),
    sendEmote: (gameId: string, emote: string, sender: string, hostIp?: string) => {
        const url = hostIp ? `http://${hostIp}:5001/api/game/${gameId}/emote` : `/game/${gameId}/emote`;
        return axios.post(url, { emote, sender }, { withCredentials: true });
    }
};
