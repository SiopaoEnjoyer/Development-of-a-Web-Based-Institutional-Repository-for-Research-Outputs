import profile
from django.shortcuts import redirect, get_object_or_404
from django.views import View
from django.views.generic import TemplateView, ListView, FormView
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.contrib import messages
from django.urls import reverse_lazy
from django.utils import timezone
from django.core.files.storage import default_storage
from django.http import JsonResponse, HttpResponse, Http404
from .models import User, UserProfile
from research.models import Author
from .forms import RegistrationForm, LoginForm, EmailVerificationForm
from .utils import send_approval_email, send_verification_email, send_password_reset_email
from django.template.loader import render_to_string
from django.contrib.auth.hashers import make_password
from datetime import timedelta
from django.utils.timezone import now
from django.http import HttpResponse
from django.db.models import Count, Q, Exists, OuterRef, Subquery, Prefetch
from storage import SupabaseStorage
import mimetypes
from django.contrib.auth.decorators import login_required

@login_required
def serve_pdf(request, path):
    """Serve PDF files from Supabase storage with authentication"""
    try:
        storage = SupabaseStorage()
        
        # Check if path is a research paper PDF
        if path.startswith('research_papers/'):
            # Any authenticated user can view research papers
            file_content = storage.get_file_content(path)
            
        elif path.startswith('parental_consents/'):
            # Only the user can view their own consent file (or staff)
            path_parts = path.split('/')
            if len(path_parts) >= 2:
                file_user_id = path_parts[1]
                if str(request.user.id) != file_user_id and not request.user.is_staff:
                    raise Http404("You don't have permission to view this file")
            
            file_content = storage.get_file_content(path)
        else:
            raise Http404("File not found")
        
        # Determine content type
        content_type, _ = mimetypes.guess_type(path)
        if not content_type:
            content_type = 'application/pdf'
        
        response = HttpResponse(file_content, content_type=content_type)
        response['Content-Disposition'] = f'inline; filename="{path.split("/")[-1]}"'
        return response
        
    except Exception as e:
        raise Http404(f"File not found: {str(e)}")


class RoleRequiredMixin(UserPassesTestMixin):
    role = None
    def test_func(self):
        return self.request.user.role == self.role

    def handle_no_permission(self):
        return redirect("accounts:no_access")

class RegisterView(FormView):
    template_name = "accounts/register.html"
    form_class = RegistrationForm
    
    def get(self, request, *args, **kwargs):
        # Clear verification modal session data on GET (page load)
        if 'show_verification_modal' in request.session:
            del request.session['show_verification_modal']
        if 'verification_email' in request.session:
            del request.session['verification_email']
        if 'verification_user_id' in request.session:
            del request.session['verification_user_id']
        request.session.modified = True
        
        return super().get(request, *args, **kwargs)
    
    def get_form(self, form_class=None):
        form = super().get_form(form_class)
        # Remove admin role from choices
        form.fields['role'].choices = [
            choice for choice in User.ROLE_CHOICES 
            if choice[0] != 'admin'
        ]
        return form
    
    def get_success_url(self):
        # Stay on register page to show modal
        return self.request.path
    
    def form_valid(self, form):
        # Form.save() handles everything now
        user = form.save(commit=True)
        
        # ✅ OPTIMIZED: Use select_related to avoid extra query
        profile = UserProfile.objects.select_related('user').get(user=user)
        
        # Generate verification code
        code = profile.generate_verification_code()
        user_name = profile.pending_first_name or ""
        
        # Store in session for modal
        self.request.session['verification_email'] = user.email
        self.request.session['verification_user_id'] = user.id
        self.request.session['show_verification_modal'] = True
        self.request.session.modified = True
        
        # Send verification email
        email_sent = send_verification_email(user.email, code, user_name)
        
        if not email_sent:
            print(f"\n{'='*50}\nVERIFICATION CODE: {code}\n{'='*50}\n")
        
        # Return with fresh empty form
        context = self.get_context_data(form=RegistrationForm())
        return self.render_to_response(context)

class LoginView(FormView):
    template_name = "accounts/login.html"
    form_class = LoginForm

    def get(self, request, *args, **kwargs):
        # Clear any leftover verification session data
        if 'show_verification_modal' in request.session:
            del request.session['show_verification_modal']
        if 'verification_email' in request.session:
            del request.session['verification_email']
        if 'verification_user_id' in request.session:
            del request.session['verification_user_id']
        request.session.modified = True
        
        return super().get(request, *args, **kwargs)

    def get_success_url(self):
        return self.request.path

    def form_valid(self, form):
        email = form.cleaned_data["email"]
        password = form.cleaned_data["password"]

        user = authenticate(self.request, username=email, password=password)

        if user is not None:
            # Check if email is verified in THIS SESSION
            session_key = f'email_verified_{user.id}'
            is_session_verified = self.request.session.get(session_key, False)
            
            if not is_session_verified:
                # Need to verify for this session
                profile = user.userprofile
                code = profile.generate_verification_code()
                user_name = profile.pending_first_name or ""
                
                self.request.session['verification_email'] = user.email
                self.request.session['verification_user_id'] = user.id
                self.request.session['show_verification_modal'] = True
                
                email_sent = send_verification_email(user.email, code, user_name)
                
                if not email_sent:
                    print(f"\n{'='*50}\nVERIFICATION CODE: {code}\n{'='*50}\n")
                
                self.request.session.modified = True
                return self.render_to_response(self.get_context_data(form=LoginForm()))
            
            # Already verified in this session
            login(self.request, user)
            return redirect("accounts:dashboard_redirect")
        else:
            form.add_error(None, "Invalid email or password. Please try again.")

        return self.form_invalid(form)

