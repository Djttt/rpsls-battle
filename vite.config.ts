import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { spawn } from 'child_process';

const flaskPlugin = () => {
  return {
    name: 'flask-backend',
    configureServer(server) {
      // Use the virtual environment python
      const command = 'backend/venv/bin/python';
      const args = ['backend/app.py'];

      const pythonProcess = spawn(command, args, {
        stdio: 'inherit',
      });

      pythonProcess.on('error', (err) => {
        console.error('Failed to start Flask backend:', err);
      });

      const killPython = () => {
        if (pythonProcess && !pythonProcess.killed) {
          pythonProcess.kill();
        }
      };

      process.on('exit', killPython);
      process.on('SIGINT', killPython);
      process.on('SIGTERM', killPython);
      process.on('SIGQUIT', killPython);
    }
  };
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react(), flaskPlugin()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
