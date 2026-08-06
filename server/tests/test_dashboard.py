from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _token() -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "operator@portsynai.io",
            "password": "portsynai123",
            "role": "port_operator",
        },
    )
    return response.json()["access_token"]


def test_dashboard_summary_shape():
    token = _token()
    response = client.get(
        "/api/v1/dashboard/summary", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()

    assert data["counts"]["total_containers"] > 0
    assert len(data["container_traffic"]) == 7
    assert len(data["monthly_report"]) == 6
    assert set(data["clearance_distribution"].keys()) == {"approved", "pending", "rejected"}
    assert set(data["risk_distribution"].keys()) == {"low", "medium", "high"}
    assert len(data["recent_alerts"]) <= 5
    assert len(data["recent_activity"]) <= 8


def test_dashboard_summary_requires_auth():
    response = client.get("/api/v1/dashboard/summary")
    assert response.status_code in (401, 403)