class VerifyEmailAjaxView(View):
    def post(self, request):
        code = request.POST.get('code', '').strip()
        user_id = request.session.get('verification_user_id')
        
        if not user_id:
            return JsonResponse({'success': False, 'message': 'No verification in progress.'})
        
        try:
            # ✅ OPTIMIZED: select_related to avoid extra query
            user = User.objects.select_related('userprofile').get(id=user_id)
            profile = user.userprofile
            
            # Check if account is locked
            if profile.verification_locked_until:
                if now() < profile.verification_locked_until:
                    time_remaining = profile.verification_locked_until - now()
                    hours = int(time_remaining.total_seconds() // 3600)
                    return JsonResponse({
                        'success': False,
                        'locked': True,
                        'message': f'Too many verification attempts. Account locked for {hours} more hours.'
                    })
                else:
                    profile.verification_attempts = 0
                    profile.verification_locked_until = None
                    profile.save()
            
            # Check attempt limit
            MAX_ATTEMPTS = 10
            if profile.verification_attempts >= MAX_ATTEMPTS:
                profile.verification_locked_until = now() + timedelta(hours=24)
                profile.save()
                return JsonResponse({
                    'success': False,
                    'locked': True,
                    'message': 'Too many verification attempts. Your account has been locked for 24 hours.'
                })
            
            # Increment attempt counter
            profile.verification_attempts += 1
            profile.save()
            
            if profile.is_verification_code_valid(code):
                # Successful verification - reset attempts
                profile.email_verified = True
                profile.email_verification_code = None
                profile.verification_attempts = 0
                profile.verification_locked_until = None
                profile.save()
                
                # Mark as verified in THIS SESSION
                session_key = f'email_verified_{user.id}'
                request.session[session_key] = True
                
                # Log the user in
                login(request, user)
                
                # Clear verification session data
                request.session.pop('verification_email', None)
                request.session.pop('verification_user_id', None)
                request.session.pop('show_verification_modal', None)
                
                # Redirect based on approval status
                if profile.is_approved:
                    redirect_url = str(reverse_lazy('accounts:dashboard_redirect'))
                else:
                    redirect_url = str(reverse_lazy('accounts:pending_dashboard'))
                
                return JsonResponse({
                    'success': True, 
                    'message': 'Email verified!',
                    'redirect': redirect_url
                })
            else:
                attempts_remaining = MAX_ATTEMPTS - profile.verification_attempts
                return JsonResponse({
                    'success': False,
                    'locked': False,
                    'message': f'Invalid or expired verification code. {attempts_remaining} attempts remaining.'
                })
        except User.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'User not found.'})
            
class DashboardRedirectView(LoginRequiredMixin, View):
    def get(self, request):
        profile = request.user.userprofile
        
        # If user is not approved, send to pending dashboard
        if not profile.is_approved:
            return redirect("accounts:pending_dashboard")
        
        # Otherwise, route based on role
        role = request.user.role
        mapping = {
            "shs_student": "accounts:student_dashboard",
            "alumni": "accounts:student_dashboard",
            "research_teacher": "accounts:teacher_dashboard",
            "nonresearch_teacher": "accounts:teacher_dashboard",
            "admin": "accounts:admin_dashboard",
        }
        return redirect(mapping.get(role, "accounts:no_access"))

class ResendVerificationCodeView(View):
    def post(self, request):
        user_id = request.session.get('verification_user_id')
        
        if not user_id:
            return JsonResponse({'success': False, 'message': 'No verification in progress.'})
        
        try:
            user = User.objects.select_related('userprofile').get(id=user_id)
            profile = user.userprofile
            
            code = profile.generate_verification_code()
            user_name = profile.pending_first_name or ""
            
            email_sent = send_verification_email(user.email, code, user_name)
            
            if not email_sent:
                print(f"\n{'='*50}\nVERIFICATION CODE: {code}\n{'='*50}\n")
            
            return JsonResponse({'success': True, 'message': 'Verification code resent successfully.'})
        except User.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'User not found.'})

class LogoutView(View):
    def get(self, request):
        # Store user_id before logout
        user_id = request.user.id if request.user.is_authenticated else None
        
        # Clear the session verification flag BEFORE logout
        if user_id:
            session_key = f'email_verified_{user_id}'
            if session_key in request.session:
                del request.session[session_key]
        
        # Logout
        logout(request)
        
        # Force session modification to save changes
        request.session.modified = True
        
        return redirect("accounts:login")

