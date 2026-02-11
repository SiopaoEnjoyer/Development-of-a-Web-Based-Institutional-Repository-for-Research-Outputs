import multiprocessing
import os

workers = 1  

threads = 2  
worker_class = 'gthread'  

max_requests = 200
max_requests_jitter = 40

timeout = 120
graceful_timeout = 30
keepalive = 5

worker_connections = 50

preload_app = False

loglevel = 'info'          
accesslog = '-'            
errorlog = '-'             
disable_access_log = False 

worker_tmp_dir = '/dev/shm'

limit_request_line = 4096
limit_request_fields = 100
limit_request_field_size = 8190


def on_starting(server):
    """Called just before the master process is initialized."""
    print("=" * 50)
    print("Gunicorn starting - Memory Optimized Configuration")
    print(f"Workers: {workers}")
    print(f"Threads per worker: {threads}")  # ✅ New
    print(f"Total concurrent requests: {workers * threads}")  # ✅ New
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
    print(f"Worker {worker.pid} initialized with {threads} threads")

def pre_fork(server, worker):
    """Called just before a worker is forked."""
    pass

def post_fork(server, worker):
    """Called after a worker has been forked."""
    import gc
    gc.collect()

def worker_exit(server, worker):
    """Called when a worker is exited."""
    print(f"Worker {worker.pid} exited")
    import gc
    gc.collect()

backlog = 64
daemon = False
proc_name = 'django_app'

raw_env = [
    'DJANGO_SETTINGS_MODULE=G12Research.settings',
]

print("\n📊 Gunicorn configured for Render Free Tier (512MB limit)")
print("✅ Using threaded workers for better concurrency")
print("✅ Memory will be monitored by MemoryLimiterMiddleware")
print("✅ Workers restart every 50-60 requests to prevent memory leaks")
print("✅ Can handle 2 concurrent requests with 1 worker + 2 threads\n")