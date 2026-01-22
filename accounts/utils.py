from django.core.mail import send_mail
from django.conf import settings
import threading
import logging
import resend

logger = logging.getLogger(__name__)

def send_email_async(subject, message, html_message, recipient_list):
    """Send email using Resend API"""
    def _send():
        try:
            resend.api_key = settings.RESEND_API_KEY
            
            params = {
                "from": settings.DEFAULT_FROM_EMAIL,
                "to": recipient_list,
                "subject": subject,
                "html": html_message,
                "reply_to": "btcsirepository@gmail.com",  # ← ADD THIS LINE - replies go to your Gmail
            }
            
            resend.Emails.send(params)
            logger.info(f"✅ Email sent successfully to {recipient_list}")
        except Exception as e:
            logger.error(f"❌ Error sending email to {recipient_list}: {e}", exc_info=True)
    
    thread = threading.Thread(target=_send)
    thread.daemon = False
    thread.start()

def send_verification_email(user_email, verification_code, user_name=""):
    """Send verification code email with improved design"""
    subject = 'Email Verification - BTCSI Research'
    
    message = f"""
Hello{' ' + user_name if user_name else ''},

Your verification code is: {verification_code}

This code will expire in 15 minutes.

If you didn't request this code, please ignore this email.

Best regards,
BTCSI Research Team
    """
    
    html_message = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700&display=swap" rel="stylesheet">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Montserrat', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="650" cellpadding="0" cellspacing="0" border="0" style="background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);">
                        
                        <!-- Header -->
                        <tr>
                            <td style="background: #015726; padding: 35px 40px; text-align: center; border-radius: 20px 20px 0 0;">
                                <h1 style="color: white; margin: 0 0 8px 0; font-size: 32px; font-weight: 700; font-family: 'Montserrat', Arial, sans-serif;">
                                    Email Verification
                                </h1>
                                <p style="color: rgba(255, 255, 255, 0.9); margin: 0; font-size: 16px; font-family: 'Montserrat', Arial, sans-serif;">
                                    BTCSI Research Repository
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                <p style="color: #333; font-size: 16px; margin: 0 0 15px 0; font-family: 'Montserrat', Arial, sans-serif;">
                                    Hello{' <strong>' + user_name + '</strong>' if user_name else ''},
                                </p>
                                
                                <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0; font-family: 'Montserrat', Arial, sans-serif;">
                                    Please use the verification code below to complete your registration or to login:
                                </p>
                                
                                <!-- Verification Code -->
                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 25px 0;">
                                    <tr>
                                        <td style="background: #f8f9fa; border: 3px solid #015726; border-radius: 12px; padding: 25px; text-align: center;">
                                            <p style="color: #666; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px 0; font-family: 'Montserrat', Arial, sans-serif;">
                                                Your Verification Code
                                            </p>
                                            <p style="font-size: 40px; font-weight: 700; letter-spacing: 10px; color: #015726; margin: 0; font-family: 'Courier New', monospace;">
                                                {verification_code}
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Warning -->
                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
                                    <tr>
                                        <td style="background: #fff9e6; border-left: 4px solid #ffc107; border-radius: 8px; padding: 15px;">
                                            <p style="margin: 0; color: #856404; font-size: 14px; font-family: 'Montserrat', Arial, sans-serif;">
                                                <strong>⏰ Important:</strong> This code will expire in <strong>15 minutes</strong>. Please complete your verification promptly.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Security Tips -->
                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
                                    <tr>
                                        <td style="background: #f8f9fa; border-radius: 8px; padding: 18px;">
                                            <p style="margin: 0 0 10px 0; color: #333; font-size: 14px; font-weight: 600; font-family: 'Montserrat', Arial, sans-serif;">
                                                🔒 Security Tips:
                                            </p>
                                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                                <tr>
                                                    <td style="padding: 3px 0;">
                                                        <p style="margin: 0; color: #666; font-size: 13px; font-family: 'Montserrat', Arial, sans-serif;">• Never share this code with anyone</p>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 3px 0;">
                                                        <p style="margin: 0; color: #666; font-size: 13px; font-family: 'Montserrat', Arial, sans-serif;">• BTCSI will never ask for your verification code</p>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 3px 0;">
                                                        <p style="margin: 0; color: #666; font-size: 13px; font-family: 'Montserrat', Arial, sans-serif;">• If you didn't request this, please ignore this email</p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background: #015726; padding: 25px 40px; text-align: center; border-radius: 0 0 20px 20px;">
                                <p style="color: white; font-size: 14px; margin: 0 0 8px 0; font-family: 'Montserrat', Arial, sans-serif;">
                                    Best regards,<br>
                                    <strong>BTCSI Research Team</strong>
                                </p>
                                <p style="color: rgba(255, 255, 255, 0.8); font-size: 12px; margin: 0 0 8px 0; font-family: 'Montserrat', Arial, sans-serif;">
                                    Trinity Christian School<br>
                                    Villa Angela Subd., Phase 3, Bacolod City<br>
                                    © 2024-2025 All rights reserved
                                </p>
                                <p style="color: rgba(255, 255, 255, 0.7); font-size: 11px; margin: 8px 0 0 0; font-style: italic; font-family: 'Montserrat', Arial, sans-serif;">
                                    This is a system-generated email. Please do not reply.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    # Send email asynchronously - returns immediately
    send_email_async(subject, message, html_message, [user_email])
    
    # Always return True since we're sending async
    # Email failures will be logged but won't block the user
    return True