class PendingDashboardView(LoginRequiredMixin, TemplateView):
    template_name = "accounts/pending_dashboard.html"
    
    def dispatch(self, request, *args, **kwargs):
        response = super().dispatch(request, *args, **kwargs)
        
        if request.user.is_authenticated and hasattr(request.user, 'userprofile'):
            if request.user.userprofile.is_approved:
                # If AJAX request, return JSON
                if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return JsonResponse({
                        'approved': True,
                        'redirect_url': reverse_lazy('accounts:dashboard_redirect')
                    })
                return redirect('accounts:dashboard_redirect')
        
        # If AJAX and not approved, return status
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'approved': False})
        
        return response
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        profile = self.request.user.userprofile
        context['profile'] = profile
        return context

class NoAccessView(TemplateView):
    template_name = "accounts/no_access.html"

class StudentDashboardView(LoginRequiredMixin, RoleRequiredMixin, TemplateView):
    template_name = "accounts/student_dashboard.html"
    role = "shs_student"

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        profile = self.request.user.userprofile
        
        # ✅ OPTIMIZED: Prefetch related data
        ctx.update({
            "papers": profile.assigned_papers.prefetch_related('keywords', 'awards'),
            "authors": profile.author_profile.all()
        })
        return ctx

class TeacherDashboardView(LoginRequiredMixin, RoleRequiredMixin, TemplateView):
    template_name = "accounts/teacher_dashboard.html"
    role = "research_teacher"

class AdminDashboardView(LoginRequiredMixin, RoleRequiredMixin, TemplateView):
    template_name = "accounts/admin_dashboard.html"
    role = "admin"


class PendingAccountsView(LoginRequiredMixin, RoleRequiredMixin, ListView):
    template_name = "accounts/pending_requests.html"
    context_object_name = "users"
    role = "admin"
    paginate_by = 20  # ✅ ADD PAGINATION

    def get_queryset(self):
        # ✅ CRITICAL FIX: Use annotations instead of Python loops
        
        queryset = UserProfile.objects.filter(
            is_approved=False
        ).select_related('user').prefetch_related('author_profile').order_by('-id')
        
        # ✅ Annotate matching author counts in SQL, not Python
        queryset = queryset.annotate(
            has_matching_authors=Exists(
                Author.objects.filter(
                    first_name__iexact=OuterRef('pending_first_name'),
                    last_name__iexact=OuterRef('pending_last_name'),
                )
            )
        )
        
        return queryset
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # ✅ CRITICAL: Process ONLY the current page, not all profiles
        profiles_with_authors = []
        
        for profile in context['users']:  # Only processes paginated results
            first = profile.pending_first_name
            last = profile.pending_last_name
            middle = profile.pending_middle_initial or ""
            suffix = profile.pending_suffix or ""
            
            # Find matching authors efficiently
            matching_authors = Author.objects.filter(
                first_name__iexact=first.strip() if first else "",
                last_name__iexact=last.strip() if last else "",
            )
            
            if middle:
                matching_authors = matching_authors.filter(middle_initial__iexact=middle)
            else:
                matching_authors = matching_authors.filter(
                    Q(middle_initial__isnull=True) | Q(middle_initial="")
                )
            
            if suffix:
                matching_authors = matching_authors.filter(suffix__iexact=suffix)
            else:
                matching_authors = matching_authors.filter(
                    Q(suffix__isnull=True) | Q(suffix="")
                )
            
            # ✅ OPTIMIZED: Only get count and basic info
            profile.matching_authors = list(matching_authors.only(
                'id', 'first_name', 'last_name', 'middle_initial', 'suffix'
            ).annotate(paper_count=Count('researchpaper'))[:5])  # Limit to 5 matches
            
            profiles_with_authors.append(profile)
        
        context['users'] = profiles_with_authors
        return context

