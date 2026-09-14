#!/usr/bin/env bash
# Run additional whole-benchmark samples sequentially, each into its own scores
# file, topping each up to a full 13/13 across multiple --resume passes.
#
# This exists for sleep-prone hosts (e.g. a laptop under WSL2): a single run can
# lose specs when the machine suspends mid-call. run.ts already self-heals
# transient failures and waits out usage limits, but if the process itself is
# killed (hard suspend, reboot), this driver simply re-invokes --resume until
# every spec in the file has a score.
#
# A suspend can also leave run.ts *alive but wedged* (2026-09-11: parked in the
# usage-limit wait loop for 2.5 days after the host slept). Re-invoking on exit
# does nothing for that, so each pass runs under a stall watchdog: if run.ts
# prints nothing AND nothing under its sandbox changes for STALL_MINUTES
# (default 90), the pass is killed and the loop re-resumes. Legitimate quiet
# stretches are much shorter — the limit wait logs every ~10 min, an
# implementation writes files as it goes, and a judge call takes minutes.
# The killed spec is simply re-run from scratch on the next pass.
#
# Usage:
#   [STALL_MINUTES=90] runner/run-samples.sh <model> <scores-file> [<scores-file> ...]
# Example:
#   runner/run-samples.sh opus-4.8-max \
#     scores/multi_opus-4.8-max-s2_2026-05-30.json \
#     scores/multi_opus-4.8-max-s3_2026-05-30.json
# STALL_MINUTES=0 disables the watchdog.

set -uo pipefail
cd "$(dirname "$0")/.."
# Job control: each background job gets its own process group, so a wedged
# run.ts can be killed together with the CLI it spawned and the keep-awake.
set -m

MODEL="${1:?usage: run-samples.sh <model> <scores-file> [<scores-file> ...]}"
shift
FILES=("$@")
[ "${#FILES[@]}" -gt 0 ] || { echo "no scores files given"; exit 1; }

TOTAL_SPECS=$(ls specs | wc -l | tr -d ' ')
MAX_PASSES=6
STALL_MINUTES="${STALL_MINUTES:-90}"
# Mirrors os.tmpdir() + SANDBOX_ROOT in run.ts.
SANDBOX_ROOT="${TMPDIR:-${TMP:-${TEMP:-/tmp}}}/react-profession-bench"

scored() { # count rows with a non-null weighted_score in $1 (0 if missing)
  node -e "try{const s=require('$PWD/$1');console.log(s.filter(r=>r&&r.weighted_score!=null).length)}catch(e){console.log(0)}"
}

# Most recent sign of life from the current pass, as epoch seconds: the last
# line run.ts printed, the scores file, or any file written under a sandbox
# directory this pass created (node_modules excluded).
last_activity() { # $1 = output stamp, $2 = pass-start stamp, $3 = scores file
  {
    stat -c %Y "$1" "$3" 2>/dev/null
    find "$SANDBOX_ROOT" -maxdepth 1 -type d -name "*_${MODEL}" -newer "$2" 2>/dev/null \
      | while IFS= read -r d; do
          find "$d" -path "$d/node_modules" -prune -o -type f -printf '%T@\n' 2>/dev/null
        done
  } | cut -d. -f1 | sort -n | tail -1
}

# One run.ts pass under the watchdog. Returns run.ts's exit status, or 124 if
# it was killed for stalling.
run_pass() { # $1 = scores file
  local file="$1" out_stamp start_stamp pid rc="" wait_rc last now
  out_stamp=$(mktemp); start_stamp=$(mktemp)
  node runner/run.ts \
    --model "$MODEL" \
    --retry-on-limit \
    --keep-awake \
    --max-transient-retries 3 \
    --resume "$file" \
    > >(while IFS= read -r line; do printf '%s\n' "$line"; touch "$out_stamp"; done) 2>&1 &
  pid=$!
  while kill -0 "$pid" 2>/dev/null; do
    sleep 60
    kill -0 "$pid" 2>/dev/null || break   # exited during the sleep: not a stall
    [ "$STALL_MINUTES" -gt 0 ] || continue
    last=$(last_activity "$out_stamp" "$start_stamp" "$file")
    now=$(date +%s)
    if [ -n "$last" ] && [ $(( now - last )) -ge $(( STALL_MINUTES * 60 )) ]; then
      echo "[driver $(date +%H:%M:%S)] STALL: no output or sandbox activity for ${STALL_MINUTES} min — killing run.ts (pgid $pid) to re-resume"
      kill -TERM -- "-$pid" 2>/dev/null
      for _ in $(seq 1 10); do kill -0 "$pid" 2>/dev/null || break; sleep 1; done
      kill -KILL -- "-$pid" 2>/dev/null
      rc=124
    fi
  done
  wait "$pid" 2>/dev/null; wait_rc=$?
  [ -n "$rc" ] || rc=$wait_rc
  rm -f "$out_stamp" "$start_stamp"
  return "$rc"
}

for FILE in "${FILES[@]}"; do
  echo "=== sample -> $FILE (target ${TOTAL_SPECS}/${TOTAL_SPECS}) ==="
  for pass in $(seq 1 "$MAX_PASSES"); do
    run_pass "$FILE"
    n=$(scored "$FILE")
    echo "[driver $(date +%H:%M:%S)] $FILE: ${n}/${TOTAL_SPECS} after pass ${pass}"
    [ "$n" = "$TOTAL_SPECS" ] && break
    [ "$pass" = "$MAX_PASSES" ] && { echo "[driver] giving up on $FILE at ${n}/${TOTAL_SPECS} after ${MAX_PASSES} passes"; break; }
    echo "[driver] re-resuming $FILE (pass $((pass + 1))) in 20s..."
    sleep 20
  done
done

echo "[driver $(date +%H:%M:%S)] all samples done"