def send_password_reset_email(user_email, verification_code, user_name=""):
    """Send password reset verification code email with improved design"""
    subject = 'Password Reset Verification - BTCSI Research'
    
    message = f"""
Hello{' ' + user_name if user_name else ''},

You requested to reset your password. Your verification code is: {verification_code}

This code will expire in 15 minutes.

If you didn't request a password reset, please ignore this email and your password will remain unchanged.

For security reasons, you can only reset your password once every 24 hours.

Best regards,
BTCSI Research Team
    """
    
    html_message = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700&display=swap" rel="stylesheet">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Montserrat', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="650" cellpadding="0" cellspacing="0" border="0" style="background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);">
                        
                        <!-- Header -->
                        <tr>
                            <td style="background: #dc3545; padding: 35px 40px; text-align: center; border-radius: 20px 20px 0 0;">
                                <div style="font-size: 40px; margin-bottom: 10px;">🔐</div>
                                <h1 style="color: white; margin: 0 0 8px 0; font-size: 32px; font-weight: 700; font-family: 'Montserrat', Arial, sans-serif;">
                                    Password Reset
                                </h1>
                                <p style="color: rgba(255, 255, 255, 0.9); margin: 0; font-size: 16px; font-family: 'Montserrat', Arial, sans-serif;">
                                    BTCSI Research Repository
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                <p style="color: #333; font-size: 16px; margin: 0 0 15px 0; font-family: 'Montserrat', Arial, sans-serif;">
                                    Hello{' <strong>' + user_name + '</strong>' if user_name else ''},
                                </p>
                                
                                <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0; font-family: 'Montserrat', Arial, sans-serif;">
                                    We received a request to reset your password. Please use the verification code below to proceed:
                                </p>
                                
                                <!-- Verification Code -->
                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 25px 0;">
                                    <tr>
                                        <td style="background: #f8f9fa; border: 3px solid #dc3545; border-radius: 12px; padding: 25px; text-align: center;">
                                            <p style="color: #666; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px 0; font-family: 'Montserrat', Arial, sans-serif;">
                                                Your Verification Code
                                            </p>
                                            <p style="font-size: 40px; font-weight: 700; letter-spacing: 10px; color: #dc3545; margin: 0; font-family: 'Courier New', monospace;">
                                                {verification_code}
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Warning -->
                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
                                    <tr>
                                        <td style="background: #fff9e6; border-left: 4px solid #ffc107; border-radius: 8px; padding: 15px;">
                                            <p style="margin: 0; color: #856404; font-size: 14px; font-family: 'Montserrat', Arial, sans-serif;">
                                                <strong>⏰ Time Sensitive:</strong> This code will expire in <strong>15 minutes</strong>. Complete your password reset soon.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Security Notice -->
                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
                                    <tr>
                                        <td style="background: #ffe6e6; border-left: 4px solid #dc3545; border-radius: 8px; padding: 15px;">
                                            <p style="margin: 0 0 10px 0; color: #721c24; font-size: 14px; font-weight: 600; font-family: 'Montserrat', Arial, sans-serif;">
                                                🔒 Security Notice
                                            </p>
                                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                                <tr>
                                                    <td style="padding: 3px 0;">
                                                        <p style="margin: 0; color: #721c24; font-size: 13px; font-family: 'Montserrat', Arial, sans-serif;">• <strong>Didn't request this?</strong> Ignore this email - your password remains secure</p>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 3px 0;">
                                                        <p style="margin: 0; color: #721c24; font-size: 13px; font-family: 'Montserrat', Arial, sans-serif;">• <strong>Rate limit:</strong> You can only reset your password once every 24 hours</p>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 3px 0;">
                                                        <p style="margin: 0; color: #721c24; font-size: 13px; font-family: 'Montserrat', Arial, sans-serif;">• <strong>Never share:</strong> Keep this code confidential at all times</p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background: #015726; padding: 25px 40px; text-align: center; border-radius: 0 0 20px 20px;">
                                <p style="color: white; font-size: 14px; margin: 0 0 8px 0; font-family: 'Montserrat', Arial, sans-serif;">
                                    Best regards,<br>
                                    <strong>BTCSI Research Team</strong>
                                </p>
                                <p style="color: rgba(255, 255, 255, 0.8); font-size: 12px; margin: 0; font-family: 'Montserrat', Arial, sans-serif;">
                                    Trinity Christian School<br>
                                    Villa Angela Subd., Phase 3, Bacolod City<br>
                                    © 2024-2025 All rights reserved
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    # Send email asynchronously - returns immediately
    send_email_async(subject, message, html_message, [user_email])
    
    # Always return True since we're sending async
    return True


