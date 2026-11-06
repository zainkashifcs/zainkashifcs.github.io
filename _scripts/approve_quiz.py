"""Publish draft questions you have read and approved. Only a human should run this.

Usage:
    python _scripts/approve_quiz.py 1790d-matryoshkas 1790d-matryoshkas-q1 1790d-matryoshkas-q3
    python _scripts/approve_quiz.py 1790d-matryoshkas 1790d-matryoshkas-q2 --reviewed   # for needs-review drafts you checked

Rules: the problem must have a published post; a draft must have passed verify_quiz.py (or be
needs-review and approved with --reviewed); live questions are only ever appended, never changed.
Self-check: python -m doctest _scripts/approve_quiz.py
"""
import argparse
import datetime as dt
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from check_data import front_matter, tag_errors  # one rule for topics, shared with the data check

SITE = Path(__file__).resolve().parent.parent


def approvable(q, reviewed):
    """Why a draft can't be approved, or None if it can.

    >>> approvable({"validation": {"status": "passed"}}, False) is None
    True
    >>> approvable({"validation": {"status": "needs-review"}}, False)
    'needs-review: read it, then rerun with --reviewed'
    >>> approvable({"validation": {"status": "failed"}}, True)
    'failed verification; fix it and rerun verify_quiz.py'
    """
    status = q.get("validation", {}).get("status")
    if status == "passed" or (status == "needs-review" and reviewed):
        return None
    if status == "needs-review":
        return "needs-review: read it, then rerun with --reviewed"
    if status == "failed":
        return "failed verification; fix it and rerun verify_quiz.py"
    return "not verified yet; run verify_quiz.py first"


def main(argv=None):
    ap = argparse.ArgumentParser(description="Approve draft quiz questions")
    ap.add_argument("slug")
    ap.add_argument("ids", nargs="+")
    ap.add_argument("--reviewed", action="store_true", help="you have checked the needs-review drafts yourself")
    a = ap.parse_args(argv)
    if not list((SITE / "_posts").glob(f"????-??-??-{a.slug}.md")):
        sys.exit(f"{a.slug} has no published post yet; publish the write-up first (make_post.py)")
    post = sorted((SITE / "_posts").glob(f"????-??-??-{a.slug}.md"))[-1]
    post_tags = set(front_matter(post).get("tags") or [])
    vocab = {t["id"] for g in json.loads((SITE / "_data/topics.json").read_text(encoding="utf-8")) for t in g["topics"]}
    draft_path, live_path = SITE / f"_review/quiz/{a.slug}.json", SITE / f"_data/quizzes/{a.slug}.json"
    drafts = json.loads(draft_path.read_text(encoding="utf-8"))
    live = json.loads(live_path.read_text(encoding="utf-8")) if live_path.exists() else []
    taken = {q["id"] for q in live}
    by_id = {q["id"]: q for q in drafts}
    for i in a.ids:
        if i not in by_id:
            sys.exit(f"{i} is not a draft in {draft_path.name}")
        if i in taken:
            sys.exit(f"{i} is already live; live questions are never overwritten")
        why = approvable(by_id[i], a.reviewed)
        if why:
            sys.exit(f"{i}: {why}")
        bad = tag_errors(by_id[i], vocab, post_tags)
        if bad:
            sys.exit("; ".join(bad) + " (topic tags must come from the write-up's own Tags)")
    for i in a.ids:
        q = dict(by_id[i], status="approved", approved_on=dt.date.today().isoformat())
        q["validation"].pop("reasons", None)
        live.append(q)
    live_path.parent.mkdir(parents=True, exist_ok=True)
    live_path.write_text(json.dumps(live, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    draft_path.write_text(json.dumps([q for q in drafts if q["id"] not in a.ids], indent=2, ensure_ascii=False) + "\n",
                          encoding="utf-8", newline="\n")
    print(f"approved {len(a.ids)} question(s) for {a.slug}; they go live on the next deploy")


if __name__ == "__main__":
    main()
