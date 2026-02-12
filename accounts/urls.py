from django.urls import path
from . import views

app_name = "accounts"

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("verify-email-ajax/", views.VerifyEmailAjaxView.as_view(), name="verify_email_ajax"),
    path("resend-verification/", views.ResendVerificationCodeView.as_view(), name="resend_verification"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("no-access/", views.NoAccessView.as_view(), name="no_access"),
    path("dashboard/", views.DashboardRedirectView.as_view(), name="dashboard_redirect"),
    
    path('already-logged-in/', views.AlreadyLoggedInView.as_view(), name='already_logged_in'),
    path('pending/', views.PendingDashboardView.as_view(), name='pending_dashboard'),

    path("student/", views.StudentDashboardView.as_view(), name="student_dashboard"),
    path("teacher/", views.TeacherDashboardView.as_view(), name="teacher_dashboard"),
    path("admin/", views.AdminDashboardView.as_view(), name="admin_dashboard"),\
    path('nonresearch-teacher-dashboard/', views.NonResearchTeacherDashboardView.as_view(), name='nonresearch_teacher_dashboard'),


    # Admin - User Account Approvals Only
    path("admin/pending/", views.PendingAccountsView.as_view(), name="pending_accounts"),
    path("admin/approve/<int:id>/", views.ApproveUserView.as_view(), name="approve_user"),
    path('admin/approve-edit/<int:id>/', views.ApproveUserEditView.as_view(), name='approve_user_edit'),
    path("admin/deny/<int:id>/", views.DenyUserView.as_view(), name="deny_user"),
    
    # Teacher - Parental Consent Approvals
    path("teacher/consent-approvals/", views.ConsentApprovalsView.as_view(), name="consent_approvals"),
    path("teacher/approve_consent/<int:id>/", views.ApproveConsentView.as_view(), name="approve_consent"),
    path("teacher/deny_consent/<int:id>/", views.DenyConsentView.as_view(), name="deny_consent"),
    
    # Student consent update
    path("update_consent/", views.UpdateConsentView.as_view(), name="update_consent"),

    # User management
    path("admin/users/", views.UserManagementView.as_view(), name="user_management"),
    path("admin/users/edit/<int:id>/", views.EditUserView.as_view(), name="edit_user"),
    path('admin/users/delete/<int:id>/', views.DeleteUserView.as_view(), name='delete_user'),
    path('admin/users/toggle-active/<int:id>/', views.ToggleUserActiveView.as_view(), name='toggle_user_active'),
    path('get-user-modal/<int:id>/', views.GetUserModalView.as_view(), name='get_user_modal'),
    
    # Password reset
    path("forgot-password/", views.ForgotPasswordView.as_view(), name="forgot_password"),
    path("verify-password-reset/", views.VerifyPasswordResetView.as_view(), name="verify_password_reset"),
    path("resend-password-reset/", views.ResendPasswordResetCodeView.as_view(), name="resend_password_reset"),
]