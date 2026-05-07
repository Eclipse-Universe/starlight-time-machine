"""
Daily APOD updater — run by GitHub Actions.
NASA API key 없으면 DEMO_KEY 사용 (하루 1회 실행이므로 충분).
"""
import json
import os
import sys
import urllib.request
from pathlib import Path

api_key  = os.environ.get("NASA_API_KEY") or "DEMO_KEY"
apod_url = f"https://api.nasa.gov/planetary/apod?api_key={api_key}"
out_path = Path(__file__).parent.parent / "data" / "apod.json"

try:
    req = urllib.request.Request(
        apod_url,
        headers={"User-Agent": "StarlightTimeMachine/1.0"}
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        data = json.loads(r.read())
except Exception as e:
    print(f"[APOD] fetch failed: {e}", file=sys.stderr)
    sys.exit(1)

if data.get("media_type") != "image":
    print(f"[APOD] today is {data.get('media_type')} — skipping")
    sys.exit(0)

apod = {
    "date":        data.get("date", ""),
    "title":       data.get("title", ""),
    "url":         data.get("url", ""),
    "hdurl":       data.get("hdurl") or data.get("url", ""),
    "explanation": data.get("explanation", ""),
    "media_type":  data.get("media_type", "image"),
    "copyright":   data.get("copyright", ""),
}

out_path.write_text(json.dumps(apod, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"[APOD] updated: {apod['title']} ({apod['date']})")
