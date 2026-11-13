"""Every read endpoint answers without a server error, and AI features fail cleanly without a key."""

import pytest

from app.main import app


def _get_endpoints() -> list[str]:
    urls = []
    for path, operations in app.openapi()["paths"].items():
        if "get" not in operations or "{" in path:
            continue
        required = [p for p in operations["get"].get("parameters", []) if p.get("required")]
        query = "&".join(
            f"{p['name']}={'2026-11-02' if p['name'] in ('date', 'start', 'end') else 'daily'}"
            for p in required
        )
        urls.append(f"{path}?{query}" if query else path)
    return urls


@pytest.mark.parametrize("url", _get_endpoints())
def test_get_endpoint_responds(client, url):
    response = client.get(url)
    assert response.status_code < 500, response.text
    assert response.status_code != 422, f"test sends wrong parameters: {response.text}"


def test_health(client):
    assert client.get("/api/health").json()["status"] == "ok"


def test_ai_is_reported_as_disabled(client):
    assert client.get("/api/ai/status").json()["enabled"] is False


def test_ai_endpoints_return_503_without_key(client):
    response = client.post("/api/goals/polish", json={"text": "run more"})
    assert response.status_code == 503


def test_photo_upload_requires_custom_header(client):
    files = {"file": ("meal.jpg", b"x", "image/jpeg")}
    assert client.post("/api/food/analyze-photo", files=files).status_code == 403
    headers = {"X-Requested-With": "fetch"}
    response = client.post("/api/food/analyze-photo", files=files, headers=headers)
    assert response.status_code == 503  # passes the header check, then fails for lack of a key


def test_chat_streams_an_error_without_key(client):
    response = client.post("/api/chat/", json={"messages": [{"role": "user", "content": "Hi"}]})
    assert response.status_code == 200
    assert "GEMINI_API_KEY" in response.text
