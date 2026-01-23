from django.shortcuts import redirect, render
from django.http import HttpResponseForbidden, HttpResponse
import logging
import psutil
import os
import gc

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
            import time
            time.sleep(0.3)  # 300ms delay
            
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
            logger.debug("Garbage collection triggered")
        except Exception as e:
            logger.error(f"Cleanup error: {e}")
    
    def emergency_cleanup(self):
        """Aggressive cleanup when memory is critical"""
        try:
            # Force multiple garbage collections
            gc.collect()
            gc.collect()
            gc.collect()
            logger.warning("Emergency cleanup completed")
        except Exception as e:
            logger.error(f"Emergency cleanup error: {e}")


# ============================================
# YOUR EXISTING MIDDLEWARE
# ============================================

class ApprovalCheckMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith("/admin/"):
            return self.get_response(request)

        public_paths = [
            "/",
            "/about/",
            "/papers/",
            "/authors/",
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

            if not hasattr(request.user, "userprofile"):
                return self.get_response(request)

            if request.user.userprofile.is_approved:
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


class SessionCleanupMiddleware:
    """
    Cleanup temporary session data after page loads to prevent memory leaks
    from accumulating session data across page navigations
    """
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Clean up verification session data if user is already logged in and approved
        if request.user.is_authenticated and hasattr(request.user, 'userprofile'):
            profile = request.user.userprofile
            
            # If user is approved and on non-verification pages, clear verification data
            verification_paths = [
                '/accounts/register/',
                '/accounts/login/',
                '/accounts/verify-email-ajax/',
                '/accounts/resend-verification/',
                '/accounts/forgot-password/',
                '/accounts/verify-password-reset/',
                '/accounts/resend-password-reset/',
            ]
            
            is_verification_page = any(request.path.startswith(path) for path in verification_paths)
            
            # Only clean up if user is approved AND not on a verification page
            if profile.is_approved and not is_verification_page:
                keys_to_remove = [
                    'show_verification_modal',
                    'verification_email', 
                    'verification_user_id',
                    'show_password_reset_modal',
                    'password_reset_email',
                    'password_reset_user_id',
                    'new_password_hash'
                ]
                
                modified = False
                for key in keys_to_remove:
                    if key in request.session:
                        del request.session[key]
                        modified = True
                
                if modified:
                    request.session.modified = True
        
        # Also clean up for anonymous users who aren't on auth pages
        elif not request.user.is_authenticated:
            auth_paths = [
                '/accounts/register/',
                '/accounts/login/',
                '/accounts/verify-email-ajax/',
                '/accounts/resend-verification/',
                '/accounts/forgot-password/',
            ]
            
            is_auth_page = any(request.path.startswith(path) for path in auth_paths)
            
            # Clean up ALL auth-related session data if not on auth pages
            if not is_auth_page:
                keys_to_remove = [
                    'show_verification_modal',
                    'verification_email', 
                    'verification_user_id',
                    'show_password_reset_modal',
                    'password_reset_email',
                    'password_reset_user_id',
                    'new_password_hash'
                ]
                
                modified = False
                for key in keys_to_remove:
                    if key in request.session:
                        del request.session[key]
                        modified = True
                
                if modified:
                    request.session.modified = True
        
        return response