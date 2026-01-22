
# Use only 1 worker - Render Free has limited RAM
workers = 1

# Increase timeout to 120 seconds (default is 30)
timeout = 120

# Use sync worker (most memory efficient)
worker_class = 'sync'

# Limit connections
worker_connections = 1000

# Graceful timeout
graceful_timeout = 30
keepalive = 5
preload_app = True

loglevel = 'info'
accesslog = '-'
errorlog = '-'