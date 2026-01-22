from django.shortcuts import redirect, render
from django.http import HttpResponseForbidden

class ApprovalCheckMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith("/admin/"):
            print("→ Allowing: Django admin path")
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
        print(f"Is public path: {is_public_path}")

        if request.user.is_authenticated:
            print("→ User is authenticated")
            
            if request.path in ["/accounts/login/", "/accounts/register/"]:
                print("→ Redirecting to already-logged-in page")
                return redirect("/accounts/already-logged-in/")
            
            if request.user.is_superuser or request.user.is_staff:
                print("→ Allowing: User is superuser/staff")
                return self.get_response(request)

            if not hasattr(request.user, "userprofile"):
                print("→ Allowing: No userprofile found")
                return self.get_response(request)

            if request.user.userprofile.is_approved:
                print("→ Allowing: User is approved")
                return self.get_response(request)

            if "/media/" in request.path and request.path.endswith(".pdf"):
                print("→ Blocking: PDF access for unapproved user")
                return HttpResponseForbidden("Your account must be approved to access this file.")

            allowed_paths = [
                "/accounts/pending/",
                "/accounts/logout/",
                "/accounts/verify-email-ajax/",
                "/accounts/resend-verification/",
                "/accounts/already-logged-in/",
            ]
            
            if is_public_path or request.path in allowed_paths:
                print("→ Allowing: Public or allowed path for unapproved user")
                return self.get_response(request)

            print("→ Redirecting unapproved user to pending dashboard")
            return redirect("/accounts/pending/")
        
        else:
            print("→ User is NOT authenticated")
            
            if "/media/" in request.path and request.path.endswith(".pdf"):
                print("→ BLOCKING: PDF access - showing no_access.html")
                return render(request, 'research/no_access.html', status=403)
            
            if not is_public_path:
                print("→ BLOCKING: Restricted path - showing no_access.html")
                return render(request, 'research/no_access.html', status=403)
            
            print("→ Allowing: Public path")
            return self.get_response(request)