class ApproveUserEditView(LoginRequiredMixin, RoleRequiredMixin, View):
    role = "admin"
    def post(self, request, id):
        # ✅ OPTIMIZED: select_related to reduce queries
        profile = get_object_or_404(
            UserProfile.objects.select_related('user'),
            id=id
        )
        
        if profile.is_approved:
            messages.warning(request, "Already approved")
        else:
            user = profile.user
            first = request.POST.get('first_name', '').strip()
            last = request.POST.get('last_name', '').strip()
            middle = request.POST.get('middle_initial', '').strip()
            suffix = request.POST.get('suffix', '').strip()
            g11 = request.POST.get('g11_batch', '').strip()
            g12 = request.POST.get('g12_batch', '').strip()
            took_shs = request.POST.get('took_shs', 'false') == 'true'
            new_role = request.POST.get('role', user.role)
            
            user.role = new_role
            user.save()
            
            profile.pending_first_name = first
            profile.pending_last_name = last
            profile.pending_middle_initial = middle if middle else None
            profile.pending_suffix = suffix if suffix else None
            profile.pending_G11 = g11 if g11 else None
            profile.pending_G12 = g12 if g12 else None
            profile.took_shs = took_shs
            
            is_shs_student = new_role == "shs_student"
            is_shs_alumni = new_role == "alumni" and took_shs
            
            if is_shs_student or is_shs_alumni:
                middle_for_query = middle if middle else ""
                suffix_for_query = suffix if suffix else ""
                
                existing_author = Author.objects.filter(user=user).first()
                
                if existing_author:
                    existing_author.first_name = first
                    existing_author.last_name = last
                    existing_author.middle_initial = middle_for_query
                    existing_author.suffix = suffix_for_query
                    existing_author.G11_Batch = g11 if g11 else None
                    existing_author.G12_Batch = g12 if g12 else None
                    if user.birthdate:
                        existing_author.birthdate = user.birthdate
                    existing_author.save()
                    profile.author_profile.add(existing_author)
                else:
                    try:
                        author = Author.objects.get(
                            first_name=first,
                            last_name=last,
                            middle_initial=middle_for_query,
                            suffix=suffix_for_query,
                        )
                        created = False
                    except Author.DoesNotExist:
                        author = Author.objects.create(
                            first_name=first,
                            last_name=last,
                            middle_initial=middle_for_query,
                            suffix=suffix_for_query,
                            user=profile.user,
                            G11_Batch=g11 if g11 else None,
                            G12_Batch=g12 if g12 else None,
                            birthdate=user.birthdate if user.birthdate else None,
                        )
                        created = True
                    
                    if not created and author.user is None:
                        author.user = profile.user
                        author.G11_Batch = g11 if g11 else None
                        author.G12_Batch = g12 if g12 else None
                        if user.birthdate:
                            author.birthdate = user.birthdate
                        author.save()
                    
                    profile.author_profile.add(author)

            profile.is_approved = True
            profile.save()
            user_name = f"{first} {last}"
            send_approval_email(user.email, user_name, new_role)

            messages.success(request, f"{first} {last} has been approved as {user.get_role_display()}.")
        return redirect("accounts:pending_accounts")

class ApproveUserView(LoginRequiredMixin, RoleRequiredMixin, View):
    role = "admin"
    def post(self, request, id):
        # ✅ OPTIMIZED: select_related
        profile = get_object_or_404(
            UserProfile.objects.select_related('user'),
            id=id
        )
        
        if profile.is_approved:
            messages.warning(request, "Already approved")
        else:
            user = profile.user
            first = (profile.pending_first_name or "").strip()
            last = (profile.pending_last_name or "").strip()
            middle = (profile.pending_middle_initial or "").strip() or ""
            suffix = (profile.pending_suffix or "").strip() or ""
            is_shs_student = user.role == "shs_student"
            is_shs_alumni = user.role == "alumni" and profile.took_shs
            
            if is_shs_student or is_shs_alumni:
                existing_author = Author.objects.filter(user=user).first()
                
                if existing_author:
                    profile.author_profile.add(existing_author)
                else:
                    try:
                        author = Author.objects.get(
                            first_name=first,
                            last_name=last,
                            middle_initial=middle,
                            suffix=suffix,
                        )
                        created = False
                    except Author.DoesNotExist:
                        author = Author.objects.create(
                            first_name=first,
                            last_name=last,
                            middle_initial=middle,
                            suffix=suffix,
                            user=profile.user,
                            G11_Batch=profile.pending_G11,
                            G12_Batch=profile.pending_G12,
                            birthdate=user.birthdate if user.birthdate else None,
                        )
                        created = True
                    
                    if not created and author.user is None:
                        author.user = profile.user
                        author.G11_Batch = profile.pending_G11
                        author.G12_Batch = profile.pending_G12
                        if user.birthdate:
                            author.birthdate = user.birthdate
                        author.save()
                    
                    profile.author_profile.add(author)

            profile.is_approved = True
            profile.save()
            user_name = f"{first} {last}"
            send_approval_email(user.email, user_name, user.role)
            messages.success(request, f"{first} {last} has been approved.")
        return redirect("accounts:pending_accounts")

class DenyUserView(LoginRequiredMixin, RoleRequiredMixin, View):
    role = "admin"
    def post(self, request, id):
        profile = get_object_or_404(UserProfile, id=id)
        email = profile.user.email
        profile.user.delete()
        messages.info(request, f"Account {email} denied and removed")
        return redirect("accounts:pending_accounts")

