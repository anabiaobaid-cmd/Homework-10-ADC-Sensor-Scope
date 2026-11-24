import sys, os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from app import app
client = app.test_client()
paths = ['/embedded/', '/embedded', '/home/', '/game/', '/portfolio/', '/api/']
for p in paths:
    resp = client.get(p)
    print(p, resp.status_code)
