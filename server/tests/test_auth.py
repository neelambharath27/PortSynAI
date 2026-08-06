from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_login_success():
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "admin@portsynai.io",
            "password": "portsynai123",
            "role": "administrator",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "administrator"


def test_login_wrong_password():
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "admin@portsynai.io",
            "password": "wrong-password",
            "role": "administrator",
        },
    )
    assert response.status_code == 401


def test_protected_endpoint_requires_token():
    response = client.get("/api/v1/auth/me")
    assert response.status_code in (401, 403)


def test_rbac_blocks_non_admin_from_user_management():
    login = client.post(
        "/api/v1/auth/login",
        json={
            "email": "operator@portsynai.io",
            "password": "portsynai123",
            "role": "port_operator",
        },
    )
    token = login.json()["access_token"]
    response = client.get(
        "/api/v1/users", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403


def test_container_summary_reachable_by_any_role():
    login = client.post(
        "/api/v1/auth/login",
        json={
            "email": "security@portsynai.io",
            "password": "portsynai123",
            "role": "security_officer",
        },
    )
    token = login.json()["access_token"]
    response = client.get(
        "/api/v1/containers/stats/summary",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert "total_containers" in response.json()
