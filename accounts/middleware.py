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

logger = logging.getLogger(__name__)

# ============================================
# RAM LIMITER MIDDLEWARE (Add this FIRST)
# ============================================

class MemoryLimiterMiddleware:
    """
    Monitors RAM usage and throttles/blocks requests when memory gets too high.
    This prevents Render from killing the process due to OOM.
    Place this FIRST in your MIDDLEWARE list.
    """
    
    # ✅ PATHS THAT DON'T NEED MEMORY MONITORING (static content)
    EXCLUDED_PATHS = [
        '/static/',
        '/media/',
        '/favicon.ico',
        '/robots.txt',
        '/sitemap.xml',
        '/healthcheck/',
        '/__debug__/',  # Django Debug Toolbar
    ]
    
    # Configuration (in MB)
    MAX_MEMORY_MB = 500  # Render limit is 512MB
    WARNING_THRESHOLD_MB = 450  # Start slowing down at 450MB
    CRITICAL_THRESHOLD_MB = 480  # Block new requests at 480MB
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.process = psutil.Process(os.getpid())
        self.request_count = 0
    
    def get_memory_mb(self):
        """Get current memory usage in MB"""
        mem_info = self.process.memory_info()
        return mem_info.rss / 1024 / 1024
    
    def __call__(self, request):
        # ✅ SKIP STATIC FILES AND HEALTHCHECK COMPLETELY
        if any(request.path.startswith(path) for path in self.EXCLUDED_PATHS):
            return self.get_response(request)
        
        self.request_count += 1
        current_memory = self.get_memory_mb()
        
        # Log memory every 50 requests
        if self.request_count % 50 == 0:
            logger.info(f"RAM: {current_memory:.1f}MB / {self.MAX_MEMORY_MB}MB ({(current_memory/self.MAX_MEMORY_MB*100):.1f}%)")
        
        # CRITICAL: Block requests if memory is dangerously high
        if current_memory >= self.CRITICAL_THRESHOLD_MB:
            logger.error(f"CRITICAL RAM: {current_memory:.1f}MB - Blocking request from {request.path}")
            
            # Trigger emergency cleanup
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
        
        # WARNING: Add slight delay if memory is getting high
        if current_memory >= self.WARNING_THRESHOLD_MB:
            logger.warning(f"WARNING RAM: {current_memory:.1f}MB - Slowing request")
            time.sleep(0.1)
            
            # Trigger cleanup every 5 requests when in warning zone
            if self.request_count % 5 == 0:
                self.cleanup()
        
        # Process request normally
        response = self.get_response(request)
        
        # Periodic cleanup every 20 requests
        if self.request_count % 20 == 0:
            self.cleanup()
        
        return response
    
    def cleanup(self):
        """Regular cleanup operations"""
        try:
            gc.collect()
            # Clear Django's query cache
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
            # Clear query cache
            from django.db import reset_queries
            reset_queries()
            logger.warning("Emergency cleanup completed")
        except Exception as e:
            logger.error(f"Emergency cleanup error: {e}")


# ============================================
# APPROVAL CHECK MIDDLEWARE WITH CACHING
# ============================================

class ApprovalCheckMiddleware:
    # ✅ PATHS THAT DON'T NEED AUTHENTICATION/APPROVAL CHECKS
    EXCLUDED_PATHS = [
        '/static/',
        '/media/',
        '/favicon.ico',
        '/robots.txt',
        '/sitemap.xml',
        '/healthcheck/',
        '/__debug__/',
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # ✅ SKIP STATIC FILES COMPLETELY - NO DB ACCESS
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
            
            if request.user.is_superuser or request.user.is_staff:
                return self.get_response(request)

            # ✅ Cache the approval status to avoid DB queries
            cache_key = f'user_approved_{request.user.id}'
            is_approved = cache.get(cache_key)
            
            if is_approved is None:
                # Only hit DB if not in cache
                if hasattr(request.user, "userprofile"):
                    is_approved = request.user.userprofile.is_approved
                    # Cache for 5 minutes
                    cache.set(cache_key, is_approved, 60 * 5)
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

# ============================================
# DATABASE CONNECTION MIDDLEWARE
# ============================================

class DatabaseConnectionMiddleware:
    """
    Handle database connection errors gracefully with automatic retries.
    OPTIMIZED FOR NEON DB (serverless Postgres).
    """
    
    # ✅ PATHS THAT SHOULD NEVER TOUCH THE DATABASE
    EXCLUDED_PATHS = [
        '/static/',
        '/media/',
        '/favicon.ico',
        '/robots.txt',
        '/sitemap.xml',
        '/healthcheck/',
        '/__debug__/',
    ]
    
    # ✅ STATIC TEMPLATE PAGES THAT DON'T NEED DB
    STATIC_PAGES = [
        '/',  # home.html
        '/about/',  # about.html
        '/terms/',  # terms.html
        '/privacy-policy/',  # privacy_policy.html
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # ✅ SKIP DATABASE ENTIRELY FOR STATIC FILES
        if any(request.path.startswith(path) for path in self.EXCLUDED_PATHS):
            return self.get_response(request)
        
        # ✅ SKIP DATABASE FOR STATIC TEMPLATE PAGES (if user not authenticated)
        if not request.user.is_authenticated and request.path in self.STATIC_PAGES:
            return self.get_response(request)
        
        max_retries = 2
        retry_delay = 0.1
        
        for attempt in range(max_retries + 1):
            try:
                # ✅ Only close if connection exists and is broken
                if connection.connection is not None and not connection.is_usable():
                    connection.close()
                
                response = self.get_response(request)
                
                # ✅ CRITICAL FOR NEON: Close connection after each request
                # This prevents connection pooling issues with serverless Postgres
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
                    logger.warning(f"DB connection attempt {attempt + 1}/{max_retries + 1} failed: {str(e)[:100]}")
                    
                    # Close the failed connection
                    try:
                        connection.close()
                    except:
                        pass
                    
                    # If we have retries left, try again
                    if attempt < max_retries:
                        time.sleep(retry_delay)
                        continue
                    
                    # All retries exhausted - show maintenance page
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
                    # Not a connection error, re-raise
                    raise