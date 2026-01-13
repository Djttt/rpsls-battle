import os
from flask import Flask
from flask_cors import CORS
from flask_login import LoginManager
from models import db, User
from routes.auth import auth_bp
from routes.discovery import discovery_bp
from services.lan import lan_service

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'dev-secret-key' # TODO: Change in production
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    allowed_origins_env = os.environ.get('ALLOWED_ORIGINS')
    if allowed_origins_env:
        allowed_origins = [origin.strip() for origin in allowed_origins_env.split(',') if origin.strip()]
    else:
        # Default allow private-network HTTP origins (dev LAN play) and localhost dev
        allowed_origins = [
            r"http://localhost(:\d+)?",
            r"http://127\.0\.0\.1(:\d+)?",
            r"http://10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?",
            r"http://192\.168\.\d{1,3}\.\d{1,3}(:\d+)?",
            r"http://172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}(:\d+)?",
        ]

    # Echo back the actual Origin (not "*") so browsers accept cookies with credentials
    CORS(app, supports_credentials=True, resources={r"/*": {"origins": allowed_origins}})
    
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['SESSION_COOKIE_SECURE'] = False # Set to True for HTTPS
    
    db.init_app(app)
    
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    from routes.game import game_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(discovery_bp, url_prefix='/api/discovery')
    app.register_blueprint(game_bp, url_prefix='/api/game')

    with app.app_context():
        db.create_all()

    return app

if __name__ == '__main__':
    app = create_app()
    # Start LAN discovery listener in background if needed
    lan_service.start_listening() 
    app.run(host='0.0.0.0', port=5001, debug=True)

# Trigger reload
