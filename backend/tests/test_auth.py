def register(client, email="student@example.com", password="password123"):
    return client.post(
        "/auth/register",
        json={"name": "Test Student", "email": email, "password": password},
    )


def test_register_success(client):
    response = register(client)
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "student@example.com"
    assert "password" not in body
    assert "password_hash" not in body


def test_register_duplicate_email_rejected(client):
    register(client)
    response = register(client)
    assert response.status_code == 400


def test_login_success_sets_cookie(client):
    register(client)
    response = client.post(
        "/auth/login",
        json={"email": "student@example.com", "password": "password123"},
    )
    assert response.status_code == 200
    assert "access_token" in response.cookies


def test_login_wrong_password_rejected(client):
    register(client)
    response = client.post(
        "/auth/login",
        json={"email": "student@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 401


def test_me_requires_authentication(client):
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_me_returns_current_user_when_logged_in(client):
    register(client)
    client.post(
        "/auth/login",
        json={"email": "student@example.com", "password": "password123"},
    )
    response = client.get("/auth/me")
    assert response.status_code == 200
    assert response.json()["email"] == "student@example.com"


def test_logout_clears_session(client):
    register(client)
    client.post(
        "/auth/login",
        json={"email": "student@example.com", "password": "password123"},
    )
    logout_response = client.post("/auth/logout")
    assert logout_response.status_code == 200

    me_response = client.get("/auth/me")
    assert me_response.status_code == 401
