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
# Usage:
#   runner/run-samples.sh <model> <scores-file> [<scores-file> ...]
# Example:
#   runner/run-samples.sh opus-4.8-max \
#     scores/multi_opus-4.8-max-s2_2026-05-30.json \
#     scores/multi_opus-4.8-max-s3_2026-05-30.json

set -uo pipefail
cd "$(dirname "$0")/.."

MODEL="${1:?usage: run-samples.sh <model> <scores-file> [<scores-file> ...]}"
shift
FILES=("$@")
[ "${#FILES[@]}" -gt 0 ] || { echo "no scores files given"; exit 1; }

TOTAL_SPECS=$(ls specs | wc -l | tr -d ' ')
MAX_PASSES=6

scored() { # count rows with a non-null weighted_score in $1 (0 if missing)
  node -e "try{const s=require('$PWD/$1');console.log(s.filter(r=>r&&r.weighted_score!=null).length)}catch(e){console.log(0)}"
}

for FILE in "${FILES[@]}"; do
  echo "=== sample -> $FILE (target ${TOTAL_SPECS}/${TOTAL_SPECS}) ==="
  for pass in $(seq 1 "$MAX_PASSES"); do
    node runner/run.ts \
      --model "$MODEL" \
      --retry-on-limit \
      --keep-awake \
      --max-transient-retries 3 \
      --resume "$FILE"
    n=$(scored "$FILE")
    echo "[driver $(date +%H:%M:%S)] $FILE: ${n}/${TOTAL_SPECS} after pass ${pass}"
    [ "$n" = "$TOTAL_SPECS" ] && break
    [ "$pass" = "$MAX_PASSES" ] && { echo "[driver] giving up on $FILE at ${n}/${TOTAL_SPECS} after ${MAX_PASSES} passes"; break; }
    echo "[driver] re-resuming $FILE (pass $((pass + 1))) in 20s..."
    sleep 20
  done
done

echo "[driver $(date +%H:%M:%S)] all samples done"
