"""Gunicorn configuration for Render and other container platforms."""
import multiprocessing
import os

bind = f"0.0.0.0:{os.getenv('PORT', '5000')}"
backlog = 2048

# Keep worker count conservative for the Render free tier.
workers = max(1, min(2, multiprocessing.cpu_count()))
worker_class = "sync"
timeout = 120
graceful_timeout = 30
keepalive = 5

daemon = False
pidfile = None
umask = 0
tmp_upload_dir = None

accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

preload_app = True
max_requests = 1000
max_requests_jitter = 50
proc_name = "sentinelguard-api"
