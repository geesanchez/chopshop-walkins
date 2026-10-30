#!/usr/bin/env bash
# ============================================================
# Chop Shop fix — local acceptance checks (test kit)
#
# Usage:
#   export ANON_KEY=<local anon key from `supabase status`>
#   ./run-checks.sh pre    # before the fix: sensitive reads must be OPEN (200)
#   ./run-checks.sh post   # after the fix:  sensitive reads must be 42501,
#                          #                  safe app queries must stay 200
#
# Optional: SUPABASE_URL (default http://127.0.0.1:54321)
# Prints one PASS/FAIL line per check; exit code = number of failures (0 = all pass).
# Acceptance bar (tightened after the ChatGPT checker pass): a bare non-200
# is NOT proof of closure — sensitive checks require Postgres code 42501
# (permission denied) in the response body, and the safe checks must return
# 200 in the same run with the same key.
# ============================================================
set -u

MODE="${1:-}"
BASE="${SUPABASE_URL:-http://127.0.0.1:54321}"
if [ -z "${ANON_KEY:-}" ]; then
  echo "FAIL  ANON_KEY is not set — run: supabase status (copy the anon key), then export ANON_KEY=..."
  exit 99
fi
if [ "$MODE" != "pre" ] && [ "$MODE" != "post" ]; then
  echo "Usage: ./run-checks.sh pre|post"
  exit 98
fi

FAILS=0

# req <path> -> sets CODE and BODY
req() {
  BODY="$(curl -s -w $'\n%{http_code}' \
    -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
    "$BASE/rest/v1/$1")"
  CODE="${BODY##*$'\n'}"
  BODY="${BODY%$'\n'*}"
}

report() { # report <ok:0|1> <label> <detail>
  if [ "$1" -eq 0 ]; then
    echo "PASS  $2 — $3"
  else
    echo "FAIL  $2 — $3"
    FAILS=$((FAILS + 1))
  fi
}

expect_open() { # sensitive read, pre-fix: must be 200
  req "$2"
  [ "$CODE" = "200" ]
  report $? "$1" "expected 200 (exposure reproduced), got $CODE"
}

expect_denied_42501() { # sensitive read, post-fix: must be permission denied (42501)
  req "$2"
  if [ "$CODE" != "200" ] && printf '%s' "$BODY" | grep -q '42501'; then
    report 0 "$1" "denied with 42501 (HTTP $CODE)"
  else
    report 1 "$1" "expected non-200 with Postgres code 42501, got HTTP $CODE body: $BODY"
  fi
}

expect_safe_200() { # the app's own queries: must work in BOTH modes
  req "$2"
  [ "$CODE" = "200" ]
  report $? "$1" "expected 200, got $CODE"
}

SETTINGS_SAFE='shop_settings?select=id,is_open,queue_cap,active_barbers,updated_at'
QUEUE_SAFE='queue_entries?select=id,customer_name,service_id,status,arrival_status,position,source,assigned_barber_id,created_at,called_at,completed_at,services(*)'

if [ "$MODE" = "pre" ]; then
  expect_open "F1 staff_pin_hash readable"        'shop_settings?select=staff_pin_hash'
  expect_open "F2 queue phone readable"           'queue_entries?select=phone'
  expect_open "cut_history readable"              'cut_history?select=customer_name'
  expect_open "pin_attempts readable"             'pin_attempts?select=ip,count'
  expect_open "sms_attempts readable"             'sms_attempts?select=phone,count'
else
  expect_denied_42501 "F1 staff_pin_hash denied"  'shop_settings?select=staff_pin_hash'
  expect_denied_42501 "F2 queue phone denied"     'queue_entries?select=phone'
  expect_denied_42501 "cut_history denied"        'cut_history?select=customer_name'
  expect_denied_42501 "pin_attempts denied"       'pin_attempts?select=ip,count'
  expect_denied_42501 "sms_attempts denied"       'sms_attempts?select=phone,count'
fi

expect_safe_200 "app settings query (use-queue.ts:56)" "$SETTINGS_SAFE"
expect_safe_200 "app queue query (use-queue.ts:23)"    "$QUEUE_SAFE"

echo "---"
if [ "$FAILS" -eq 0 ]; then
  echo "ALL CHECKS PASSED ($MODE)"
else
  echo "$FAILS CHECK(S) FAILED ($MODE)"
fi
exit "$FAILS"
