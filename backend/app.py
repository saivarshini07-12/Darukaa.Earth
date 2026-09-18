import os
from datetime import datetime, timedelta, timezone

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///darukaa.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "a-very-secure-development-secret-key-32chars")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)

CORS(app)
db = SQLAlchemy(app)
jwt = JWTManager(app)


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)


class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, default="")
    status = db.Column(db.String(50), default="active")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    sites = db.relationship("Site", backref="project", cascade="all, delete-orphan")


class Site(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    polygon = db.Column(db.JSON, nullable=False)
    carbon_score = db.Column(db.Float, default=0.0)
    biodiversity_score = db.Column(db.Float, default=0.0)
    project_id = db.Column(db.Integer, db.ForeignKey("project.id"), nullable=False)


with app.app_context():
    db.create_all()


@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "service": "darukaa-earth-api"})


@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    name = data.get("name")

    if not email or not password or not name:
        return jsonify({"error": "Email, password, and name are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "User already exists"}), 409

    user = User(name=name, email=email, password=password)
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({"access_token": token, "user": {"id": user.id, "email": user.email, "name": user.name}}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()
    if not user or user.password != password:
        return jsonify({"error": "Invalid email or password"}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({"access_token": token, "user": {"id": user.id, "email": user.email, "name": user.name}}), 200


@app.route("/api/projects", methods=["GET", "POST"])
@jwt_required()
def projects():
    user_id = int(get_jwt_identity())

    if request.method == "GET":
        project_rows = Project.query.filter_by(user_id=user_id).all()
        return jsonify({
            "projects": [
                {
                    "id": project.id,
                    "name": project.name,
                    "description": project.description,
                    "status": project.status,
                    "created_at": project.created_at.isoformat(),
                    "sites": [
                        {
                            "id": site.id,
                            "name": site.name,
                            "polygon": site.polygon,
                            "carbon_score": site.carbon_score,
                            "biodiversity_score": site.biodiversity_score,
                        }
                        for site in project.sites
                    ],
                }
                for project in project_rows
            ]
        })

    data = request.get_json() or {}
    name = data.get("name")
    description = data.get("description", "")
    status = data.get("status", "active")
    sites = data.get("sites", [])

    if not name:
        return jsonify({"error": "Project name is required"}), 400

    project = Project(name=name, description=description, status=status, user_id=user_id)
    db.session.add(project)
    db.session.flush()

    for site_data in sites:
        site = Site(
            name=site_data.get("name"),
            polygon=site_data.get("polygon", []),
            carbon_score=site_data.get("carbon_score", 0),
            biodiversity_score=site_data.get("biodiversity_score", 0),
            project_id=project.id,
        )
        db.session.add(site)

    db.session.commit()
    return jsonify({
        "project": {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "status": project.status,
            "created_at": project.created_at.isoformat(),
            "sites": [
                {
                    "id": site.id,
                    "name": site.name,
                    "polygon": site.polygon,
                    "carbon_score": site.carbon_score,
                    "biodiversity_score": site.biodiversity_score,
                }
                for site in project.sites
            ],
        }
    }), 201


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