class UpdateConsentView(LoginRequiredMixin, View):
    def post(self, request):
        profile = request.user.userprofile
        action = request.POST.get('action')
        if not request.user.birthdate:
            messages.error(request, "Your birthdate is not set. Please contact the administrator.")
            return redirect("accounts:student_dashboard")
        if action == 'consent':
            if request.user.age >= 18:
                if request.POST.get('agree_terms'):
                    profile.consent_status = 'consented'
                    profile.consent_date = timezone.now()
                    profile.save()
                    messages.success(request, "Consent granted! Your full name is now visible on research papers.")
                else:
                    messages.error(request, "You must agree to the terms and conditions.")
            else:
                messages.error(request, "You must be 18 or older to consent without parental approval.")
        elif action == 'upload':
            if request.user.age < 18:
                if not request.POST.get('agree_terms'):
                    messages.error(request, "You must agree to the terms and conditions.")
                    return redirect("accounts:student_dashboard")
                consent_file = request.FILES.get('parental_consent')
                if consent_file:
                    if consent_file.size > 10 * 1024 * 1024:
                        messages.error(request, "File size exceeds 10MB limit.")
                        return redirect("accounts:student_dashboard")
                    if not consent_file.name.endswith('.pdf'):
                        messages.error(request, "Only PDF files are allowed.")
                        return redirect("accounts:student_dashboard")
                    if profile.parental_consent_file:
                        profile.parental_consent_file.delete(save=False)
                    profile.parental_consent_file = consent_file
                    profile.consent_status = 'pending_approval'
                    profile.consent_date = None
                    profile.save()
                    messages.success(request, "Parental consent uploaded successfully! It will be reviewed by an administrator.")
                else:
                    messages.error(request, "Please select a PDF file to upload.")
            else:
                messages.error(request, "Parental consent is only required for users under 18.")
        elif action == 'revoke':
            profile.consent_status = 'not_consented'
            profile.consent_date = None
            profile.save()
            messages.info(request, "Consent revoked. Your name will now appear as initials only.")
        return redirect("accounts:student_dashboard")

class ApproveConsentView(LoginRequiredMixin, UserPassesTestMixin, View):
    def test_func(self):
        return self.request.user.role in ['research_teacher', 'nonresearch_teacher', 'admin']
    
    def handle_no_permission(self):
        messages.error(self.request, "You do not have access to this page.")
        return redirect("accounts:no_access")
    
    def post(self, request, id):
        profile = get_object_or_404(UserProfile, id=id)
        if profile.consent_status == 'pending_approval':
            profile.consent_status = 'consented'
            profile.consent_date = timezone.now()
            profile.save()
            messages.success(request, f"Parental consent for {profile.display_name} has been approved.")
        else:
            messages.warning(request, "This consent is not pending approval.")
        
        if request.user.role == 'admin':
            return redirect("accounts:pending_accounts")
        else:
            return redirect("accounts:consent_approvals")
        
class DenyConsentView(LoginRequiredMixin, UserPassesTestMixin, View):
    def test_func(self):
        return self.request.user.role in ['research_teacher', 'nonresearch_teacher', 'admin']
    
    def handle_no_permission(self):
        messages.error(self.request, "You do not have access to this page.")
        return redirect("accounts:no_access")
    
    def post(self, request, id):
        profile = get_object_or_404(UserProfile, id=id)
        if profile.consent_status == 'pending_approval':
            if profile.parental_consent_file:
                profile.parental_consent_file.delete(save=False)
                profile.parental_consent_file = None
            profile.consent_status = 'not_consented'
            profile.consent_date = None
            profile.save()
            messages.info(request, f"Parental consent for {profile.display_name} has been denied.")
        else:
            messages.warning(request, "This consent is not pending approval.")
        
        if request.user.role == 'admin':
            return redirect("accounts:pending_accounts")
        else:
            return redirect("accounts:consent_approvals")
    
