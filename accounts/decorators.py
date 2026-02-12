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

# Admin only
is_admin = roles_required("admin")

# Research teacher only (for research management)
is_research_teacher_only = roles_required("research_teacher", "admin")

# Non-research teacher only
is_nonresearch_teacher = roles_required("nonresearch_teacher", "admin")

# Any teacher (for consent approvals, shared features)
is_teacher = roles_required("research_teacher", "nonresearch_teacher", "admin")

# Student roles
is_alumni = roles_required("alumni")
is_shs_student = roles_required("shs_student")
is_student = roles_required("shs_student", "alumni")