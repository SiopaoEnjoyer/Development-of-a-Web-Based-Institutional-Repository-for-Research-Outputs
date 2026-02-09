from django import forms
from .models import User, UserProfile
from datetime import date
from django_recaptcha.fields import ReCaptchaField
from django_recaptcha.widgets import ReCaptchaV2Checkbox

class RegistrationForm(forms.ModelForm):
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'minlength': '8',
            'maxlength': '20',
            'placeholder': '8-20 characters'
        }),
        min_length=8,
        max_length=20,
        required=True,
        label="Password"
    )
    confirm_password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'minlength': '8',
            'maxlength': '20',
            'placeholder': 'Re-enter password'
        }),
        min_length=8,
        max_length=20,
        required=True,
        label="Confirm Password"
    )

    role = forms.ChoiceField(
        choices=User.ROLE_CHOICES,
        required=True,
        label="Role"
    )

    first_name = forms.CharField(
        required=True,
        label="First Name",
        max_length=100
    )
    middle_initial = forms.CharField(
        required=False,
        max_length=1,
        label="Middle Initial"
    )
    last_name = forms.CharField(
        required=True,
        label="Last Name",
        max_length=100
    )
    suffix = forms.CharField(
        required=False,
        max_length=10,
        label="Suffix"
    )

    # Birthdate dropdown fields (not saved directly to model)
    birth_month = forms.IntegerField(
        required=True,
        min_value=1,
        max_value=12,
        label="Birth Month"
    )
    birth_day = forms.IntegerField(
        required=True,
        min_value=1,
        max_value=31,
        label="Birth Day"
    )
    birth_year = forms.IntegerField(
        required=True,
        label="Birth Year"
    )

    # Terms and conditions checkbox
    agree_terms = forms.BooleanField(
        required=True,
        label="I agree to the Terms and Conditions"
    )

    took_shs = forms.BooleanField(
        required=False,
        initial=True,
        label="I took SHS at BTCS"
    )
    g11 = forms.CharField(
        required=False,
        label="Grade 11 Batch Year",
        max_length=20
    )
    g12 = forms.CharField(
        required=False,
        label="Grade 12 Batch Year",
        max_length=20
    )

    captcha = ReCaptchaField(
        widget=ReCaptchaV2Checkbox(),
        label="Verify you're human"
    )

    class Meta:
        model = User
        fields = ["email"]  # Only include model fields here
        labels = {
            'email': 'Email Address'
        }
        widgets = {
            'email': forms.EmailInput(attrs={'required': True})
        }

    def clean_password(self):
        password = self.cleaned_data.get('password')
        if password and (len(password) < 8 or len(password) > 20):
            raise forms.ValidationError("Password must be between 8 and 20 characters.")
        return password
    
    def clean_confirm_password(self):
        confirm_password = self.cleaned_data.get('confirm_password')
        if confirm_password and (len(confirm_password) < 8 or len(confirm_password) > 20):
            raise forms.ValidationError("Password must be between 8 and 20 characters.")
        return confirm_password

    def clean_email(self):
        email = self.cleaned_data["email"]
        if User.objects.filter(email=email).exists():
            raise forms.ValidationError("An account with this email already exists.")
        return email
    
    def clean_first_name(self):
        first_name = self.cleaned_data.get('first_name', '').strip()
        if not first_name:
            raise forms.ValidationError("First name is required.")
        return first_name
    
    def clean_last_name(self):
        last_name = self.cleaned_data.get('last_name', '').strip()
        if not last_name:
            raise forms.ValidationError("Last name is required.")
        return last_name

    def clean(self):
        cleaned_data = super().clean()

        password = cleaned_data.get('password')
        confirm_password = cleaned_data.get('confirm_password')
        
        if password and confirm_password and password != confirm_password:
            raise forms.ValidationError("Passwords do not match. Please try again.")

        # Combine birthdate fields into a single date
        birth_month = cleaned_data.get('birth_month')
        birth_day = cleaned_data.get('birth_day')
        birth_year = cleaned_data.get('birth_year')
        
        # Check if birthdate fields are provided
        if not all([birth_month, birth_day, birth_year]):
            raise forms.ValidationError("Please provide your complete date of birth.")
        
        # Validate date construction
        try:
            birthdate = date(birth_year, birth_month, birth_day)
            cleaned_data['birthdate'] = birthdate
        except ValueError as e:
            raise forms.ValidationError(f"Invalid date. Please check your birth month ({birth_month}), day ({birth_day}), and year ({birth_year}).")
        
        # Validate age
        today = date.today()
        age = today.year - birthdate.year - ((today.month, today.day) < (birthdate.month, birthdate.day))
        
        if age < 13:
            raise forms.ValidationError("You must be at least 13 years old to register.")
        if age > 120:
            raise forms.ValidationError("Please enter a valid birthdate.")
        
        # Validate terms agreement
        agree_terms = cleaned_data.get('agree_terms')
        if not agree_terms:
            raise forms.ValidationError("You must agree to the Terms and Conditions to register.")
        
        # NEW: Validate batch years for SHS students and alumni who took SHS
        role = cleaned_data.get('role')
        took_shs = cleaned_data.get('took_shs', False)
        g11 = cleaned_data.get('g11', '').strip()
        g12 = cleaned_data.get('g12', '').strip()
        
        # Determine if batch years are required
        batch_required = (
            role == 'shs_student' or 
            (role == 'alumni' and took_shs)
        )
        
        if batch_required:
            # At least one batch year must be provided
            if not g11 and not g12:
                self.add_error('g11', 'At least one batch year (Grade 11 or Grade 12) is required.')
                self.add_error('g12', 'At least one batch year (Grade 11 or Grade 12) is required.')
            else:
                # Validate format for provided batch years
                import re
                batch_pattern = r'^\d{4}-\d{4}$'
                
                if g11 and not re.match(batch_pattern, g11):
                    self.add_error('g11', 'Grade 11 batch must be in format YYYY-YYYY (e.g., 2019-2020)')
                
                if g12 and not re.match(batch_pattern, g12):
                    self.add_error('g12', 'Grade 12 batch must be in format YYYY-YYYY (e.g., 2020-2021)')
                
                # Validate year logic (optional but recommended)
                if g11 and g12:
                    try:
                        g11_start = int(g11.split('-')[0])
                        g12_start = int(g12.split('-')[0])
                        
                        # G12 should be one year after G11
                        if g12_start != g11_start + 1:
                            self.add_error('g12', 'Grade 12 batch should be one year after Grade 11 batch')
                    except (ValueError, IndexError):
                        pass  # Already caught by pattern validation
        
        return cleaned_data

    def save(self, commit=True):
        # Create user instance
        user = User(
            email=self.cleaned_data["email"],
            role=self.cleaned_data["role"],
            birthdate=self.cleaned_data["birthdate"],
        )
        user.set_password(self.cleaned_data["password"])
        
        if commit:
            # Save the user first
            user.save()
            
            # Get or create profile (signal should create it)
            try:
                profile = UserProfile.objects.get(user=user)
            except UserProfile.DoesNotExist:
                profile = UserProfile.objects.create(user=user)
            
            # Update profile fields with cleaned data
            first_name = self.cleaned_data.get("first_name", "")
            last_name = self.cleaned_data.get("last_name", "")
            middle_initial = self.cleaned_data.get("middle_initial", "")
            suffix = self.cleaned_data.get("suffix", "")
            g11 = self.cleaned_data.get("g11", "")
            g12 = self.cleaned_data.get("g12", "")
            took_shs = self.cleaned_data.get("took_shs", False)
            
            profile.pending_first_name = first_name.strip() if first_name else ""
            profile.pending_middle_initial = middle_initial.strip() or None
            profile.pending_last_name = last_name.strip() if last_name else ""
            profile.pending_suffix = suffix.strip() or None
            profile.took_shs = took_shs
            profile.pending_G11 = g11.strip() or None
            profile.pending_G12 = g12.strip() or None
            profile.is_approved = False
            profile.consent_status = 'not_consented'
            
            # Save the updated profile
            profile.save()

        return user


class LoginForm(forms.Form):
    email = forms.EmailField(
        required=True,
        label="Email Address"
    )
    password = forms.CharField(
        widget=forms.PasswordInput,
        required=True,
        label="Password"
    )

class EmailVerificationForm(forms.Form):
    code = forms.CharField(
        max_length=6,
        min_length=6,
        required=True,
        label="Verification Code",
        widget=forms.TextInput(attrs={
            'placeholder': '000000',
            'class': 'form-control',
            'maxlength': '6',
            'pattern': '[0-9]{6}',
            'inputmode': 'numeric',
            'autocomplete': 'off'
        })
    )
    
    def clean_code(self):
        code = self.cleaned_data.get('code')
        if not code.isdigit():
            raise forms.ValidationError("Verification code must be 6 digits.")
        return code