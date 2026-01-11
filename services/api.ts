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
