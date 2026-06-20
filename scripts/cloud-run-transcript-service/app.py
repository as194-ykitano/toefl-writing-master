import os
import tempfile
import json
from flask import Flask, request, jsonify
import subprocess
import shlex

app = Flask(__name__)

# Prepare cookies file from env (base64 or plain). This allows passing YouTube cookies securely.
COOKIES_PATH = None
_cookies_env = os.getenv("COOKIES_TEXT", "").strip()
if _cookies_env:
    try:
        # Try base64 decode first
        import base64
        decoded = base64.b64decode(_cookies_env)
        COOKIES_PATH = os.path.join(tempfile.gettempdir(), "cookies.txt")
        with open(COOKIES_PATH, "wb") as f:
            f.write(decoded)
    except Exception:
        # Fallback: treat as plain text
        COOKIES_PATH = os.path.join(tempfile.gettempdir(), "cookies.txt")
        with open(COOKIES_PATH, "w", encoding="utf-8", errors="ignore") as f:
            f.write(_cookies_env)


def run_yt_dlp(video_id: str) -> dict:
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    temp_dir = tempfile.mkdtemp(prefix="yt_")
    output_pattern = os.path.join(temp_dir, f"{video_id}.%(ext)s")

    # Subtitles only, convert to vtt
    args = [
        "yt-dlp",
        "--write-subs",
        "--write-auto-subs",
        "--sub-langs",
        "en",
        "--skip-download",
        "--convert-subs",
        "vtt",
        "--output",
        output_pattern,
        "--no-warnings",
        "--user-agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "--extractor-args",
        "youtube:player_client=web;player_skip=webpage",
        video_url,
    ]

    # Attach cookies if available (for restricted videos / bot checks)
    if COOKIES_PATH and os.path.exists(COOKIES_PATH):
        args.insert(-1, COOKIES_PATH)
        args.insert(-1, "--cookies")

    try:
        completed = subprocess.run(args, capture_output=True, text=True, timeout=int(os.getenv("YT_DLP_TIMEOUT", "60")))
        if completed.returncode != 0:
            return {"success": False, "error": "yt-dlp failed", "stderr": completed.stderr}

        # Find VTT
        vtt_path = None
        for name in os.listdir(temp_dir):
            if name.startswith(video_id) and name.endswith(".vtt"):
                vtt_path = os.path.join(temp_dir, name)
                break
        if not vtt_path:
            return {"success": False, "error": "no_vtt"}

        with open(vtt_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        # Extract plain text (simple heuristic)
        lines = []
        for line in content.splitlines():
            s = line.strip()
            if not s or s.startswith("WEBVTT") or "-->" in s or s.isdigit():
                continue
            if s.startswith("NOTE"):
                continue
            lines.append(s)
        text = " ".join(lines)
        text = " ".join(text.split())

        if len(text) < 50:
            return {"success": False, "error": "too_short"}

        return {
            "success": True,
            "transcript": text,
            "language": "auto",
            "source": "yt-dlp",
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "timeout"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/transcript")
def transcript():
    video_id = request.args.get("videoId")
    if not video_id:
        return jsonify({"success": False, "error": "videoId_required"}), 400
    result = run_yt_dlp(video_id)
    status = 200 if result.get("success") else 500
    return jsonify(result), status


@app.get("/")
def root():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    from waitress import serve
    serve(app, host="0.0.0.0", port=port)