class UserManagementView(LoginRequiredMixin, RoleRequiredMixin, ListView):
    template_name = "accounts/user_management.html"
    context_object_name = "profiles"
    role = "admin"
    paginate_by = 20

    def get_queryset(self):
        # ✅ OPTIMIZED: select_related and prefetch_related with limited fields
        queryset = UserProfile.objects.select_related('user').prefetch_related(
            Prefetch(
                'author_profile',
                queryset=Author.objects.only('id', 'first_name', 'last_name', 'user_id')
            )
        ).only(
            # ✅ Limit fields loaded from UserProfile
            'id', 'user', 'pending_first_name', 'pending_last_name', 
            'pending_middle_initial', 'pending_suffix', 'pending_G11', 'pending_G12',
            'is_approved', 'consent_status', 'took_shs'
        )
        
        # Search functionality
        search = self.request.GET.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(user__email__icontains=search) |
                Q(pending_first_name__icontains=search) |
                Q(pending_last_name__icontains=search)
            )
        
        # Filter by role
        role_filter = self.request.GET.get('role', '')
        if role_filter:
            queryset = queryset.filter(user__role=role_filter)
        
        # Filter by approval status
        approval_filter = self.request.GET.get('approval', '')
        if approval_filter == 'approved':
            queryset = queryset.filter(is_approved=True)
        elif approval_filter == 'pending':
            queryset = queryset.filter(is_approved=False)
        
        # Filter by consent status
        consent_filter = self.request.GET.get('consent', '')
        if consent_filter:
            queryset = queryset.filter(consent_status=consent_filter)
        
        # Filter by batch
        batch_filter = self.request.GET.get('batch', '')
        if batch_filter:
            queryset = queryset.filter(
                Q(pending_G11=batch_filter) | Q(pending_G12=batch_filter)
            )
        
        # Sorting
        sort_field = self.request.GET.get('sort', '-id')
        order = self.request.GET.get('order', 'desc')
        
        if sort_field and order:
            sort_mapping = {
                'id': 'id',
                'name': 'pending_last_name',
                'email': 'user__email',
                'role': 'user__role',
                'age': 'user__birthdate'
            }
            
            if sort_field in sort_mapping:
                order_prefix = '-' if order == 'desc' else ''
                queryset = queryset.order_by(f'{order_prefix}{sort_mapping[sort_field]}')
        else:
            queryset = queryset.order_by('-id')
        
        return queryset
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # ✅ CRITICAL: Use aggregate for counts instead of loading all profiles
        from django.db.models import Count
        
        # ✅ Get counts efficiently with a single query
        counts = UserProfile.objects.aggregate(
            total=Count('id'),
            approved=Count('id', filter=Q(is_approved=True)),
            pending=Count('id', filter=Q(is_approved=False)),
            active=Count('id', filter=Q(user__is_active=True))
        )
        
        context['total_count'] = counts['total']
        context['approved_count'] = counts['approved']
        context['pending_count'] = counts['pending']
        context['active_count'] = counts['active']
        
        # ✅ Get batches efficiently using distinct values only
        batches = set()
        
        # Use values_list to get only the batch fields
        g11_batches = UserProfile.objects.exclude(
            Q(pending_G11__isnull=True) | Q(pending_G11='')
        ).values_list('pending_G11', flat=True).distinct()
        
        g12_batches = UserProfile.objects.exclude(
            Q(pending_G12__isnull=True) | Q(pending_G12='')
        ).values_list('pending_G12', flat=True).distinct()
        
        # ✅ Force evaluation and combine
        batches.update(g11_batches)
        batches.update(g12_batches)
        
        context['batches'] = sorted(batches, reverse=True)
        
        context['role_choices'] = User.ROLE_CHOICES
        context['current_search'] = self.request.GET.get('search', '')
        context['current_role'] = self.request.GET.get('role', '')
        context['current_approval'] = self.request.GET.get('approval', '')
        context['current_consent'] = self.request.GET.get('consent', '')
        context['current_batch'] = self.request.GET.get('batch', '')
        context['current_sort'] = self.request.GET.get('sort', 'id')
        context['current_order'] = self.request.GET.get('order', 'desc')
        
        # ✅ Force evaluation of paginated profiles
        context['profiles'] = list(context['profiles'])
        
        return context
    
    def render_to_response(self, context, **response_kwargs):
        if self.request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            table_html = render_to_string('accounts/user_table_partial.html', context, request=self.request)
            
            return JsonResponse({
                'table_html': table_html
            })
        return super().render_to_response(context, **response_kwargs)
    
class EditUserView(LoginRequiredMixin, RoleRequiredMixin, View):
    role = "admin"
    
    def post(self, request, id):
        # ✅ OPTIMIZED: select_related
        profile = get_object_or_404(
            UserProfile.objects.select_related('user'),
            id=id
        )
        user = profile.user
        
        # Update user fields
        new_role = request.POST.get('role', user.role)
        
        # Handle birthday dropdowns
        birth_month = request.POST.get('birth_month', '').strip()
        birth_day = request.POST.get('birth_day', '').strip()
        birth_year = request.POST.get('birth_year', '').strip()
        
        is_active = request.POST.get('is_active') == 'on'
        is_staff = request.POST.get('is_staff') == 'on'
        
        user.role = new_role
        user.is_active = is_active
        user.is_staff = is_staff
        
        # Set birthdate
        if birth_month and birth_day and birth_year:
            try:
                from datetime import date
                user.birthdate = date(int(birth_year), int(birth_month), int(birth_day))
            except (ValueError, TypeError):
                messages.error(request, "Invalid birthdate provided.")
                return redirect("accounts:user_management")
        
        user.save()
        
        # Update profile fields
        first = request.POST.get('first_name', '').strip()
        last = request.POST.get('last_name', '').strip()
        middle = request.POST.get('middle_initial', '').strip()
        suffix = request.POST.get('suffix', '').strip()
        g11 = request.POST.get('g11_batch', '').strip()
        g12 = request.POST.get('g12_batch', '').strip()
        took_shs = request.POST.get('took_shs') == 'on'
        is_approved = request.POST.get('is_approved') == 'on'
        consent_status = request.POST.get('consent_status', profile.consent_status)
        
        profile.pending_first_name = first
        profile.pending_last_name = last
        profile.pending_middle_initial = middle if middle else None
        profile.pending_suffix = suffix if suffix else None
        profile.pending_G11 = g11 if g11 else None
        profile.pending_G12 = g12 if g12 else None
        profile.took_shs = took_shs
        profile.is_approved = is_approved
        profile.consent_status = consent_status
        
        profile.save()
        
        # Handle author profile
        is_shs_student = new_role == "shs_student"
        is_shs_alumni = new_role == "alumni" and took_shs
        
        if is_shs_student or is_shs_alumni:
            middle_for_query = middle if middle else ""
            suffix_for_query = suffix if suffix else ""
            
            existing_author = Author.objects.filter(user=user).first()
            
            if existing_author:
                existing_author.first_name = first
                existing_author.last_name = last
                existing_author.middle_initial = middle_for_query
                existing_author.suffix = suffix_for_query
                existing_author.G11_Batch = g11 if g11 else None
                existing_author.G12_Batch = g12 if g12 else None
                if user.birthdate:
                    existing_author.birthdate = user.birthdate
                existing_author.save()
                profile.author_profile.add(existing_author)
            else:
                try:
                    author = Author.objects.get(
                        first_name=first,
                        last_name=last,
                        middle_initial=middle_for_query,
                        suffix=suffix_for_query,
                    )
                except Author.DoesNotExist:
                    author = Author.objects.create(
                        first_name=first,
                        last_name=last,
                        middle_initial=middle_for_query,
                        suffix=suffix_for_query,
                        user=user,
                        G11_Batch=g11 if g11 else None,
                        G12_Batch=g12 if g12 else None,
                        birthdate=user.birthdate if user.birthdate else None,
                    )
                
                if author.user is None:
                    author.user = user
                    author.G11_Batch = g11 if g11 else None
                    author.G12_Batch = g12 if g12 else None
                    if user.birthdate:
                        author.birthdate = user.birthdate
                    author.save()
                
                profile.author_profile.add(author)
        
        messages.success(request, f"User {profile.display_name} updated successfully.")
        return redirect("accounts:user_management")

