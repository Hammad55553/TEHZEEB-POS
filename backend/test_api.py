import urllib.request
import json
req = urllib.request.Request("http://127.0.0.1:8000/db/inventory/select", data=json.dumps({"filters": [], "embed": [], "order": None, "limit": None, "single": False}).encode("utf-8"), headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req) as response:
    print(response.read().decode())
