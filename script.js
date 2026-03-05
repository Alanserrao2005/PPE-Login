document.addEventListener('DOMContentLoaded', () => {
    // --- Google Auth Initialization ---
    // IMPORTANT: Replace 'YOUR_GOOGLE_CLIENT_ID' with your actual Google OAuth 2.0 Client ID
    const GOOGLE_CLIENT_ID = '895285838361-g5us8j145ves5cmpdlke879nb7oj089f.apps.googleusercontent.com';
    const googleLoginBtnContainer = document.getElementById('googleLoginBtn');

    if (googleLoginBtnContainer) {
        if (GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') {
            // Render a dummy button if the Client ID isn't set yet so the UI still looks complete
            googleLoginBtnContainer.innerHTML = `
                <button type="button" class="submit-btn" style="background: white; color: #3c4043; box-shadow: 0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15); border-radius: 20px; padding: 10px 24px; font-weight: 500; font-family: 'Roboto', sans-serif; height: 40px; display: flex; align-items: center; justify-content: center; gap: 10px;" onclick="alert('Please configure YOUR_GOOGLE_CLIENT_ID in script.js first.')">
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" height="18" alt="Google logo">
                    Sign in with Google
                </button>
            `;
        } else {
            // Real Initialization - Poll until Google library loads
            function initGoogleAuth() {
                if (typeof google === 'undefined') {
                    setTimeout(initGoogleAuth, 100);
                    return;
                }
                google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleLoginResponse
                });
                google.accounts.id.renderButton(
                    googleLoginBtnContainer,
                    { theme: 'filled_black', size: 'large', type: 'standard', shape: 'pill', width: 300 }
                );
            }
            initGoogleAuth();
        }
    }

    function handleGoogleLoginResponse(response) {
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) submitBtn.classList.add('loading');

        fetch('http://localhost:5000/api/google-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: response.credential, action: 'login' })
        })
            .then(res => {
                if (!res.ok) return res.json().then(data => { throw new Error(data.error || 'Google Login Failed'); });
                return res.json();
            })
            .then(data => {
                if (submitBtn) {
                    submitBtn.classList.remove('loading');
                    submitBtn.style.background = '#10b981';
                    const btnText = submitBtn.querySelector('.btn-text');
                    const btnIcon = submitBtn.querySelector('.btn-icon');
                    if (btnText) btnText.textContent = 'Success!';
                    if (btnIcon) {
                        btnIcon.classList.remove('ph-arrow-right');
                        btnIcon.classList.add('ph-check-circle');
                    }
                }
                sessionStorage.setItem('loggedInUser', JSON.stringify(data.user));
                setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
            })
            .catch(err => {
                if (submitBtn) submitBtn.classList.remove('loading');
                alert('Google Sign-In Error: ' + err.message);
            });
    }

    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const loginForm = document.getElementById('loginForm');
    const submitBtn = document.getElementById('submitBtn');

    // Toggle Password Visibility
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);

            // Toggle Icon
            const icon = togglePasswordBtn.querySelector('i');
            if (type === 'text') {
                icon.classList.remove('ph-eye');
                icon.classList.add('ph-eye-slash');
            } else {
                icon.classList.remove('ph-eye-slash');
                icon.classList.add('ph-eye');
            }
        });
    }

    // Basic Form Validation & Submission Simulation
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevent actual submission

            // Prevent double clicks
            if (submitBtn.classList.contains('loading')) return;

            let isValid = true;

            // Remove previous error states
            const identifierInput = document.getElementById('identifier');
            identifierInput.parentElement.parentElement.classList.remove('invalid');
            passwordInput.parentElement.parentElement.classList.remove('invalid');

            // Simple Identifier Validation (Email, Username, or Phone)
            const identifierValue = identifierInput.value.trim();

            if (!identifierValue || identifierValue.length < 3) {
                identifierInput.parentElement.parentElement.classList.add('invalid');
                isValid = false;
            }

            // Simple Password Validation
            if (!passwordInput.value.trim() || passwordInput.value.length < 6) {
                passwordInput.parentElement.parentElement.classList.add('invalid');
                const pGroup = passwordInput.parentElement.parentElement;
                let errText = pGroup.querySelector('.error-text');
                if (!errText) {
                    errText = document.createElement('span');
                    errText.className = 'error-text';
                    errText.textContent = 'Password must be at least 6 characters';
                    pGroup.appendChild(errText);
                }
                isValid = false;
            }

            if (!isValid) return; // Stop executing if invalid

            // Real Login Attempt
            submitBtn.classList.add('loading');
            const passwordGroup = passwordInput.parentElement.parentElement;
            let otpErrorText = passwordGroup.querySelector('.api-error');

            fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    identifier: identifierValue,
                    password: passwordInput.value
                })
            })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(data => {
                            throw new Error(data.error || 'Login Failed');
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    submitBtn.classList.remove('loading');

                    // Show success state
                    submitBtn.style.background = '#10b981'; // Tailwind green-500
                    const btnText = submitBtn.querySelector('.btn-text');
                    const btnIcon = submitBtn.querySelector('.btn-icon');

                    if (btnText) btnText.textContent = 'Success!';
                    if (btnIcon) {
                        btnIcon.classList.remove('ph-arrow-right');
                        btnIcon.classList.add('ph-check-circle');
                    }

                    // Store user data in session and redirect securely
                    sessionStorage.setItem('loggedInUser', JSON.stringify(data.user));

                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1000);
                })
                .catch(error => {
                    submitBtn.classList.remove('loading');

                    // Display API error on the password field
                    passwordInput.parentElement.parentElement.classList.add('invalid');
                    let apiErrText = passwordInput.parentElement.parentElement.querySelector('.error-text');

                    if (!apiErrText) {
                        apiErrText = document.createElement('span');
                        apiErrText.className = 'error-text';
                        passwordInput.parentElement.parentElement.appendChild(apiErrText);
                    }
                    apiErrText.textContent = "Error: " + error.message;
                    apiErrText.style.display = 'block'; // force visible
                });
        });
    }

    // Clear validation error on input focus
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.parentElement.parentElement.classList.remove('invalid');
        });
    });

    // --- Forgot Password Flow ---
    const loginSection = document.getElementById('loginSection');
    const fpContainer = document.getElementById('forgotPasswordContainer');
    const forgotLinks = document.querySelectorAll('.forgot-link, .fp-back-btn');

    const fpRequestForm = document.getElementById('fpRequestForm');
    const fpVerifyForm = document.getElementById('fpVerifyForm');
    const fpResetForm = document.getElementById('fpResetForm');

    const fpTitle = document.getElementById('fpTitle');
    const fpSubtitle = document.getElementById('fpSubtitle');

    let fpCurrentEmail = '';
    let fpCurrentOtp = '';

    // Toggle between Login and Forgot Password views
    forgotLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (loginSection.style.display === 'none') {
                loginSection.style.display = 'block';
                fpContainer.style.display = 'none';

                // Reset states
                fpRequestForm.style.display = 'block';
                fpVerifyForm.style.display = 'none';
                fpResetForm.style.display = 'none';
                fpTitle.textContent = 'Reset Password';
                fpSubtitle.textContent = 'Enter your email to receive an OTP.';
                fpCurrentEmail = '';
                fpCurrentOtp = '';
                document.getElementById('fpEmail').value = '';
                document.getElementById('fpOtp').value = '';
                document.getElementById('fpNewPassword').value = '';
                document.getElementById('fpConfirmPassword').value = '';

            } else {
                loginSection.style.display = 'none';
                fpContainer.style.display = 'block';
            }
        });
    });

    // Step 1: Request OTP
    if (fpRequestForm) {
        fpRequestForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = document.getElementById('fpRequestBtn');
            if (btn.classList.contains('loading')) return;

            const emailField = document.getElementById('fpEmail');
            const email = emailField.value.trim();
            if (!email) return;

            btn.classList.add('loading');

            fetch('http://localhost:5000/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            })
                .then(res => res.json().then(data => ({ status: res.status, ok: res.ok, body: data })))
                .then(res => {
                    btn.classList.remove('loading');
                    if (!res.ok) {
                        throw new Error(res.body.error || 'Failed to send OTP');
                    }

                    fpCurrentEmail = email;
                    fpRequestForm.style.display = 'none';
                    fpVerifyForm.style.display = 'block';
                    fpTitle.textContent = 'Verify OTP';
                    fpSubtitle.textContent = 'Enter the 6-digit code sent to your email.';
                })
                .catch(err => {
                    btn.classList.remove('loading');
                    emailField.parentElement.parentElement.classList.add('invalid');
                    let errNode = emailField.parentElement.parentElement.querySelector('.error-text');
                    if (errNode) errNode.textContent = err.message;
                });
        });
    }

    // Step 2: Verify OTP
    if (fpVerifyForm) {
        fpVerifyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const otpField = document.getElementById('fpOtp');
            const otp = otpField.value.trim();
            if (!otp) return;

            fpCurrentOtp = otp;

            // Advance to next step (we will verify OTP in the final step to keep it stateless)
            fpVerifyForm.style.display = 'none';
            fpResetForm.style.display = 'block';
            fpTitle.textContent = 'New Password';
            fpSubtitle.textContent = 'Create a new, strong password.';
        });
    }

    // Step 3: Reset Password
    if (fpResetForm) {
        fpResetForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = document.getElementById('fpResetBtn');
            if (btn.classList.contains('loading')) return;

            const newPasswordField = document.getElementById('fpNewPassword');
            const confirmPasswordField = document.getElementById('fpConfirmPassword');
            const errorSpan = document.getElementById('fpPasswordError');

            const newPassword = newPasswordField.value;
            const confirmPassword = confirmPasswordField.value;

            errorSpan.textContent = '';

            if (newPassword !== confirmPassword) {
                confirmPasswordField.parentElement.parentElement.classList.add('invalid');
                errorSpan.textContent = 'Passwords do not match';
                return;
            }

            if (newPassword.length < 6) {
                newPasswordField.parentElement.parentElement.classList.add('invalid');
                errorSpan.textContent = 'Password must be at least 6 characters';
                return;
            }

            btn.classList.add('loading');

            fetch('http://localhost:5000/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: fpCurrentEmail,
                    otp: fpCurrentOtp,
                    new_password: newPassword
                })
            })
                .then(res => res.json().then(data => ({ status: res.status, ok: res.ok, body: data })))
                .then(res => {
                    btn.classList.remove('loading');
                    if (!res.ok) {
                        throw new Error(res.body.error || 'Password reset failed');
                    }

                    // Show success UI and redirect back to login
                    btn.style.background = '#10b981';
                    const btnText = btn.querySelector('.btn-text');
                    const btnIcon = btn.querySelector('.btn-icon');
                    if (btnText) btnText.textContent = 'Success!';
                    if (btnIcon) {
                        btnIcon.classList.remove('ph-check-circle');
                        btnIcon.classList.add('ph-check-circle');
                    }

                    setTimeout(() => {
                        forgotLinks[0].click(); // Simulate clicking 'Back to Login'
                        // Add success message on login? For now just reset UI.
                    }, 1500);
                })
                .catch(err => {
                    btn.classList.remove('loading');
                    confirmPasswordField.parentElement.parentElement.classList.add('invalid');
                    errorSpan.textContent = err.message;
                });
        });
    }

});

// Global visibility toggle hook for inline HTML onclick="toggleVisibility('id', this)"
window.toggleVisibility = function (inputId, btn) {
    const input = document.getElementById(inputId);
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);
    const icon = btn.querySelector('i');
    if (type === 'text') {
        icon.classList.remove('ph-eye');
        icon.classList.add('ph-eye-slash');
    } else {
        icon.classList.remove('ph-eye-slash');
        icon.classList.add('ph-eye');
    }
};