class DeleteUserView(LoginRequiredMixin, RoleRequiredMixin, View):
    role = "admin"
    
    def post(self, request, id):
        profile = get_object_or_404(UserProfile, id=id)
        email = profile.user.email
        display_name = profile.display_name
        
        if profile.user == request.user:
            messages.error(request, "You cannot delete your own account.")
            return redirect("accounts:user_management")
        
        profile.user.delete()
        messages.info(request, f"User {display_name} ({email}) has been deleted.")
        return redirect("accounts:user_management")

class ToggleUserActiveView(LoginRequiredMixin, RoleRequiredMixin, View):
    role = "admin"
    
    def post(self, request, id):
        profile = get_object_or_404(UserProfile, id=id)
        
        if profile.user == request.user:
            messages.error(request, "You cannot deactivate your own account.")
            return redirect("accounts:user_management")
        
        profile.user.is_active = not profile.user.is_active
        profile.user.save()
        
        status = "activated" if profile.user.is_active else "deactivated"
        messages.success(request, f"User {profile.display_name} has been {status}.")
        return redirect("accounts:user_management")
    
class GetUserModalView(LoginRequiredMixin, RoleRequiredMixin, View):
    role = "admin"
    
    def get(self, request, id):
        profile = get_object_or_404(
            UserProfile.objects.select_related('user'),
            id=id
        )
        
        context = {
            'profile': profile,
            'role_choices': User.ROLE_CHOICES
        }
        
        html = render_to_string('accounts/user_modal_single.html', context, request=request)
        return HttpResponse(html)
    
class AlreadyLoggedInView(LoginRequiredMixin, TemplateView):
    template_name = "accounts/already_logged_in.html"
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        profile = self.request.user.userprofile
        context['profile'] = profile
        return context

class ForgotPasswordView(TemplateView):
    template_name = "accounts/forgot_password.html"
    
    def get(self, request, *args, **kwargs):
        if not request.session.get('show_password_reset_modal'):
            for key in ['password_reset_email', 'password_reset_user_id', 'show_password_reset_modal', 'new_password_hash']:
                if key in request.session:
                    del request.session[key]
            request.session.modified = True
        return super().get(request, *args, **kwargs)
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['show_modal'] = self.request.session.get('show_password_reset_modal', False)
        context['reset_email'] = self.request.session.get('password_reset_email', '')
        return context
    
    def post(self, request, *args, **kwargs):
        email = request.POST.get('email', '').strip()
        new_password = request.POST.get('new_password', '').strip()
        confirm_password = request.POST.get('confirm_password', '').strip()
        
        # Validation
        if not email:
            messages.error(request, "Please enter your email address.")
            return self.get(request, *args, **kwargs)
        
        if not new_password or not confirm_password:
            messages.error(request, "Please enter and confirm your new password.")
            return self.get(request, *args, **kwargs)
        
        if new_password != confirm_password:
            messages.error(request, "Passwords do not match.")
            return self.get(request, *args, **kwargs)
        
        if len(new_password) < 8:
            messages.error(request, "Password must be at least 8 characters long.")
            return self.get(request, *args, **kwargs)
        
        try:
            # ✅ OPTIMIZED: select_related
            user = User.objects.select_related('userprofile').get(email=email)
            profile = user.userprofile
        except User.DoesNotExist:
            messages.error(request, "If this email is registered, a verification code will be sent.")
            return self.get(request, *args, **kwargs)
        
        # Check cooldown
        if profile.last_password_reset_request:
            time_since_last = now() - profile.last_password_reset_request
            if time_since_last < timedelta(hours=24):
                hours_remaining = 24 - (time_since_last.total_seconds() / 3600)
                messages.error(
                    request, 
                    f"You can only reset your password once every 24 hours. "
                    f"Please try again in {int(hours_remaining)} hours."
                )
                return self.get(request, *args, **kwargs)
        
        # Generate verification code
        code = profile.generate_verification_code()
        user_name = profile.pending_first_name or ""
        
        # Store in session
        request.session['password_reset_email'] = email
        request.session['password_reset_user_id'] = user.id
        request.session['new_password_hash'] = make_password(new_password)
        request.session['show_password_reset_modal'] = True
        request.session.modified = True
        
        # Send email
        email_sent = send_password_reset_email(email, code, user_name)
        
        if not email_sent:
            print(f"\n{'='*50}\nPASSWORD RESET CODE: {code}\n{'='*50}\n")
        
        # Update last request time
        profile.last_password_reset_request = now()
        profile.save()
        
        return self.render_to_response(self.get_context_data())

