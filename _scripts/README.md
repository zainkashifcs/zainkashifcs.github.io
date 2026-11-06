# Site scripts (not published)

Run from the website repo root. The solutions repo is assumed to be cloned next to it at `../comp-program-grind`.

## Activity (automatic)
GitHub Actions runs `.github/workflows/sync-and-deploy.yml` every 6 hours, on every push to `main`, and from
**Actions > Sync activity and deploy > Run workflow**. It rebuilds `_data/activity*.json` from the solutions repo's
history, checks the data, commits any change, and deploys the site. No AI and no secrets are involved.

Local preview of the same step:

    python _scripts/sync_activity.py --solutions ../comp-program-grind
    python _scripts/check_data.py

Ambiguous commits land in `_review/activity-queue.json`. Decide them by adding an entry to
`_review/activity-decisions.json` (same shape as the existing ones), then rerun the sync.

## Quiz questions (manual, Claude Sonnet via Claude Code)

    claude --model sonnet
    > /draft-quiz            (or /draft-quiz 1790D)

Drafts are written to `_review/quiz/<slug>.json` and checked by `verify_quiz.py` (it compiles and runs your solution).
Read them, then publish the ones you approve (the problem must already have a post):

    python _scripts/verify_quiz.py --solutions ../comp-program-grind <slug>
    python _scripts/approve_quiz.py <slug> <question-id> [<question-id> ...] [--reviewed]

`--reviewed` is required for drafts marked `needs-review` and means you checked them yourself.

## Self-tests

    python -m doctest make_post.py _scripts/sync_activity.py _scripts/check_data.py _scripts/verify_quiz.py _scripts/approve_quiz.py
