import time

from flask import Blueprint, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

from database.mongo_connection import (
    DuplicateKeyError,
    InvalidId,
    ObjectId,
    get_users_collection,
)
from services.ai_provider_service import get_provider_status
from utils.security_utils import (
    cleanup_sessions,
    create_session,
    destroy_session,
    get_session,
    read_bearer_token,
)


auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/register", methods=["POST"])
def register():
    """User registration endpoint."""
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    try:
        users = get_users_collection()
        if users.find_one({"email": email}, {"_id": 1}):
            return jsonify({"error": "Email already registered"}), 409

        pwd_hash = generate_password_hash(password)
        result = users.insert_one(
            {
                "name": name,
                "email": email,
                "password_hash": pwd_hash,
                "created_at": time.time(),
            }
        )

        user_id = str(result.inserted_id)
        token = create_session(user_id)

        return (
            jsonify(
                {
                    "token": token,
                    "user": {"id": user_id, "name": name, "email": email},
                }
            ),
            201,
        )
    except DuplicateKeyError:
        return jsonify({"error": "Email already registered"}), 409
    except Exception as e:
        return jsonify({"error": f"Registration failed: {str(e)}"}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    """User login endpoint."""
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    try:
        users = get_users_collection()
        user = users.find_one({"email": email})
        if not user or not check_password_hash(user.get("password_hash", ""), password):
            return jsonify({"error": "Invalid email or password"}), 401

        user_id = str(user.get("_id"))
        token = create_session(user_id)

        return (
            jsonify(
                {
                    "token": token,
                    "user": {
                        "id": user_id,
                        "name": user.get("name"),
                        "email": user.get("email"),
                    },
                }
            ),
            200,
        )
    except Exception as e:
        return jsonify({"error": f"Login failed: {str(e)}"}), 500


@auth_bp.route("/me", methods=["GET"])
def me():
    """Get current user info."""
    token = read_bearer_token(request)
    if not token:
        return jsonify({"error": "Not authenticated"}), 401

    cleanup_sessions()
    sess = get_session(token)
    if not sess:
        return jsonify({"error": "Session expired"}), 401

    try:
        users = get_users_collection()
        user_oid = ObjectId(sess["user_id"])
        user = users.find_one({"_id": user_oid}, {"name": 1, "email": 1})

        if not user:
            destroy_session(token)
            return jsonify({"error": "User not found"}), 404

        return (
            jsonify(
                {
                    "user": {
                        "id": str(user.get("_id")),
                        "name": user.get("name"),
                        "email": user.get("email"),
                    }
                }
            ),
            200,
        )
    except InvalidId:
        destroy_session(token)
        return jsonify({"error": "Invalid session user id"}), 401
    except Exception as e:
        return jsonify({"error": f"Could not fetch user: {str(e)}"}), 500


@auth_bp.route("/logout", methods=["POST"])
def logout():
    """User logout endpoint."""
    token = read_bearer_token(request)
    destroy_session(token)
    return jsonify({"ok": True}), 200


@auth_bp.route("/key_status", methods=["GET"])
def key_status():
    """Check which AI providers are configured and available."""
    status = get_provider_status()
    return jsonify(
        {
            "provider": status["primary"],
            "gemini": status["gemini"],
            "openai": status["openai"],
            "has_key": status["gemini"]["configured"] or status["openai"]["configured"],
            "available": (
                status["gemini"]["available"]
                or status["openai"]["available"]
                or status["primary"] == "local"
            ),
        }
    ), 200
