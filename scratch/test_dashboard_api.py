import requests
import json

url = "http://localhost:8000/v1/inventory-analytics/summary"
headers = {
    "X-User-Id": "56dca529-8e72-4ddc-b006-bc8e934bc6b5"
}

try:
    response = requests.get(url, headers=headers, timeout=10)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print(json.dumps(response.json(), indent=2))
    else:
        print(response.text)
except Exception as e:
    print(f"Failed: {e}")
