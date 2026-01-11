import React, { useState } from 'react';
import { authService } from '../services/api';
import { User, Lock, LogIn } from 'lucide-react';

interface AuthProps {
    onLogin: (user: any) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            if (isLogin) {
                const res = await authService.login(username, password);
                onLogin({ username: res.data.username });
            } else {
                await authService.register(username, password);
                // Auto login after register
                const res = await authService.login(username, password);
                onLogin({ username: res.data.username });
            }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || 'An error occurred');
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full">
                <div className="flex justify-center mb-6">
                    <div className="bg-indigo-600 p-3 rounded-xl">
                        {isLogin ? <LogIn size={32} /> : <User size={32} />}
                    </div>
                </div>

                <h2 className="text-3xl font-bold text-center mb-2 text-white">
                    {isLogin ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="text-slate-400 text-center mb-8">
                    {isLogin ? 'Enter your credentials to continue' : 'Sign up to battle with friends'}
                </p>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-4 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-slate-400 text-sm font-bold mb-2">Username</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-slate-500" size={18} />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                placeholder="Enter username"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-slate-400 text-sm font-bold mb-2">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                placeholder="Enter password"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 rounded-lg shadow-lg transform transition-all duration-200 hover:-translate-y-1"
                    >
                        {isLogin ? 'Sign In' : 'Create Account'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-slate-400 hover:text-white text-sm transition-colors"
                    >
                        {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
                    </button>
                </div>
            </div>
        </div>
    );
};
