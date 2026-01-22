from django.shortcuts import redirect, render
from functools import wraps

def roles_required(*allowed_roles):
    """
    Usage:
        @roles_required("admin")
        @roles_required("research_teacher", "admin")
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return render(request, 'accounts/no_access.html', status=403)

            if request.user.role not in allowed_roles:
                return redirect("accounts:no_access")

            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator

is_admin = roles_required("admin")
is_research_teacher = roles_required("research_teacher")
is_nonresearch_teacher = roles_required("nonresearch_teacher")
is_alumni = roles_required("alumni")
is_shs_student = roles_required("shs_student")

is_teacher = roles_required("research_teacher", "nonresearch_teacher")
is_student = roles_required("shs_student", "alumni")