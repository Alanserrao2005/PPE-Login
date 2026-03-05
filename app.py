import os
import random
import smtplib
from email.message import EmailMessage
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, '.env'))

app = Flask(__name__)
# Enable CORS for the local frontend development
CORS(app, resources={r"/api/*": {"origins": "*"}})

# In-memory generic store for simplicity. 
# Production should use Redis or a Database with expiry timers.
otp_store = {}

def send_email(to_email, subject, body):
    my_email = os.getenv("EMAIL_HOST_USER")
    my_password = os.getenv("EMAIL_HOST_PASSWORD")
    port = int(os.getenv("EMAIL_PORT", 465))
    server = os.getenv("EMAIL_SERVER", "smtp.gmail.com")

    if not my_email or not my_password:
        print("Warning: Email credentials not configured in .env")
        return False

    try:
        msg = EmailMessage()
        msg.set_content(body)
        msg['Subject'] = subject
        msg['From'] = my_email
        msg['To'] = to_email

        # Using SSL
        with smtplib.SMTP_SSL(server, port) as smtp:
            smtp.login(my_email, my_password)
            smtp.send_message(msg)
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False

@app.route('/api/send-otp', methods=['POST'])
def generate_and_send_otp():
    data = request.json
    email = data.get('email')

    if not email:
        return jsonify({"error": "Email is required"}), 400

    # Generate 6 digit OTP
    otp = str(random.randint(100000, 999999))
    
    # Store OTP
    otp_store[email] = otp

    # Send OTP Email
    subject = "Your Verification Code"
    body = f"Welcome! Your verification code is: {otp}\n\nPlease enter this code to complete your signup."
    
    success = send_email(email, subject, body)
    
    # NOTE: Even if email fails (like when testing locally without real creds),
    # we simulate success so the UI flow can be tested. 
    # The OTP will be printed to the console for testing purposes.
    print(f"--- TEST OTP for {email}: {otp} ---")
    
    if success:
        return jsonify({"message": "OTP sent successfully"}), 200
    else:
        # Email failed to send, return error
        return jsonify({
            "error": "Failed to send OTP email. Please check server logs."
        }), 500

@app.route('/api/verify-otp', methods=['POST'])
def verify_otp():
    data = request.json
    email = data.get('email')
    user_otp = data.get('otp')
    password = data.get('password') # The password the user entered during signup

    if not email or not user_otp:
        return jsonify({"error": "Email and OTP are required"}), 400

    expected_otp = otp_store.get(email)

    if expected_otp and expected_otp == user_otp:
        # Once verified, remove from store
        otp_store.pop(email, None)
        
        # Save their signup password to the dummy database
        if password:
            user_passwords[email] = password
            
        return jsonify({"message": "Email verified successfully"}), 200
    else:
        return jsonify({"error": "Invalid or expired OTP"}), 400

# Dummy store for passwords to simulate the "old password" check
user_passwords = {}

# Replace this string with your real Google Client ID from the Google Developer Console
GOOGLE_CLIENT_ID = "895285838361-g5us8j145ves5cmpdlke879nb7oj089f.apps.googleusercontent.com"

@app.route('/api/google-auth', methods=['POST'])
def google_auth():
    data = request.json
    token = data.get('token')
    action = data.get('action') # 'login' or 'signup'

    if not token:
        return jsonify({"error": "No token provided"}), 400

    try:
        # Verify the token with Google
        # Note: In production you MUST verify the CLIENT_ID matches yours
        idinfo = id_token.verify_oauth2_token(
            token, 
            google_requests.Request(), 
            GOOGLE_CLIENT_ID
        )

        # Token is valid. Get user info from Google payload.
        email = idinfo.get('email')
        name = idinfo.get('name')
        
        if not email:
            return jsonify({"error": "Could not retrieve email from Google"}), 400

        # Simulate login or signup
        if action == 'signup':
            # In a real app, you would create the user in the database here if they don't exist
            # For this mock, we'll give them a default dummy password so the forgot password check works
            if email not in user_passwords:
                user_passwords[email] = "google-oauth-dummy-pass"
            message = "Google Sign-Up successful"
        else:
            # Login action
            if email not in user_passwords:
                # First time logging in with Google, treat as signup
                user_passwords[email] = "google-oauth-dummy-pass"
            message = "Google Sign-In successful"

        return jsonify({
            "message": message,
            "user": {
                "identifier": email,
                "name": name,
                "auth_provider": "google"
            }
        }), 200

    except ValueError as e:
        # Invalid token
        print(f"Google token verification failed: {e}")
        return jsonify({"error": "Invalid Google token"}), 401
    except Exception as e:
        print(f"Error during Google auth: {e}")
        return jsonify({"error": "Authentication failed"}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    identifier = data.get('identifier')
    password = data.get('password')

    if not identifier or not password:
        return jsonify({"error": "Identifier and password are required"}), 400

    if len(password) < 6:
        return jsonify({"error": "Invalid credentials"}), 401

    # Save the login password to our mock store so the "forgot password" flow knows what the "old" password is.
    # In a real app this would be in a database.
    user_passwords[identifier] = password

    # In a real app, verify against database here
    # For now, simulate a successful login
    return jsonify({
        "message": "Login successful",
        "user": {
            "identifier": identifier
        }
    }), 200

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json
    email = data.get('email')

    if not email:
        return jsonify({"error": "Email is required"}), 400

    # For the sake of the demo, if the user doesn't have a password set, default to 'password'
    if email not in user_passwords:
        user_passwords[email] = "password"

    # Generate 6 digit OTP
    otp = str(random.randint(100000, 999999))
    otp_store[email] = otp

    # Send OTP Email
    subject = "Password Reset Verification Code"
    body = f"Your verification code to reset your password is: {otp}\n\nPlease enter this code to proceed."
    
    success = send_email(email, subject, body)
    print(f"--- TEST RESET OTP for {email}: {otp} ---", flush=True)
    
    if success:
        return jsonify({"message": "OTP sent successfully"}), 200
    else:
        return jsonify({"error": "Failed to send OTP email."}), 500

@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    data = request.json
    email = data.get('email')
    user_otp = data.get('otp')
    new_password = data.get('new_password')

    if not email or not user_otp or not new_password:
        return jsonify({"error": "Email, OTP, and new password are required"}), 400

    expected_otp = otp_store.get(email)
    if not expected_otp or expected_otp != user_otp:
        return jsonify({"error": "Invalid or expired OTP"}), 400

    old_password = user_passwords.get(email, "password")
    
    if new_password == old_password:
        return jsonify({"error": "You cannot reuse your old password."}), 400

    if len(new_password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    # Update password in our dummy store
    user_passwords[email] = new_password
    otp_store.pop(email, None) # Clear OTP after success

    return jsonify({"message": "Password reset successfully"}), 200
if __name__ == '__main__':
    print("Starting Auth Server on port 5000...")
    app.run(host='0.0.0.0', debug=True, port=5000)
