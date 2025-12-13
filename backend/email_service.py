"""
Email Service Module - Send confirmation emails via Gmail SMTP
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class EmailService:
    """Handle sending emails via Gmail SMTP"""
    
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.sender_email = os.getenv("SENDER_EMAIL")
        self.sender_password = os.getenv("SENDER_PASSWORD")
        self.app_name = os.getenv("APP_NAME", "AIClone")
        
    def is_configured(self) -> bool:
        """Check if email service is properly configured"""
        return bool(self.sender_email and self.sender_password)
    
    def send_registration_confirmation(self, user_email: str, username: str) -> bool:
        """
        Send registration confirmation email
        
        Args:
            user_email: User's email address
            username: User's username
            
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        if not self.is_configured():
            logger.warning("Email service not configured - skipping email send")
            return False
        
        try:
            subject = f"🎉 Chào mừng đến với {self.app_name}! - Xác nhận đăng ký"
            
            # Create HTML email body
            html_body = self._create_registration_email_html(username, user_email)
            
            # Send email
            self._send_smtp(user_email, subject, html_body)
            logger.info(f"Registration confirmation email sent to {user_email}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending registration email to {user_email}: {str(e)}")
            return False
    
    def send_password_reset(self, user_email: str, username: str, reset_link: str) -> bool:
        """
        Send password reset email
        
        Args:
            user_email: User's email address
            username: User's username
            reset_link: Password reset link
            
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        if not self.is_configured():
            logger.warning("Email service not configured - skipping email send")
            return False
        
        try:
            subject = f"{self.app_name} - Password Reset Request"
            html_body = self._create_password_reset_email_html(username, reset_link)
            self._send_smtp(user_email, subject, html_body)
            logger.info(f"Password reset email sent to {user_email}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending password reset email to {user_email}: {str(e)}")
            return False
    
    def send_admin_notification(self, admin_email: str, event: str, details: str) -> bool:
        """
        Send admin notification
        
        Args:
            admin_email: Admin's email address
            event: Event type (e.g., "new_user_registered")
            details: Event details
            
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        if not self.is_configured():
            logger.warning("Email service not configured - skipping email send")
            return False
        
        try:
            subject = f"[{self.app_name} Admin] {event}"
            html_body = self._create_admin_notification_html(event, details)
            self._send_smtp(admin_email, subject, html_body)
            logger.info(f"Admin notification sent to {admin_email}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending admin notification to {admin_email}: {str(e)}")
            return False
    
    def _send_smtp(self, recipient_email: str, subject: str, html_body: str):
        """
        Internal method to send email via SMTP
        
        Args:
            recipient_email: Recipient's email address
            subject: Email subject
            html_body: Email body in HTML format
        """
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.sender_email
            msg['To'] = recipient_email
            
            # Attach HTML content
            msg.attach(MIMEText(html_body, 'html'))
            
            # Send via SMTP
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.sender_email, self.sender_password)
                server.send_message(msg)
                
        except Exception as e:
            raise Exception(f"SMTP error: {str(e)}")
    
    def _create_registration_email_html(self, username: str, email: str) -> str:
        """Create HTML for registration confirmation email"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .header h1 {{ margin: 0; font-size: 28px; }}
                .content {{ background: white; padding: 30px; border-radius: 0 0 8px 8px; }}
                .content p {{ color: #333; line-height: 1.6; }}
                .highlight {{ color: #4ECDC4; font-weight: bold; }}
                .button {{ display: inline-block; background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
                .footer {{ text-align: center; color: #999; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Chào mừng bạn đến với {self.app_name}!</h1>
                </div>
                <div class="content">
                    <p>Xin chào <span class="highlight">{username}</span>,</p>
                    
                    <p>Cảm ơn bạn đã đăng ký tài khoản tại <span class="highlight">{self.app_name}</span>!</p>
                    
                    <p><strong>Thông tin tài khoản của bạn:</strong></p>
                    <ul>
                        <li><strong>Username:</strong> {username}</li>
                        <li><strong>Email:</strong> {email}</li>
                        <li><strong>Ngày đăng ký:</strong> {datetime.now().strftime('%d/%m/%Y %H:%M')}</li>
                    </ul>
                    
                    <p>Bạn đã có thể đăng nhập ngay bây giờ và bắt đầu sử dụng tất cả các tính năng của {self.app_name}.</p>
                    
                    <p><strong>Các tính năng chính:</strong></p>
                    <ul>
                        <li>💬 Chat với AI Clone được tùy chỉnh</li>
                        <li>🤖 Tạo và quản lý các AI Clone riêng</li>
                        <li>💾 Lưu lịch sử hội thoại</li>
                        <li>⚙️ Tùy chỉnh hồ sơ và cài đặt</li>
                    </ul>
                    
                    <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.</p>
                    
                    <p>Trân trọng,<br><strong>{self.app_name} Team</strong></p>
                </div>
                <div class="footer">
                    <p>Đây là email tự động từ hệ thống. Vui lòng không trả lời email này.</p>
                    <p>&copy; 2024 {self.app_name}. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _create_password_reset_email_html(self, username: str, reset_link: str) -> str:
        """Create HTML for password reset email"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #FF6B9D 0%, #c2185b 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: white; padding: 30px; border-radius: 0 0 8px 8px; }}
                .content p {{ color: #333; line-height: 1.6; }}
                .button {{ display: inline-block; background: linear-gradient(135deg, #FF6B9D 0%, #c2185b 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
                .footer {{ text-align: center; color: #999; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }}
                .warning {{ color: #FF6B9D; font-weight: bold; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Đặt lại mật khẩu</h1>
                </div>
                <div class="content">
                    <p>Xin chào {username},</p>
                    
                    <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
                    
                    <p><span class="warning">⚠️ Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này.</span></p>
                    
                    <p>Để đặt lại mật khẩu, vui lòng nhấp vào nút bên dưới:</p>
                    
                    <a href="{reset_link}" class="button">Đặt lại mật khẩu</a>
                    
                    <p><strong>Hoặc sao chép link này:</strong><br>{reset_link}</p>
                    
                    <p><strong>Link này sẽ hết hạn trong 24 giờ.</strong></p>
                    
                    <p>Trân trọng,<br><strong>{self.app_name} Team</strong></p>
                </div>
                <div class="footer">
                    <p>Đây là email tự động từ hệ thống. Vui lòng không trả lời email này.</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _create_admin_notification_html(self, event: str, details: str) -> str:
        """Create HTML for admin notification email"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: white; padding: 30px; border-radius: 0 0 8px 8px; }}
                .event-box {{ background: #f0f0f0; border-left: 4px solid #2196F3; padding: 15px; margin: 15px 0; }}
                .footer {{ text-align: center; color: #999; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔔 Admin Notification</h1>
                </div>
                <div class="content">
                    <p><strong>Event:</strong> {event}</p>
                    
                    <div class="event-box">
                        <p><strong>Details:</strong></p>
                        <p>{details}</p>
                    </div>
                    
                    <p><strong>Timestamp:</strong> {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}</p>
                    
                    <p>Vui lòng kiểm tra admin panel để biết thêm chi tiết.</p>
                </div>
                <div class="footer">
                    <p>Đây là email tự động từ hệ thống.</p>
                </div>
            </div>
        </body>
        </html>
        """

# Create singleton instance
email_service = EmailService()
