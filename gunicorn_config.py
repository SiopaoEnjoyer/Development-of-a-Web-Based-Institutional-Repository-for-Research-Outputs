import multiprocessing

# Use only 1 worker for 512MB
workers = 1

# Restart workers after handling requests to prevent memory leaks
max_requests = 100
max_requests_jitter = 20

# Increase timeout
timeout = 120
graceful_timeout = 30
keepalive = 5

# Use sync worker (most memory efficient)
worker_class = 'sync'
worker_connections = 50  # Reduced from 1000

# Preload to save memory
preload_app = True

# Log settings
loglevel = 'warning'  # Changed from 'info' to reduce log memory
accesslog = '-'
errorlog = '-'

# Memory optimization
worker_tmp_dir = '/dev/shm'  # Use RAM disk for worker heartbeat