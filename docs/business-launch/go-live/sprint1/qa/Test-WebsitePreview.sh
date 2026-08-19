#!/usr/bin/env bash
set -euo pipefail
base="${1:-http://127.0.0.1:8765}"
fail=0
for p in /index.html /pricing.html /assessments/eva.html /contact.html /book-appointment.html /sitemap.xml /robots.txt; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$base$p" || echo 000)
  if [[ "$code" != "200" ]]; then echo "FAIL $p $code"; fail=1; else echo "OK $p"; fi
done
exit $fail
