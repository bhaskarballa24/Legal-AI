import logging

from config import settings

try:
    from pymongo import MongoClient
    from pymongo.errors import DuplicateKeyError, PyMongoError
    from bson import ObjectId
    from bson.errors import InvalidId
except ImportError:
    MongoClient = None  # type: ignore
    DuplicateKeyError = None  # type: ignore
    PyMongoError = Exception  # type: ignore
    ObjectId = None  # type: ignore
    InvalidId = Exception  # type: ignore
    logging.warning("pymongo not installed - database disabled")


mongo_client = None
users_collection = None
documents_collection = None


def get_users_collection():
    """Create and return the MongoDB users collection."""
    global mongo_client, users_collection
    if users_collection is not None:
        return users_collection
    if MongoClient is None:
        raise RuntimeError("pymongo is not installed")

    mongo_client = MongoClient(
        settings.MONGODB_URI, serverSelectionTimeoutMS=settings.MONGODB_TIMEOUT_MS
    )
    mongo_client.admin.command("ping")
    db = mongo_client[settings.MONGODB_DB_NAME]
    users_collection = db["users"]
    users_collection.create_index("email", unique=True)
    return users_collection


def get_documents_collection():
    """Create and return the MongoDB documents collection."""
    global mongo_client, documents_collection
    if documents_collection is not None:
        return documents_collection
    if MongoClient is None:
        raise RuntimeError("pymongo is not installed")
    mongo_client = MongoClient(
        settings.MONGODB_URI, serverSelectionTimeoutMS=settings.MONGODB_TIMEOUT_MS
    )
    mongo_client.admin.command("ping")
    db = mongo_client[settings.MONGODB_DB_NAME]
    documents_collection = db["documents"]
    documents_collection.create_index("doc_id", unique=True)
    return documents_collection


def ensure_users_collection():
    """Ensure the users collection/index exists."""
    get_users_collection()

