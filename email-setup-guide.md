# Email Configuration for Development
# Add these to your .env file to enable email sending

# Gmail SMTP Configuration (for development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@bookease.com

# Alternative: Use a test email service like Ethereal
# Get credentials from https://ethereal.email/create
# SMTP_HOST=smtp.ethereal.email
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=your-ethereal-email@ethereal.email
# SMTP_PASS=your-ethereal-password
# FROM_EMAIL=noreply@bookease.com
