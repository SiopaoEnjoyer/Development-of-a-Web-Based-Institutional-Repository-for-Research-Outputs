from django.conf import settings
import threading
import logging
import requests

logger = logging.getLogger(__name__)

def send_email_async(subject, message, html_message, recipient_list):
    """Send email using Elastic Email API"""
    def _send():
        try:
            url = "https://api.elasticemail.com/v2/email/send"
            
            data = {
                'apikey': settings.ELASTIC_EMAIL_API_KEY,
                'from': settings.DEFAULT_FROM_EMAIL,
                'to': ';'.join(recipient_list),  # Join multiple recipients with semicolon
                'subject': subject,
                'bodyHtml': html_message,
                'bodyText': message,
                'replyTo': 'btcsirepository@gmail.com'
            }
            
            response = requests.post(url, data=data)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    logger.info(f"✅ Email sent successfully to {recipient_list} (TransactionID: {result.get('data', {}).get('transactionid', 'N/A')})")
                else:
                    logger.error(f"❌ Email API returned error: {result.get('error')}")
            else:
                logger.error(f"❌ Email send failed with status {response.status_code}: {response.text}")
                
        except Exception as e:
            logger.error(f"❌ Error sending email to {recipient_list}: {e}", exc_info=True)
    
    thread = threading.Thread(target=_send)
    thread.daemon = False
    thread.start()

# Keep all your existing email functions unchanged
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
    
    send_email_async(subject, message, html_message, [user_email])
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
    
    send_email_async(subject, message, html_message, [user_email])
    return True


def send_approval_email(user_email, user_name="", role="", login_url=""):
    """Send account approval notification email"""
    from django.urls import reverse
    from django.conf import settings
    
    subject = 'Account Approved - BTCSI Research'
    
    role_display = {
        'shs_student': 'SHS Student',
        'alumni': 'Alumni',
        'research_teacher': 'Research Teacher',
        'nonresearch_teacher': 'Non-Research Teacher',
        'admin': 'Administrator'
    }.get(role, role)
    
    if not login_url:
        try:
            login_url = reverse('accounts:login')
            if hasattr(settings, 'SITE_URL'):
                login_url = settings.SITE_URL.rstrip('/') + login_url
        except:
            login_url = "/accounts/login/"
    
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
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="650" cellpadding="0" cellspacing="0" border="0" style="background: white; border-radius: 12px; overflow: hidden;">
                        <tr>
                            <td style="background: #28a745; padding: 30px; text-align: center;">
                                <h1 style="color: white; margin: 0;">✅ Account Approved</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 30px;">
                                <p>Hello <strong>{user_name}</strong>,</p>
                                <p>Great news! Your account has been approved.</p>
                                <p><strong>Role:</strong> {role_display}</p>
                                <p>You can now log in at: <a href="{login_url}">{login_url}</a></p>
                            </td>
                        </tr>
                        <tr>
                            <td style="background: #015726; padding: 20px; text-align: center;">
                                <p style="color: white; margin: 0;">BTCSI Research Team</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    send_email_async(subject, message, html_message, [user_email])
    return True