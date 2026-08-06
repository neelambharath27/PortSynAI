from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _operator_token() -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "operator@portsynai.io",
            "password": "portsynai123",
            "role": "port_operator",
        },
    )
    return response.json()["access_token"]


def test_live_snapshot_returns_containers():
    token = _operator_token()
    response = client.get(
        "/api/v1/tracking/live", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "containers" in data
    assert len(data["containers"]) > 0
    sample = data["containers"][0]
    assert "lat" in sample and "lng" in sample and "status" in sample


def test_route_history_for_known_container():
    token = _operator_token()
    live = client.get(
        "/api/v1/tracking/live", headers={"Authorization": f"Bearer {token}"}
    ).json()
    container_id = live["containers"][0]["id"]

    response = client.get(
        f"/api/v1/tracking/{container_id}/history",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["container_id"] == container_id
    assert isinstance(data["waypoints"], list)


def test_route_history_404_for_unknown_container():
    token = _operator_token()
    response = client.get(
        "/api/v1/tracking/does-not-exist/history",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404
