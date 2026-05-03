import logging

from flask import Flask
from flask_cors import CORS

from config import settings
from database.mongo_connection import ensure_users_collection, MongoClient
from models.embedding_model import embeddings_available
from routes.auth_routes import auth_bp
# from routes.dataset_routes import dataset_bp
from routes.document_routes import document_bp
from routes.qa_routes import qa_bp
from services.ai_provider_service import get_provider_status
from utils.api_logger import LOG_FILE


app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

logging.basicConfig(level=logging.INFO)

app.config["MAX_CONTENT_LENGTH"] = settings.MAX_CONTENT_LENGTH_MB * 1024 * 1024

app.register_blueprint(document_bp)
app.register_blueprint(qa_bp)
app.register_blueprint(auth_bp)
# app.register_blueprint(dataset_bp)


@app.after_request
def add_cors_headers(response):
    """Add CORS headers to all responses."""
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS,PUT,DELETE"
    return response


if __name__ == "__main__":
    logging.info("=" * 60)
    logging.info("Starting Multi-AI Document Backend")
    logging.info("=" * 60)

    provider_status = get_provider_status()

    # --- AI Provider Status ---
    logging.info("")
    logging.info("--- AI Provider Status ---")
    logging.info(f"  Primary Provider : {provider_status['primary']}")
    logging.info(f"  Gemini Available : {provider_status['gemini']['available']}")
    logging.info(f"  Gemini Model     : {provider_status['gemini']['model']}")
    logging.info(f"  OpenAI Available : {provider_status['openai']['available']}")
    logging.info(f"  OpenAI Model     : {provider_status['openai']['model']}")
    logging.info(f"  API Log File: {LOG_FILE}")
    logging.info("")

    # --- Services ---
    logging.info("--- Services ---")
    logging.info(f"  Active Provider    : {provider_status['primary']}")
    logging.info(f"  Embeddings Support : {'Enabled' if embeddings_available else 'Disabled'}")
    logging.info(f"  Database           : {'Connected' if MongoClient is not None else 'Unavailable'}")
    logging.info("")

    logging.info("All Gemini request/response logs will appear below and in the log file.")
    logging.info("Starting server on 0.0.0.0:5000")
    logging.info("=" * 60)

    try:
        ensure_users_collection()
    except Exception as e:
        logging.warning(f"Could not initialize database: {e}")

    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)
