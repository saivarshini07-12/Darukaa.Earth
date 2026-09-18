import pytest

from backend.app import app, db


@pytest.fixture(autouse=True)
def reset_database():
    with app.app_context():
        db.drop_all()
        db.create_all()


def test_app_health_check():
    client = app.test_client()
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.get_json()["status"] == "ok"


def test_register_and_login_flow():
    client = app.test_client()
    payload = {
        "email": "admin@example.com",
        "password": "secret123",
        "name": "Admin User",
    }

    register_response = client.post("/api/auth/register", json=payload)
    assert register_response.status_code == 201

    login_response = client.post(
        "/api/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    assert login_response.status_code == 200
    assert "access_token" in login_response.get_json()


def test_project_creation():
    client = app.test_client()
    register = client.post(
        "/api/auth/register",
        json={"email": "project-admin@example.com", "password": "secret123", "name": "Project Admin"},
    )
    token = register.get_json()["access_token"]

    response = client.post(
        "/api/projects",
        json={
            "name": "Amazon Restoration",
            "description": "Large reforestation project",
            "status": "active",
            "sites": [
                {
                    "name": "North Block",
                    "polygon": [[0, 0], [1, 0], [1, 1], [0, 1]],
                    "carbon_score": 72,
                    "biodiversity_score": 81,
                }
            ],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["project"]["name"] == "Amazon Restoration"
    assert len(data["project"]["sites"]) == 1
