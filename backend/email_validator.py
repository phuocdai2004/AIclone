"""
Email Validator - Verify email addresses are valid and can receive emails
"""
import re
import dns.resolver
import logging
from typing import Tuple

logger = logging.getLogger(__name__)

class EmailValidator:
    """Validate email addresses"""
    
    # Valid email providers (can add more as needed)
    ALLOWED_DOMAINS = {
        'gmail.com',
        'googlemail.com',
        'yahoo.com',
        'outlook.com',
        'hotmail.com',
        'icloud.com',
        'mail.com',
        'protonmail.com',
        'zoho.com',
        'aol.com',
        'donga.edu.vn',  # University email
        'hust.edu.vn',
        'vnu.edu.vn',
        'fpt.edu.vn',
    }
    
    @staticmethod
    def validate_format(email: str) -> Tuple[bool, str]:
        """
        Validate email format
        
        Returns:
            Tuple[bool, str]: (is_valid, error_message)
        """
        # Basic regex pattern
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        
        if not email:
            return False, "Email is required"
        
        if not re.match(pattern, email):
            return False, "Invalid email format"
        
        if len(email) > 254:
            return False, "Email is too long (max 254 characters)"
        
        local_part = email.split('@')[0]
        if len(local_part) > 64:
            return False, "Email local part is too long (max 64 characters)"
        
        return True, ""
    
    @staticmethod
    def validate_domain(email: str) -> Tuple[bool, str]:
        """
        Validate email domain has MX records (can receive emails)
        
        Returns:
            Tuple[bool, str]: (is_valid, error_message)
        """
        try:
            domain = email.split('@')[1].lower()
            
            # Check if domain has MX records
            mx_records = dns.resolver.resolve(domain, 'MX')
            
            if not mx_records:
                return False, f"Domain '{domain}' has no mail servers"
            
            logger.info(f"Email domain '{domain}' validated successfully")
            return True, ""
            
        except dns.resolver.NXDOMAIN:
            return False, f"Domain '{domain}' does not exist"
        except dns.resolver.NoAnswer:
            return False, f"Domain '{domain}' has no MX records"
        except dns.exception.Timeout:
            return False, f"Domain '{domain}' lookup timed out"
        except Exception as e:
            logger.warning(f"Error validating domain: {str(e)}")
            # Allow if DNS check fails (firewall/network issue)
            return True, ""
    
    @staticmethod
    def is_gmail(email: str) -> bool:
        """
        Check if email is from Gmail
        
        Returns:
            bool: True if email is Gmail
        """
        domain = email.split('@')[1].lower()
        return domain in ('gmail.com', 'googlemail.com')
    
    @staticmethod
    def validate_email(email: str, check_mx: bool = True, require_gmail: bool = False) -> Tuple[bool, str]:
        """
        Complete email validation
        
        Args:
            email: Email address to validate
            check_mx: Whether to check MX records (requires internet)
            require_gmail: Whether email must be from Gmail
            
        Returns:
            Tuple[bool, str]: (is_valid, error_message)
        """
        # Step 1: Format validation
        is_valid, error = EmailValidator.validate_format(email)
        if not is_valid:
            return False, error
        
        email = email.lower().strip()
        
        # Step 2: Check if Gmail is required
        if require_gmail and not EmailValidator.is_gmail(email):
            domain = email.split('@')[1]
            return False, f"Only Gmail accounts are allowed (received: {domain})"
        
        # Step 3: MX record validation
        if check_mx:
            is_valid, error = EmailValidator.validate_domain(email)
            if not is_valid:
                return False, error
        
        return True, ""


# Create singleton instance
email_validator = EmailValidator()
