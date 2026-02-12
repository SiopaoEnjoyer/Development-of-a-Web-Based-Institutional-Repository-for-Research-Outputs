from django.shortcuts import redirect, render
from django.http import HttpResponseForbidden, HttpResponse
from django.db import connection
from django.db.utils import OperationalError
from django.core.cache import cache
import logging
import psutil
import os
import gc
import time
import re

logger = logging.getLogger(__name__)

class MemoryLimiterMiddleware:
    """
    Monitors RAM usage and throttles/blocks requests when memory gets too high.
    This prevents Render from killing the process due to OOM.
    Place this FIRST in your MIDDLEWARE list.
    """
    
    EXCLUDED_PATHS = [
        '/static/',
        '/media/',
        '/favicon.ico',
        '/robots.txt',
        '/sitemap.xml',
        '/__debug__/',  
    ]
    
    MAX_MEMORY_MB = 500  
    WARNING_THRESHOLD_MB = 450  
    CRITICAL_THRESHOLD_MB = 480  
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.process = psutil.Process(os.getpid())
        self.request_count = 0
    
    def get_memory_mb(self):
        """Get current memory usage in MB"""
        mem_info = self.process.memory_info()
        return mem_info.rss / 1024 / 1024
    
    def __call__(self, request):
        if request.path == '/healthcheck/':
            return self.get_response(request)
        
        if any(request.path.startswith(path) for path in self.EXCLUDED_PATHS):
            return self.get_response(request)
        
        self.request_count += 1
        current_memory = self.get_memory_mb()
        
        if self.request_count % 50 == 0:
            logger.info(f"RAM: {current_memory:.1f}MB / {self.MAX_MEMORY_MB}MB ({(current_memory/self.MAX_MEMORY_MB*100):.1f}%)")
        
        if current_memory >= self.CRITICAL_THRESHOLD_MB:
            logger.error(f"CRITICAL RAM: {current_memory:.1f}MB - Blocking request from {request.path}")
            
            self.emergency_cleanup()
            
            return HttpResponse(
                """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Service Temporarily Busy</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 100vh;
                            margin: 0;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                        }
                        .container {
                            text-align: center;
                            padding: 40px;
                            background: rgba(255, 255, 255, 0.1);
                            border-radius: 20px;
                            backdrop-filter: blur(10px);
                            max-width: 500px;
                        }
                        h1 { font-size: 48px; margin: 0 0 20px 0; }
                        p { font-size: 18px; margin: 10px 0; opacity: 0.9; }
                        .small { font-size: 14px; margin-top: 30px; opacity: 0.7; }
                        .refresh-btn {
                            margin-top: 30px;
                            padding: 15px 30px;
                            font-size: 16px;
                            background: white;
                            color: #667eea;
                            border: none;
                            border-radius: 10px;
                            cursor: pointer;
                            font-weight: 600;
                        }
                        .refresh-btn:hover { transform: scale(1.05); transition: 0.2s; }
                    </style>
                    <script>
                        // Auto-refresh after 3 seconds
                        setTimeout(function() {
                            window.location.reload();
                        }, 3000);
                    </script>
                </head>
                <body>
                    <div class="container">
                        <h1>🐌</h1>
                        <h1>Just a Moment!</h1>
                        <p>We're experiencing high traffic on our free tier.</p>
                        <p><strong>Auto-refreshing in 3 seconds...</strong></p>
                        <button class="refresh-btn" onclick="window.location.reload()">
                            Refresh Now
                        </button>
                        <p class="small">This helps keep the service running for everyone!</p>
                    </div>
                </body>
                </html>
                """,
                status=503,
                content_type="text/html"
            )
        
        if current_memory >= self.WARNING_THRESHOLD_MB:
            logger.warning(f"WARNING RAM: {current_memory:.1f}MB - Slowing request")
            time.sleep(0.1)
            
            if self.request_count % 5 == 0:
                self.cleanup()
        
        response = self.get_response(request)
        
        if self.request_count % 20 == 0:
            self.cleanup()
        
        return response
    
    def cleanup(self):
        """Regular cleanup operations"""
        try:
            gc.collect()
            from django.db import reset_queries
            reset_queries()
            logger.debug("Cleanup: GC + query cache cleared")
        except Exception as e:
            logger.error(f"Cleanup error: {e}")

    def emergency_cleanup(self):
        """Aggressive cleanup when memory is critical"""
        try:
            gc.collect()
            gc.collect()
            gc.collect()
            from django.db import reset_queries
            reset_queries()
            logger.warning("Emergency cleanup completed")
        except Exception as e:
            logger.error(f"Emergency cleanup error: {e}")

