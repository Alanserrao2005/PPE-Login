import requests
import time

url = "https://ppe-login.onrender.com/api/send-otp"
payload = {"email": "alanserrao420@gmail.com"}

print("Sending request to:", url)
start = time.time()
try:
    response = requests.post(url, json=payload, timeout=60)
    print("Status:", response.status_code)
    print("Response:", response.text)
except Exception as e:
    print("Error:", e)
print("Time elapsed:", time.time() - start)
