from django.shortcuts import redirect, render
from django.http import HttpResponseForbidden
import logging

logger = logging.getLogger(__name__)

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