class ApprovalCheckMiddleware:
    EXCLUDED_PATHS = [
        '/static/',
        '/media/',
        '/favicon.ico',
        '/robots.txt',
        '/sitemap.xml',
        '/healthcheck/',
        '/__debug__/',
    ]

    STATIC_CACHED_PATHS = ['/', '/about/', '/terms/', '/privacy-policy/']
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if any(request.path.startswith(path) for path in self.EXCLUDED_PATHS):
            return self.get_response(request)
        
        if request.path.startswith("/admin/"):
            return self.get_response(request)

        public_paths = [
            "/",
            "/about/",
            "/papers/",
            "/authors/",
            "/terms/",
            "/privacy-policy/",
            "/accounts/login/",
            "/accounts/register/",
            "/accounts/forgot-password/",
        ]
        
        is_public_path = any(request.path.startswith(path) for path in public_paths)

        if request.user.is_authenticated:
            if request.path in ["/accounts/login/", "/accounts/register/"]:
                return redirect("/accounts/already-logged-in/")
            
            # Admins and staff get full access (except student-only pages)
            if request.user.is_superuser or request.user.is_staff or request.user.role == 'admin':
                # Block admins from student-only pages
                student_only_paths = [
                    "/accounts/student-dashboard/",
                    "/accounts/update_consent/",
                ]
                if any(request.path.startswith(path) for path in student_only_paths):
                    return redirect("/accounts/admin-dashboard/")
                return self.get_response(request)

            cache_key = f'user_approved_{request.user.id}'
            is_approved = cache.get(cache_key)
            
            if is_approved is None:
                if hasattr(request.user, "userprofile"):
                    is_approved = request.user.userprofile.is_approved
                    cache.set(cache_key, is_approved, 60 * 30)
                else:
                    return self.get_response(request)
                            
            if is_approved:
                return self.get_response(request)

            if "/media/" in request.path and request.path.endswith(".pdf"):
                return HttpResponseForbidden("Your account must be approved to access this file.")

            allowed_paths = [
                "/accounts/pending/",
                "/accounts/logout/",
                "/accounts/verify-email-ajax/",
                "/accounts/resend-verification/",
                "/accounts/already-logged-in/",
            ]
            
            if is_public_path or request.path in allowed_paths:
                return self.get_response(request)

            return redirect("/accounts/pending/")
        
        else:
            if "/media/" in request.path and request.path.endswith(".pdf"):
                return render(request, 'research/no_access.html', status=403)
            
            if not is_public_path:
                return render(request, 'research/no_access.html', status=403)
            
            return self.get_response(request)