class VerifyPasswordResetView(View):
    def post(self, request):
        code = request.POST.get('code', '').strip()
        user_id = request.session.get('password_reset_user_id')
        new_password_hash = request.session.get('new_password_hash')
        
        if not user_id or not new_password_hash:
            return JsonResponse({
                'success': False, 
                'message': 'No password reset in progress.'
            })
        
        try:
            # ✅ OPTIMIZED: select_related
            user = User.objects.select_related('userprofile').get(id=user_id)
            profile = user.userprofile
            
            # Check lock
            if profile.verification_locked_until:
                if now() < profile.verification_locked_until:
                    time_remaining = profile.verification_locked_until - now()
                    hours = int(time_remaining.total_seconds() // 3600)
                    return JsonResponse({
                        'success': False,
                        'locked': True,
                        'message': f'Too many verification attempts. Account locked for {hours} more hours.'
                    })
                else:
                    profile.verification_attempts = 0
                    profile.verification_locked_until = None
                    profile.save()
            
            # Check attempts
            MAX_ATTEMPTS = 10
            if profile.verification_attempts >= MAX_ATTEMPTS:
                profile.verification_locked_until = now() + timedelta(hours=24)
                profile.save()
                return JsonResponse({
                    'success': False,
                    'locked': True,
                    'message': 'Too many verification attempts. Your account has been locked for 24 hours.'
                })
            
            profile.verification_attempts += 1
            profile.save()
            
            if profile.is_verification_code_valid(code):
                # Update password
                user.password = new_password_hash
                user.save()
                
                # Clear verification code and reset attempts
                profile.email_verification_code = None
                profile.verification_attempts = 0
                profile.verification_locked_until = None
                profile.save()
                
                # Clear session
                request.session.pop('password_reset_email', None)
                request.session.pop('password_reset_user_id', None)
                request.session.pop('show_password_reset_modal', None)
                request.session.pop('new_password_hash', None)
                
                return JsonResponse({
                    'success': True,
                    'message': 'Password reset successful! Redirecting to login...',
                    'redirect': str(reverse_lazy('accounts:login'))
                })
            else:
                attempts_remaining = MAX_ATTEMPTS - profile.verification_attempts
                return JsonResponse({
                    'success': False,
                    'locked': False,
                    'message': f'Invalid or expired verification code. {attempts_remaining} attempts remaining.'
                })
        except User.DoesNotExist:
            return JsonResponse({
                'success': False,
                'message': 'User not found.'
            })

class ResendPasswordResetCodeView(View):
    def post(self, request):
        user_id = request.session.get('password_reset_user_id')
        
        if not user_id:
            return JsonResponse({
                'success': False,
                'message': 'No password reset in progress.'
            })
        
        try:
            user = User.objects.select_related('userprofile').get(id=user_id)
            profile = user.userprofile
            
            code = profile.generate_verification_code()
            user_name = profile.pending_first_name or ""
            
            email_sent = send_password_reset_email(user.email, code, user_name)
            
            if not email_sent:
                print(f"\n{'='*50}\nPASSWORD RESET CODE: {code}\n{'='*50}\n")
            
            return JsonResponse({
                'success': True,
                'message': 'Verification code resent successfully.'
            })
        except User.DoesNotExist:
            return JsonResponse({
                'success': False,
                'message': 'User not found.'
            })
        
class ConsentApprovalsView(LoginRequiredMixin, UserPassesTestMixin, ListView):
    template_name = "accounts/consent_approvals.html"
    context_object_name = "pending_consents"
    
    def test_func(self):
        return self.request.user.role in ['research_teacher', 'nonresearch_teacher']
    
    def handle_no_permission(self):
        messages.error(self.request, "You do not have access to this page.")
        return redirect("accounts:no_access")
    
    def get_queryset(self):
        # ✅ OPTIMIZED: select_related
        return UserProfile.objects.filter(
            consent_status='pending_approval',
            parental_consent_file__isnull=False
        ).select_related('user').order_by('-id')