import os
import time
import pickle
import json
import hashlib
import logging

logger = logging.getLogger(__name__)

CACHE_DIR = os.path.join(os.path.dirname(__file__), "data_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

def _get_cache_path(key: str, ext: str):
    hashed_key = hashlib.md5(key.encode()).hexdigest()
    return os.path.join(CACHE_DIR, f"{hashed_key}.{ext}")

def get_cached(key: str, ttl: int = 900):
    """
    Retrieve cached data if it exists and has not expired.
    ttl defaults to 15 minutes (900 seconds).
    """
    # Try pickle first (for DataFrames)
    pkl_path = _get_cache_path(key, "pkl")
    if os.path.exists(pkl_path):
        mtime = os.path.getmtime(pkl_path)
        if (time.time() - mtime) < ttl:
            try:
                with open(pkl_path, 'rb') as f:
                    logger.info(f"CACHE HIT: {key} (DataFrame)")
                    return pickle.load(f)
            except Exception as e:
                logger.error(f"Cache read error (pkl): {e}")

    # Try json
    js_path = _get_cache_path(key, "json")
    if os.path.exists(js_path):
        mtime = os.path.getmtime(js_path)
        if (time.time() - mtime) < ttl:
            try:
                with open(js_path, 'r') as f:
                    logger.info(f"CACHE HIT: {key} (JSON)")
                    return json.load(f)
            except Exception as e:
                logger.error(f"Cache read error (json): {e}")

    return None

def set_cache(key: str, data, use_pkl: bool = True):
    """
    Save data to disk.
    """
    if use_pkl:
        pkl_path = _get_cache_path(key, "pkl")
        try:
            with open(pkl_path, 'wb') as f:
                pickle.dump(data, f)
            logger.info(f"CACHE SET: {key} (pkl)")
        except Exception as e:
            logger.error(f"Cache set error (pkl): {e}")
    else:
        js_path = _get_cache_path(key, "json")
        try:
            with open(js_path, 'w') as f:
                json.dump(data, f)
            logger.info(f"CACHE SET: {key} (json)")
        except Exception as e:
            logger.error(f"Cache set error (json): {e}")
