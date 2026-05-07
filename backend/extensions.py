from __future__ import annotations

import os

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address


# Memory storage is acceptable for a single-instance deployment.
# For multi-instance production, set RATE_LIMIT_STORAGE_URI to Redis.
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=os.getenv("RATE_LIMIT_STORAGE_URI", "memory://"),
    default_limits=["300 per minute"],
)
