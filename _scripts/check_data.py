"""Validate the site's generated and hand-approved data. Run by CI before anything is committed.

Usage: python _scripts/check_data.py            (exit code 1 and a list of problems if anything is wrong)
Self-check: python -m doctest _scripts/check_data.py
"""
import json
import re
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
TYPES = {"solved", "upsolved", "redo", "attempted", "practice", "published", "milestone"}
KINDS = {"tracing", "complexity", "edge-case", "data-structure", "math", "reasoning"}


def question_errors(q, live):
    """Problems with one quiz question (empty list = fine). `live` questions must be approved.

    >>> ok = dict(id="x-q1", status="approved", kind="tracing", question="Q?", choices=["1", "2"], answer=1,
    ...           explanation="Because.", source=dict(type="run", detail="sample"), validation=dict(method="executed"))
    >>> question_errors(ok, live=True)
    []
    >>> question_errors(dict(ok, answer=2, choices=["1", "1"]), live=True)
    ['x-q1: choices are not unique', 'x-q1: answer index out of range']
    >>> question_errors(dict(ok, status="draft"), live=True)
    ['x-q1: only approved questions may be published']
    """
    i, errs = q.get("id", "?"), []
    for k in ("id", "status", "kind", "question", "choices", "answer", "explanation", "source", "validation"):
        if k not in q:
            errs.append(f"{i}: missing {k}")
    if errs:
        return errs
    if live and q["status"] != "approved":
        errs.append(f"{i}: only approved questions may be published")
    if q["kind"] not in KINDS:
        errs.append(f"{i}: unknown kind {q['kind']!r}")
    if len(q["choices"]) < 2 or len(set(q["choices"])) != len(q["choices"]):
        errs.append(f"{i}: choices are not unique")
    if not (isinstance(q["answer"], int) and 0 <= q["answer"] < len(q["choices"])):
        errs.append(f"{i}: answer index out of range")
    src = q["source"]
    if src.get("type") not in ("note", "run", "code") or (src.get("type") == "note" and not src.get("quote")):
        errs.append(f"{i}: source must be a note quote, a run or a code reference")
    text = q["question"] + "".join(q["choices"]) + q["explanation"]
    if live and any(ord(c) > 126 for c in text):  # drafts get this as a verify_quiz.py finding instead
        errs.append(f"{i}: use plain ASCII in questions, choices and explanations")
    return errs


def tag_errors(q, vocab, post_tags):
    """Question topic tags: at least one, all from _data/topics.json, and all listed by the question's own write-up.

    >>> tag_errors(dict(id="x-q1", tags=["math"]), {"math", "greedy"}, {"math"})
    []
    >>> tag_errors(dict(id="x-q1", tags=["greedy"]), {"math", "greedy"}, {"math"})
    ["x-q1: tag 'greedy' is not one of its write-up's tags"]
    >>> tag_errors(dict(id="x-q1", tags=["maths"]), {"math"}, {"maths"})
    ["x-q1: unknown topic tag 'maths' (see _data/topics.json)"]
    >>> tag_errors(dict(id="x-q1"), {"math"}, {"math"})
    ['x-q1: needs at least one topic tag']
    """
    i, tags = q.get("id", "?"), q.get("tags") or []
    if not tags:
        return [f"{i}: needs at least one topic tag"]
    errs = [f"{i}: unknown topic tag {t!r} (see _data/topics.json)" for t in tags if t not in vocab]
    return errs + [f"{i}: tag {t!r} is not one of its write-up's tags" for t in tags if t in vocab and t not in post_tags]


def front_matter(path):
    """Front matter of a generated post (make_post.py writes each value as JSON)."""
    out, lines = {}, path.read_text(encoding="utf-8").splitlines()
    for line in lines[1:lines[1:].index("---") + 1]:
        k, _, v = line.partition(":")
        try:
            out[k.strip()] = json.loads(v)
        except ValueError:
            out[k.strip()] = v.strip()
    return out


STATUSES = {"solved", "attempted", "unsolved"}


def main():
    errs = []
    load = lambda p: json.loads(p.read_text(encoding="utf-8"))
    acts = load(SITE / "_data/activity.json")
    keys = [e["key"] for e in acts]
    errs += [f"duplicate activity key {k}" for k in sorted({k for k in keys if keys.count(k) > 1})]
    for e in acts:
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", e["date"]) or e["type"] not in TYPES or not e.get("display", False):
            errs.append(f"bad activity entry {e['key']}")
        if e["verification"] == "file" and not (e.get("file") and e.get("evidence_commit")):
            errs.append(f"{e['key']}: file evidence claimed but no file/commit recorded")
    st = load(SITE / "_data/activity_stats.json")
    if set(st["independent_total"]) != set(st["independent_solves"]) | set(st["independent_upsolves"]):
        errs.append("stats: independent total is not solves + upsolves")
    if set(st["independent_total"]) & set(st["assisted_solves"]):
        errs.append("stats: a problem is counted as both independent and assisted")
    if any(u.get("display") for u in load(SITE / "_review/activity-unverified.json")):
        errs.append("unverified records must never be displayed")
    posts = {p.stem[11:]: front_matter(p) for p in (SITE / "_posts").glob("????-??-??-*.md")}
    vocab = {t["id"] for g in load(SITE / "_data/topics.json") for t in g["topics"]}
    for slug, fm in posts.items():
        if fm.get("status", "solved") not in STATUSES:
            errs.append(f"{slug}: status must be one of {sorted(STATUSES)}")
    ids = []
    for f in sorted((SITE / "_data/quizzes").glob("*.json")):
        if f.stem not in posts:
            errs.append(f"{f.name}: quiz for a problem with no published post")
        for q in load(f):
            errs += question_errors(q, live=True)
            errs += tag_errors(q, vocab, set(posts.get(f.stem, {}).get("tags") or []))
            ids.append(q.get("id"))
    for f in sorted((SITE / "_review/quiz").glob("*.json")):
        if f.name == "queue.json":
            continue
        for q in load(f):
            errs += [e for e in question_errors(q, live=False)]
            ids.append(q.get("id"))
    errs += [f"duplicate question id {i}" for i in sorted({i for i in ids if ids.count(i) > 1})]
    if errs:
        print("\n".join(errs))
        sys.exit(1)
    print(f"data ok: {len(acts)} activity entries, {len(ids)} questions")


if __name__ == "__main__":
    main()
