document.addEventListener('DOMContentLoaded', () => {

    // --- Google Auth Initialization ---
    // IMPORTANT: Replace 'YOUR_GOOGLE_CLIENT_ID' with your actual Google OAuth 2.0 Client ID
    const GOOGLE_CLIENT_ID = '895285838361-g5us8j145ves5cmpdlke879nb7oj089f.apps.googleusercontent.com';
    const googleSignupBtnContainer = document.getElementById('googleSignupBtn');

    if (googleSignupBtnContainer) {
        if (GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') {
            googleSignupBtnContainer.innerHTML = `<button type="button" class="submit-btn" style="background: white; color: #3c4043; box-shadow: 0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15); border-radius: 20px; padding: 10px 24px; font-weight: 500; font-family: 'Roboto', sans-serif; height: 40px; display: flex; align-items: center; justify-content: center; gap: 10px;" onclick="alert('Please configure YOUR_GOOGLE_CLIENT_ID in signup.js first.')"><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" height="18" alt="Google logo">Sign up with Google</button>`;
        } else {
            function initGoogleSignupAuth() {
                if (typeof google === 'undefined') {
                    setTimeout(initGoogleSignupAuth, 100);
                    return;
                }
                google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleSignupResponse
                });

                google.accounts.id.renderButton(
                    googleSignupBtnContainer,
                    { theme: 'filled_black', size: 'large', type: 'standard', shape: 'pill', width: 300, text: 'signup_with' }
                );
            }
            initGoogleSignupAuth();
        }
    }

    function handleGoogleSignupResponse(response) {
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) submitBtn.classList.add('loading');

        fetch('http://localhost:5000/api/google-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: response.credential, action: 'signup' })
        })
            .then(res => {
                if (!res.ok) return res.json().then(data => { throw new Error(data.error || 'Google Signup Failed'); });
                return res.json();
            })
            .then(data => {
                if (submitBtn) {
                    submitBtn.classList.remove('loading');
                    submitBtn.style.background = '#10b981';
                    const btnText = submitBtn.querySelector('.btn-text');
                    const btnIcon = submitBtn.querySelector('.btn-icon');
                    if (btnText) btnText.textContent = 'Account Created!';
                    if (btnIcon) {
                        btnIcon.classList.remove('ph-arrow-right');
                        btnIcon.classList.add('ph-rocket-launch');
                    }
                }
                // Temporarily store session just like a regular login/signup
                sessionStorage.setItem('loggedInUser', JSON.stringify(data.user));

                // Redirect to dashboard on new account
                setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);
            })
            .catch(err => {
                if (submitBtn) submitBtn.classList.remove('loading');
                alert('Google Sign-Up Error: ' + err.message);
            });
    }

    // --- Elements ---
    const signupForm = document.getElementById('signupForm');
    const passwordInput = document.getElementById('password');
    const confirmInput = document.getElementById('confirmPassword');
    const emailInput = document.getElementById('email');
    const togglePasswordBtn = document.getElementById('togglePasswordBtn');

    // Password Strength elements
    const strengthMeter = document.getElementById('strengthMeter');
    const strengthText = document.getElementById('strengthText');
    const ruleLength = document.getElementById('rule-length');
    const ruleUpper = document.getElementById('rule-upper');
    const ruleNum = document.getElementById('rule-num');
    const ruleSpecial = document.getElementById('rule-special');

    // OTP Elements
    const otpModal = document.getElementById('otpModal');
    const otpForm = document.getElementById('otpForm');
    const otpInputs = document.querySelectorAll('.otp-inputs input');
    const otpEmailDisplay = document.getElementById('otpEmailDisplay');
    const verifyBtn = document.getElementById('verifyBtn');
    const otpError = document.getElementById('otpError');
    const resendLink = document.getElementById('resendLink');

    const API_BASE_URL = 'http://localhost:5000/api';

    // --- Toggle Password Visibility ---
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            // Also toggle confirm password
            confirmInput.setAttribute('type', type);

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

    // --- Password Strength & Rules Engine ---
    let isPasswordStrong = false;

    if (passwordInput) {
        passwordInput.addEventListener('input', () => {
            const val = passwordInput.value;
            let score = 0;

            // Rule Checkers
            const hasLength = val.length >= 8;
            const hasUpperLower = /[a-z]/.test(val) && /[A-Z]/.test(val);
            const hasNumber = /[0-9]/.test(val);
            const hasSpecial = /[!@#\$%\^\&*\)\(+=._-]/.test(val);

            // Update Rule UI
            updateRuleUI(ruleLength, hasLength);
            updateRuleUI(ruleUpper, hasUpperLower);
            updateRuleUI(ruleNum, hasNumber);
            updateRuleUI(ruleSpecial, hasSpecial);

            // Calculate Score
            if (val.length > 0) {
                if (hasLength) score++;
                if (hasUpperLower) score++;
                if (hasNumber) score++;
                if (hasSpecial && val.length > 8) score++; // bonus for special + length
            }

            // Ensure strong password requirement
            isPasswordStrong = (hasLength && hasUpperLower && hasNumber && hasSpecial);

            // Update Meter UI
            strengthMeter.className = 'password-strength'; // reset
            if (val.length === 0) {
                strengthText.textContent = 'None';
            } else if (score === 0 || score === 1) {
                strengthMeter.classList.add('strength-1');
                strengthText.textContent = 'Weak';
                strengthText.style.color = '#ff4b4b';
            } else if (score === 2) {
                strengthMeter.classList.add('strength-2');
                strengthText.textContent = 'Fair';
                strengthText.style.color = '#fbbf24';
            } else if (score === 3) {
                strengthMeter.classList.add('strength-3');
                strengthText.textContent = 'Good';
                strengthText.style.color = '#34d399';
            } else if (score >= 4 && isPasswordStrong) {
                strengthMeter.classList.add('strength-4');
                strengthText.textContent = 'Strong';
                strengthText.style.color = '#10b981';
            }
        });
    }

    function updateRuleUI(elem, isValid) {
        const icon = elem.querySelector('i');
        if (isValid) {
            elem.classList.remove('rule-invalid');
            elem.classList.add('rule-valid');
            icon.classList.remove('ph-x-circle');
            icon.classList.add('ph-check-circle');
        } else {
            elem.classList.remove('rule-valid');
            elem.classList.add('rule-invalid');
            icon.classList.remove('ph-check-circle');
            icon.classList.add('ph-x-circle');
        }
    }


    // --- Form Submission & OTP dispatch ---
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Reset validation states
            emailInput.parentElement.parentElement.classList.remove('invalid');
            confirmInput.parentElement.parentElement.classList.remove('invalid');
            passwordInput.parentElement.parentElement.classList.remove('invalid');

            let isValid = true;
            const email = emailInput.value.trim();

            if (!isPasswordStrong) {
                passwordInput.parentElement.parentElement.classList.add('invalid');
                let errText = passwordInput.parentElement.parentElement.querySelector('.error-text');
                if (!errText) {
                    errText = document.createElement('span');
                    errText.className = 'error-text';
                    errText.textContent = 'Please meet all password requirements.';
                    passwordInput.parentElement.parentElement.appendChild(errText);
                }
                isValid = false;
            }

            if (passwordInput.value !== confirmInput.value) {
                confirmInput.parentElement.parentElement.classList.add('invalid');
                isValid = false;
            }

            if (isValid) {
                const submitBtn = document.getElementById('submitBtn');
                submitBtn.classList.add('loading');

                try {
                    // Send request to Flask Backend to send OTP
                    const response = await fetch(`${API_BASE_URL}/send-otp`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: email })
                    });

                    const data = await response.json();

                    if (response.ok) {
                        // Show OTP Modal
                        otpEmailDisplay.textContent = email;
                        otpModal.classList.add('active');
                        otpInputs[0].focus();
                    } else {
                        alert(data.error || 'Failed to send OTP.');
                    }
                } catch (err) {
                    console.error(err);
                    alert("Cannot connect to server. Is the Python backend running?");
                } finally {
                    submitBtn.classList.remove('loading');
                }
            }
        });
    }

    // --- OTP Input Navigation ---
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            // Auto advance
            if (e.target.value.length === 1 && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });

        input.addEventListener('keydown', (e) => {
            // Auto backspace
            if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
                otpInputs[index - 1].focus();
            }
        });

        // Allow pasting 6 digits
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').slice(0, 6).replace(/\D/g, '');
            if (pastedData.length > 0) {
                for (let i = 0; i < pastedData.length; i++) {
                    if (i < otpInputs.length) {
                        otpInputs[i].value = pastedData[i];
                    }
                }
                if (pastedData.length < 6) {
                    otpInputs[pastedData.length].focus();
                } else {
                    otpInputs[5].focus();
                }
            }
        });
    });

    // --- OTP Verification Submission ---
    if (otpForm) {
        otpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            otpError.style.display = 'none';
            verifyBtn.classList.add('loading');

            const otpCode = Array.from(otpInputs).map(inp => inp.value).join('');
            const email = emailInput.value.trim();

            try {
                const response = await fetch(`${API_BASE_URL}/verify-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: email,
                        otp: otpCode,
                        password: passwordInput.value
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    // Success!
                    verifyBtn.classList.remove('loading');
                    verifyBtn.style.background = '#10b981';
                    const btnText = verifyBtn.querySelector('.btn-text');
                    const btnIcon = verifyBtn.querySelector('.btn-icon');
                    if (btnText) btnText.textContent = 'Account Created!';
                    if (btnIcon) {
                        btnIcon.classList.remove('ph-check-circle');
                        btnIcon.classList.add('ph-rocket-launch'); // Launching new account
                    }

                    // Redirect after 2 seconds
                    setTimeout(() => {
                        window.location.href = 'index.html'; // back to login
                    }, 2000);

                } else {
                    // Fail
                    otpError.style.display = 'block';
                    otpError.textContent = data.error || 'Invalid OTP';
                    verifyBtn.classList.remove('loading');
                }
            } catch (err) {
                console.error(err);
                otpError.style.display = 'block';
                otpError.textContent = "Server error. Try again.";
                verifyBtn.classList.remove('loading');
            }
        });
    }

    if (resendLink) {
        resendLink.addEventListener('click', async (e) => {
            e.preventDefault();
            resendLink.textContent = "Sending...";

            try {
                const email = emailInput.value.trim();
                await fetch(`${API_BASE_URL}/send-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email })
                });
                resendLink.textContent = "Sent!";
                setTimeout(() => resendLink.textContent = "Resend Code", 2000);
            } catch (e) {
                console.error(e);
                resendLink.textContent = "Resend Failed";
            }
        });
    }
});
