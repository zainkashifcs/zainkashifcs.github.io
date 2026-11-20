# Site scripts (not published)

Run from the website repo root. The solutions repo is assumed to be cloned next to it at `../comp-program-grind`;
every script only reads it.

## Activity and archive (automatic)
GitHub Actions runs `.github/workflows/sync-and-deploy.yml` every 6 hours, on every push to `main`, and from
**Actions > Sync activity and deploy > Run workflow**. It rebuilds `_data/activity*.json` from the solutions repo's
history, rebuilds the problem archive, refreshes the Codeforces profile, checks the data, commits any change, and
deploys the site. No AI and no secrets are involved.

Local preview of the same steps:

    python _scripts/sync_activity.py --solutions ../comp-program-grind
    python _scripts/build_problems.py --fetch --solutions ../comp-program-grind
    python _scripts/fetch_codeforces.py
    python _scripts/check_data.py

Ambiguous commits land in `_review/activity-queue.json`. Decide them by adding an entry to
`_review/activity-decisions.json` (same shape as the existing ones), then rerun the sync.

`build_problems.py` writes `_data/problems.json` (status from the log; name, rating and tags from Codeforces' public
API, cached in `_data/cf_meta.json`), `_data/months.json` (per-month facts for the journal) and one page stub per
problem without a write-up in `_problems/`, with your notes and code copied verbatim from the solution file.
Without `--solutions` it keeps the existing page bodies. A problem's status in a write-up's front matter
(`// Status: attempted` in the solution header) wins over the log.

## Codeforces profile
Set `codeforces_handle` in `_config.yml`. `fetch_codeforces.py` makes at most three public API calls, two seconds
apart, and writes `_data/codeforces.json`. The profile only appears on the site when that file says `"status": "ok"`.
The handle is `amaza1nn` (https://codeforces.com/profile/amaza1nn); it resolved on 20 Nov 2026.

## Quiz questions (manual, Claude Sonnet via Claude Code)

    claude --model sonnet
    > /draft-quiz            (or /draft-quiz 1790D)

Drafts are written to `_review/quiz/<slug>.json` and checked by `verify_quiz.py` (it compiles and runs your solution).
Any independently solved problem in the archive can have questions; their topic tags must come from the problem's
write-up or Codeforces tags. Read the drafts, then publish the ones you approve:

    python _scripts/verify_quiz.py --solutions ../comp-program-grind <slug>
    python _scripts/approve_quiz.py <slug> <question-id> [<question-id> ...] [--reviewed]
    python _scripts/approve_quiz.py <slug> --passed          # every draft for <slug> that passed verification

`--reviewed` is required for drafts marked `needs-review` and means you checked them yourself.
To approve every passed draft for every problem after reading them (bash):

    for f in _review/quiz/*.json; do s=$(basename "$f" .json); [ "$s" = queue ] || python _scripts/approve_quiz.py "$s" --passed; done

## Self-tests

    python -m doctest make_post.py _scripts/sync_activity.py _scripts/check_data.py _scripts/verify_quiz.py \
        _scripts/approve_quiz.py _scripts/build_problems.py _scripts/fetch_codeforces.py
