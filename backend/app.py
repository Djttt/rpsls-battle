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

    CORS(app, supports_credentials=True, origins=["http://localhost:5173", "http://127.0.0.1:5173"]) # Allow frontend to talk to backend
    
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['SESSION_COOKIE_SECURE'] = False # Set to True for HTTPS
    
    db.init_app(app)
    
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(discovery_bp, url_prefix='/api/discovery')

    with app.app_context():
        db.create_all()

    return app

if __name__ == '__main__':
    app = create_app()
    # Start LAN discovery listener in background if needed
    lan_service.start_listening() 
    app.run(host='0.0.0.0', port=5001, debug=True)
