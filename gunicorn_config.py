import multiprocessing
import os

workers = 1

max_requests = 50  # Reduced from 100 - restart more often
max_requests_jitter = 10  # Add randomness to prevent all workers restarting at once

# ============================================
# Timeout settings
# ============================================
timeout = 120  # Keep your existing timeout
graceful_timeout = 30
keepalive = 5

# ============================================
# Worker configuration
# ============================================
# Use sync worker (most memory efficient)
worker_class = 'sync'

# Reduce connections per worker
worker_connections = 50  # Good setting

# Preload app = False is better for memory on single worker
preload_app = False

# ============================================
# Logging (reduce memory from logs)
# ============================================
loglevel = 'warning'  # Only log warnings and errors
accesslog = None  # Disable access log to save memory
errorlog = '-'  # Error log to stdout

# Disable access log
disable_access_log = True  # NEW: Completely disable access logging

# ============================================
# Memory and process limits
# ============================================
# Worker temporary file directory
worker_tmp_dir = '/dev/shm'  # Use shared memory for temp files (faster, less I/O)

# Limit request line and headers
limit_request_line = 4096
limit_request_fields = 100
limit_request_field_size = 8190

# ============================================
# Server hooks for monitoring
# ============================================
def on_starting(server):
    """Called just before the master process is initialized."""
    print("=" * 50)
    print("Gunicorn starting - Memory Optimized Configuration")
    print(f"Workers: {workers}")
    print(f"Max requests per worker: {max_requests}")
    print(f"Worker class: {worker_class}")
    print(f"Target: Stay under 500MB RAM")
    print("=" * 50)

def on_reload(server):
    """Called when Gunicorn reloads."""
    print("Gunicorn reloading...")

def worker_int(worker):
    """Called when worker receives INT or QUIT signal."""
    print(f"Worker {worker.pid} received shutdown signal")

def post_worker_init(worker):
    """Called after a worker has been initialized."""
    print(f"Worker {worker.pid} initialized")

def pre_fork(server, worker):
    """Called just before a worker is forked."""
    pass

def post_fork(server, worker):
    """Called after a worker has been forked."""
    # Import here to avoid issues
    import gc
    gc.collect()  # Clean up after fork

def worker_exit(server, worker):
    """Called when a worker is exited."""
    print(f"Worker {worker.pid} exited")
    import gc
    gc.collect()

# ============================================
# Additional optimizations
# ============================================
# Reduce backlog
backlog = 64  # Down from default 2048

# Daemon mode
daemon = False

# Process naming
proc_name = 'django_app'

# Environment variables
raw_env = [
    'DJANGO_SETTINGS_MODULE=G12Research.settings',  # Update with your project name
]

print("\n📊 Gunicorn configured for Render Free Tier (512MB limit)")
print("Memory will be monitored by MemoryLimiterMiddleware")
print("Workers restart every 50-60 requests to prevent memory leaks\n")