class DatabaseConnectionMiddleware:
    """
    Handle database connection errors gracefully with automatic retries.
    OPTIMIZED FOR NEON DB (serverless Postgres).
    """
    
    EXCLUDED_PATHS = [
        '/static/',
        '/media/',
        '/favicon.ico',
        '/robots.txt',
        '/sitemap.xml',
        '/healthcheck/',
        '/__debug__/',
    ]
    
    STATIC_PAGES = [
        '/',
        '/about/',
        '/terms/',
        '/privacy-policy/',
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.db_request_count = 0  
    
    def __call__(self, request):
        if any(request.path.startswith(path) for path in self.EXCLUDED_PATHS):
            return self.get_response(request)
        
        self.db_request_count += 1
        if self.db_request_count % 10 == 0:
            logger.info(f"DB access #{self.db_request_count}: {request.path}")
        
        max_retries = 2
        retry_delay = 0.1
        
        for attempt in range(max_retries + 1):
            try:
                if connection.connection is not None and not connection.is_usable():
                    connection.close()
                
                response = self.get_response(request)
                
                try:
                    if connection.connection is not None:
                        connection.close()
                except Exception as e:
                    logger.debug(f"Error closing connection: {e}")
                
                return response
                
            except OperationalError as e:
                error_msg = str(e).lower()
                is_connection_error = any(keyword in error_msg for keyword in [
                    'timeout', 'connection', 'server closed', 'terminated', 
                    'could not connect', 'pool', 'max_client_conn', 'too many connections'
                ])
                
                if is_connection_error:
                    logger.warning(f"DB connection attempt {attempt + 1}/{max_retries + 1} failed on {request.path}: {str(e)[:100]}")
                    
                    try:
                        connection.close()
                    except:
                        pass
                    
                    if attempt < max_retries:
                        time.sleep(retry_delay)
                        continue
                    
                    logger.error(f"All DB connection attempts failed for {request.path}")
                    
                    return HttpResponse(
                        """
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Database Connection Issue</title>
                            <style>
                                body {
                                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                                    display: flex;
                                    justify-content: center;
                                    align-items: center;
                                    min-height: 100vh;
                                    margin: 0;
                                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                    color: white;
                                }
                                .container {
                                    text-align: center;
                                    padding: 40px;
                                    background: rgba(255, 255, 255, 0.1);
                                    border-radius: 20px;
                                    backdrop-filter: blur(10px);
                                    max-width: 500px;
                                }
                                h1 { font-size: 48px; margin: 0 0 20px 0; }
                                p { font-size: 18px; margin: 10px 0; opacity: 0.9; }
                                .refresh-btn {
                                    margin-top: 30px;
                                    padding: 15px 30px;
                                    font-size: 16px;
                                    background: white;
                                    color: #667eea;
                                    border: none;
                                    border-radius: 10px;
                                    cursor: pointer;
                                    font-weight: 600;
                                }
                                .refresh-btn:hover { transform: scale(1.05); transition: 0.2s; }
                                .small { font-size: 14px; margin-top: 20px; opacity: 0.7; }
                            </style>
                            <script>
                                setTimeout(function() {
                                    window.location.reload();
                                }, 5000);
                            </script>
                        </head>
                        <body>
                            <div class="container">
                                <h1>🔧</h1>
                                <h1>Connection Issue</h1>
                                <p>We're experiencing a temporary database connection issue.</p>
                                <p><strong>Auto-refreshing in 5 seconds...</strong></p>
                                <button class="refresh-btn" onclick="window.location.reload()">
                                    Refresh Now
                                </button>
                                <p class="small">Running on free tier - occasional slowness is normal.</p>
                            </div>
                        </body>
                        </html>
                        """,
                        status=503,
                        content_type="text/html"
                    )
                else:
                    raise

class BotBlockerMiddleware:
    """Block bots from sensitive endpoints only"""
    
    BLOCKED_PATHS = [
        r'^/ajax/',
        r'^/accounts/admin/',
        r'^/admin/',
        r'^/research-dashboard/',
        r'^/accounts/pending/',
        r'^/accounts/verify-email-ajax/',
        r'^/accounts/resend-verification/',
        r'^/accounts/update_consent/',
    ]
    
    ALLOWED_BOT_PATHS = [
        r'^/$',
        r'^/about/',
        r'^/research/',
        r'^/search/',
        r'^/terms/',
        r'^/privacy-policy/',
        r'^/accounts/login/$',
        r'^/accounts/register/$',
    ]
    
    BOT_USER_AGENTS = [
        'bot', 'crawler', 'spider', 'scraper',
        'ChatGPT-User', 'OAI-SearchBot', 'GPTBot'
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.blocked_patterns = [re.compile(p) for p in self.BLOCKED_PATHS]
        self.allowed_patterns = [re.compile(p) for p in self.ALLOWED_BOT_PATHS]
    
    def __call__(self, request):
        user_agent = request.META.get('HTTP_USER_AGENT', '').lower()
        path = request.path
        
        is_bot = any(bot in user_agent for bot in self.BOT_USER_AGENTS)
        
        if not is_bot:
            return self.get_response(request)
        
        is_allowed = any(pattern.match(path) for pattern in self.allowed_patterns)
        if is_allowed:
            return self.get_response(request)
        
        is_blocked = any(pattern.match(path) for pattern in self.blocked_patterns)
        if is_blocked:
            return HttpResponseForbidden("Access denied for bots")
        
        return self.get_response(request)