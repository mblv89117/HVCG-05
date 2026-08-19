#!/usr/bin/env bash
# Local preview URL — no DNS, no public publish
cd "$(dirname "$0")/preview"
echo "PREVIEW: http://127.0.0.1:8765/index.html"
echo "Ctrl+C to stop. Do not expose this port publicly."
python3 -m http.server 8765 --bind 127.0.0.1
