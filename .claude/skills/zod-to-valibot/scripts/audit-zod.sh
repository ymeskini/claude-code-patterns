#!/usr/bin/env bash
# Audits a repo for Zod usage. Run from repo root.
# Outputs: import locations, API usage counts, and flags advanced features
# that need human review before migrating to Valibot.

set -euo pipefail

# Prefer ripgrep if available; fall back to grep -r
if command -v rg >/dev/null 2>&1; then
  SEARCH() { rg --no-heading -n "$@" 2>/dev/null || true; }
  COUNT() { rg -c --no-heading "$@" 2>/dev/null | awk -F: '{s+=$NF} END {print s+0}'; }
  COMMON_GLOBS=(--glob '!node_modules' --glob '!dist' --glob '!build' --glob '!.next' --glob '!coverage' --glob '*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}')
else
  SEARCH() { grep -rn --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.mts' --include='*.cts' --include='*.mjs' --include='*.cjs' --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=.next --exclude-dir=coverage "$@" . 2>/dev/null || true; }
  COUNT() { SEARCH "$@" | wc -l | tr -d ' '; }
  COMMON_GLOBS=()
fi

echo "=== Zod audit ==="
echo

echo "## Files importing zod"
if command -v rg >/dev/null 2>&1; then
  rg -l "${COMMON_GLOBS[@]}" "from ['\"]zod['\"]|require\\(['\"]zod['\"]\\)" 2>/dev/null || echo "  (none)"
else
  SEARCH -l -E "from ['\"]zod['\"]|require\\(['\"]zod['\"]\\)" || echo "  (none)"
fi
echo

echo "## Package.json entries"
if [ -f package.json ]; then
  grep -E '"(zod|valibot)"' package.json || echo "  neither zod nor valibot found in package.json"
else
  echo "  no package.json in current directory"
fi
echo

echo "## Usage counts for common Zod APIs"
apis=(
  "z\\.object"
  "z\\.string"
  "z\\.number"
  "z\\.boolean"
  "z\\.array"
  "z\\.tuple"
  "z\\.record"
  "z\\.map"
  "z\\.set"
  "z\\.date"
  "z\\.bigint"
  "z\\.enum"
  "z\\.nativeEnum"
  "z\\.literal"
  "z\\.union"
  "z\\.intersection"
  "z\\.discriminatedUnion"
  "z\\.lazy"
  "z\\.instanceof"
  "z\\.coerce"
  "z\\.preprocess"
  "z\\.infer"
  "\\.safeParse"
  "\\.parse\\("
  "\\.parseAsync"
  "\\.safeParseAsync"
  "\\.optional\\(\\)"
  "\\.nullable\\(\\)"
  "\\.nullish\\(\\)"
  "\\.default\\("
  "\\.catch\\("
  "\\.transform\\("
  "\\.refine\\("
  "\\.pick\\("
  "\\.omit\\("
  "\\.partial\\("
  "\\.required\\("
  "\\.extend\\("
  "\\.merge\\("
  "\\.strict\\(\\)"
  "\\.passthrough\\(\\)"
  "\\.brand"
  "\\.readonly\\(\\)"
)
for api in "${apis[@]}"; do
  if command -v rg >/dev/null 2>&1; then
    n=$(rg -c "${COMMON_GLOBS[@]}" "$api" 2>/dev/null | awk -F: '{s+=$NF} END {print s+0}')
  else
    n=$(COUNT -E "$api")
  fi
  if [ "${n:-0}" -gt 0 ]; then
    printf "  %-28s %s\n" "$api" "$n"
  fi
done
echo

echo "## Advanced features flagged for human review"
flags=(
  "z\\.function"
  "z\\.promise"
  "\\.superRefine"
  "setErrorMap"
  "errorMap:"
  "ZodError"
  "ZodIssue"
  "\\.flatten\\("
  "\\.format\\("
  "ZodType<"
  "\\.parseAsync"
  "\\.safeParseAsync"
  "async.*\\.refine"
)
any_flag=0
for f in "${flags[@]}"; do
  if command -v rg >/dev/null 2>&1; then
    matches=$(rg -n "${COMMON_GLOBS[@]}" "$f" 2>/dev/null || true)
  else
    matches=$(SEARCH -E "$f" || true)
  fi
  if [ -n "$matches" ]; then
    any_flag=1
    echo "  [!] $f"
    echo "$matches" | sed 's/^/      /' | head -n 5
    extra=$(echo "$matches" | wc -l | tr -d ' ')
    if [ "$extra" -gt 5 ]; then
      echo "      ... ($((extra - 5)) more)"
    fi
  fi
done
[ "$any_flag" -eq 0 ] && echo "  (none — straightforward migration expected)"
echo

echo "=== End audit ==="