def send_approval_email(user_email, user_name="", role="", login_url=""):
    """Send account approval notification email"""
    from django.urls import reverse
    from django.conf import settings
    
    subject = 'Account Approved - BTCSI Research'
    
    # Get friendly role name
    role_display = {
        'shs_student': 'SHS Student',
        'alumni': 'Alumni',
        'research_teacher': 'Research Teacher',
        'nonresearch_teacher': 'Non-Research Teacher',
        'admin': 'Administrator'
    }.get(role, role)
    
    # Build full login URL for development
    # In production, you'd use your actual domain
    if not login_url:
        try:
            # This will work if you have a 'accounts:login' URL pattern
            login_url = reverse('accounts:login')
            # For development: http://127.0.0.1:8000/accounts/login
            # You can add domain from settings if needed
            if hasattr(settings, 'SITE_URL'):
                login_url = settings.SITE_URL.rstrip('/') + login_url
        except:
            login_url = "/accounts/login/"  # Fallback
    
    message = f"""
Hello{' ' + user_name if user_name else ''},

Great news! Your account has been approved by an administrator.

Role: {role_display}

You can now log in and access the BTCSI Research Repository system.

Visit: {login_url}

Best regards,
BTCSI Research Team
    """
    
    html_message = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
            @media only screen and (max-width: 600px) {{
                .email-container {{
                    width: 100% !important;
                    max-width: 100% !important;
                }}
                .content-padding {{
                    padding: 20px !important;
                }}
                .header-padding {{
                    padding: 25px 20px !important;
                }}
                .footer-padding {{
                    padding: 20px !important;
                }}
                .emoji {{
                    font-size: 40px !important;
                }}
                .title {{
                    font-size: 24px !important;
                }}
                .subtitle {{
                    font-size: 14px !important;
                }}
                .button {{
                    padding: 12px 30px !important;
                    font-size: 14px !important;
                }}
                .info-box {{
                    padding: 15px !important;
                }}
                .text-responsive {{
                    font-size: 14px !important;
                }}
                .small-text {{
                    font-size: 12px !important;
                }}
            }}
        </style>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Montserrat', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table class="email-container" width="650" cellpadding="0" cellspacing="0" border="0" style="background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); max-width: 650px;">
                        
                        <!-- Header -->
                        <tr>
                            <td class="header-padding" style="background: #28a745; padding: 35px 40px; text-align: center; border-radius: 20px 20px 0 0;">
                                <div class="emoji" style="font-size: 50px; margin-bottom: 10px;">✅</div>
                                <h1 class="title" style="color: white; margin: 0 0 8px 0; font-size: 32px; font-weight: 700; font-family: 'Montserrat', Arial, sans-serif;">
                                    Account Approved!
                                </h1>
                                <p class="subtitle" style="color: rgba(255, 255, 255, 0.9); margin: 0; font-size: 16px; font-family: 'Montserrat', Arial, sans-serif;">
                                    BTCSI Research Repository
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td class="content-padding" style="padding: 40px;">
                                <p class="text-responsive" style="color: #333; font-size: 16px; margin: 0 0 15px 0; font-family: 'Montserrat', Arial, sans-serif;">
                                    Hello{' <strong>' + user_name + '</strong>' if user_name else ''},
                                </p>
                                
                                <p class="text-responsive" style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0; font-family: 'Montserrat', Arial, sans-serif;">
                                    Great news! Your account has been <strong>approved</strong> by an administrator. You now have full access to the BTCSI Research Repository system.
                                </p>
                                
                                <!-- Account Info -->
                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 25px 0;">
                                    <tr>
                                        <td class="info-box" style="background: #f8f9fa; border: 3px solid #28a745; border-radius: 12px; padding: 25px;">
                                            <p class="small-text" style="color: #666; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 15px 0; font-family: 'Montserrat', Arial, sans-serif; text-align: center;">
                                                Account Details
                                            </p>
                                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                                <tr>
                                                    <td style="padding: 8px 0;">
                                                        <p class="text-responsive" style="margin: 0; color: #666; font-size: 14px; font-family: 'Montserrat', Arial, sans-serif; word-break: break-word;">
                                                            <strong style="color: #333;">Email:</strong> {user_email}
                                                        </p>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0;">
                                                        <p class="text-responsive" style="margin: 0; color: #666; font-size: 14px; font-family: 'Montserrat', Arial, sans-serif;">
                                                            <strong style="color: #333;">Role:</strong> {role_display}
                                                        </p>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0;">
                                                        <p class="text-responsive" style="margin: 0; color: #666; font-size: 14px; font-family: 'Montserrat', Arial, sans-serif;">
                                                            <strong style="color: #333;">Status:</strong> <span style="color: #28a745; font-weight: 600;">✓ Approved</span>
                                                        </p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Next Steps -->
                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
                                    <tr>
                                        <td class="info-box" style="background: #e7f7ef; border-left: 4px solid #28a745; border-radius: 8px; padding: 18px;">
                                            <p class="text-responsive" style="margin: 0 0 12px 0; color: #155724; font-size: 14px; font-weight: 600; font-family: 'Montserrat', Arial, sans-serif;">
                                                📋 Next Steps:
                                            </p>
                                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                                <tr>
                                                    <td style="padding: 3px 0;">
                                                        <p class="small-text" style="margin: 0; color: #155724; font-size: 13px; font-family: 'Montserrat', Arial, sans-serif;">• Log in to your account using your registered email</p>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 3px 0;">
                                                        <p class="small-text" style="margin: 0; color: #155724; font-size: 13px; font-family: 'Montserrat', Arial, sans-serif;">• Explore the research repository and available resources</p>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 3px 0;">
                                                        <p class="small-text" style="margin: 0; color: #155724; font-size: 13px; font-family: 'Montserrat', Arial, sans-serif;">• Complete your profile if additional information is required</p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Login Button -->
                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0;">
                                    <tr>
                                        <td align="center">
                                            <a href="{login_url}" class="button" style="display: inline-block; background: #28a745; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; font-family: 'Montserrat', Arial, sans-serif;">
                                                Log In Now
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Support -->
                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
                                    <tr>
                                        <td style="background: #f8f9fa; border-radius: 8px; padding: 15px; text-align: center;">
                                            <p class="small-text" style="margin: 0; color: #666; font-size: 13px; font-family: 'Montserrat', Arial, sans-serif;">
                                                Need help? Contact us or visit our help center for assistance.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background: #015726; padding: 25px 40px; text-align: center; border-radius: 0 0 20px 20px;">
                                <p style="color: white; font-size: 14px; margin: 0 0 8px 0; font-family: 'Montserrat', Arial, sans-serif;">
                                    Best regards,<br>
                                    <strong>BTCSI Research Team</strong>
                                </p>
                                <p style="color: rgba(255, 255, 255, 0.8); font-size: 12px; margin: 0 0 8px 0; font-family: 'Montserrat', Arial, sans-serif;">
                                    Trinity Christian School<br>
                                    Villa Angela Subd., Phase 3, Bacolod City<br>
                                    © 2024-2025 All rights reserved
                                </p>
                                <p style="color: rgba(255, 255, 255, 0.7); font-size: 11px; margin: 8px 0 0 0; font-style: italic; font-family: 'Montserrat', Arial, sans-serif;">
                                    This is a system-generated email. Please do not reply.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """