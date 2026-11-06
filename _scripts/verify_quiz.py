"""Check draft quiz questions against the real solution code and notes, and list problems that need questions.

Usage:
    python _scripts/verify_quiz.py --solutions ../comp-program-grind --queue      # what needs questions
    python _scripts/verify_quiz.py --solutions ../comp-program-grind [slug ...]  # verify drafts in _review/quiz/

Each draft gets validation.status:
    passed        an execution check or a verbatim note quote proves the answer
    needs-review  well-formed, but a human has to judge it (e.g. reasoning or code-only claims)
    failed        wrong answer, quote not in the notes, unclear choices, or non-ASCII text
Drafts are only ever edited in their validation fields. Nothing here publishes anything.
Self-check: python -m doctest _scripts/verify_quiz.py
"""
import argparse
import datetime as dt
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SITE))
sys.path.insert(0, str(SITE / "_scripts"))
from check_data import question_errors  # noqa: E402
from make_post import parse  # noqa: E402
from sync_activity import file_pid, git  # noqa: E402

norm = lambda s: " ".join(str(s).split())


def judge(q, notes, run):
    """Decide a draft's status. `run(input) -> output` executes the real solution.

    >>> notes = "Idea: No loop needed: it's pure maths. Complexity: O(1)."
    >>> base = dict(id="t-q1", status="draft", question="Q?", explanation="E.", validation={})
    >>> judge(dict(base, kind="complexity", choices=["O(1)", "O(n)"], answer=0,
    ...            source=dict(type="note", section="Idea", quote="Complexity: O(1)")), notes, None)[0]
    'passed'
    >>> judge(dict(base, kind="tracing", choices=["2", "4"], answer=0, source=dict(type="run", detail="sample"),
    ...            validation=dict(method="executed", input="6 6 4", output="2")), notes, lambda i: "4")
    ('failed', ['t-q1: the solution prints 4, not 2'])
    >>> judge(dict(base, kind="reasoning", choices=["a", "b"], answer=1, source=dict(type="code", detail="line 9")), notes, None)
    ('needs-review', ['t-q1: code-only claim; check it yourself before approving'])
    """
    errs = question_errors(q, live=False)
    text = q.get("question", "") + "".join(q.get("choices", [])) + q.get("explanation", "")
    if any(ord(c) > 126 for c in text):
        errs.append(f"{q.get('id')}: use plain ASCII")
    if errs:
        return "failed", errs
    i, src, val, answer = q["id"], q["source"], q.get("validation", {}), q["choices"][q["answer"]]
    proven = False
    if src["type"] == "note":
        if norm(src["quote"]) not in norm(notes):
            return "failed", [f"{i}: the quote is not in the notes word for word"]
        proven = q["kind"] == "complexity" and norm(answer) in norm(src["quote"])
    if val.get("method") == "executed" or src["type"] == "run":
        if "input" not in val or "output" not in val:
            return "failed", [f"{i}: execution checks need validation.input and validation.output"]
        got = run(val["input"])
        if norm(got) != norm(val["output"]):
            return "failed", [f"{i}: the solution prints {norm(got)}, not {norm(val['output'])}"]
        if q["kind"] == "tracing":
            hits = [c for c in q["choices"] if norm(c) == norm(got)]
            if hits != [answer]:
                return "failed", [f"{i}: exactly one choice must match the program's output"]
        proven = True
    if proven:
        return "passed", []
    reason = "code-only claim" if src["type"] == "code" else "the answer follows from reasoning, not a check"
    return "needs-review", [f"{i}: {reason}; check it yourself before approving"]


def solution_file(solutions, pid):
    """The problem's current solution file: by filename ID, else the file the activity data recorded."""
    tree = git(solutions, "ls-tree", "-r", "--name-only", "HEAD").splitlines()
    for p in tree:
        if p.endswith(".cpp") and file_pid(p) == pid:
            return Path(solutions) / p
    acts = json.loads((SITE / "_data/activity.json").read_text(encoding="utf-8"))
    for e in acts:
        if e["problem"] == pid and e.get("file") in tree:
            return Path(solutions) / e["file"]
    return None


def runner(cpp, cxx):
    """Compile the solution once; return run(input) with a 2 s time limit and capped output."""
    tmp = Path(tempfile.mkdtemp())
    exe = tmp / "solution.exe"
    subprocess.run([cxx, "-std=c++17", "-O2", "-o", str(exe), str(cpp)], check=True, capture_output=True)

    def run(stdin):
        r = subprocess.run([str(exe)], input=stdin + "\n", capture_output=True, text=True, timeout=2)
        return r.stdout[:10000]
    return run


def notes_text(cpp):
    """Every leading // comment line of the solution, labelled or not (quotes are checked against this)."""
    lines = []
    for line in cpp.read_text(encoding="utf-8").splitlines():
        if not line.lstrip().startswith("//"):
            break
        lines.append(line.strip()[2:].strip())
    return "\n".join(lines)


def queue(solutions):
    """Problems with notes in their solution file and no approved or draft questions yet."""
    acts = json.loads((SITE / "_data/activity.json").read_text(encoding="utf-8"))
    have = {p.stem for p in (SITE / "_data/quizzes").glob("*.json")} | {p.stem for p in (SITE / "_review/quiz").glob("*.json")}
    posts = {p.stem[11:] for p in (SITE / "_posts").glob("????-??-??-*.md")}
    out, seen = [], set()
    for e in sorted(acts, key=lambda e: e["seq"], reverse=True):
        if e["type"] not in ("solved", "upsolved") or e["verification"] != "file" or e["problem"] in seen:
            continue
        seen.add(e["problem"])
        cpp = solution_file(solutions, e["problem"])
        if not cpp:
            continue
        fields, _ = parse(cpp.read_text(encoding="utf-8"))
        if not (fields.get("Idea") or fields.get("Lesson")):
            continue
        title = fields.get("Problem") or f"{e['problem']} {e['title']}"
        slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
        if slug in have:
            continue
        out.append(dict(problem=e["problem"], title=title, slug=slug, solution=str(cpp.relative_to(solutions)).replace("\\", "/"),
                        published=slug in posts, solved=e["date"], commit=e["short"]))
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description="Verify draft quiz questions")
    ap.add_argument("--solutions", required=True)
    ap.add_argument("--queue", action="store_true", help="list problems that need questions and write _review/quiz/queue.json")
    ap.add_argument("--cxx", default="g++")
    ap.add_argument("slugs", nargs="*")
    a = ap.parse_args(argv)
    if a.queue:
        q = queue(a.solutions)
        path = SITE / "_review/quiz/queue.json"
        text = json.dumps(q, indent=2) + "\n"
        if not path.exists() or path.read_text(encoding="utf-8") != text:
            path.write_text(text, encoding="utf-8", newline="\n")
        for x in q:
            print(f"{x['problem']:6} {x['title']:40} {'published' if x['published'] else 'not published'}  {x['solution']}")
        print(f"{len(q)} problem(s) need questions")
        return
    files = [SITE / f"_review/quiz/{s}.json" for s in a.slugs] or sorted((SITE / "_review/quiz").glob("*.json"))
    failed = 0
    for f in files:
        if f.name == "queue.json":
            continue
        drafts = json.loads(f.read_text(encoding="utf-8"))
        pid = f.stem.split("-")[0].upper()
        cpp = solution_file(a.solutions, pid)
        if not cpp:
            print(f"{f.name}: no solution file for {pid} in the solutions repo")
            failed += 1
            continue
        notes, run = notes_text(cpp), None
        for q in drafts:
            if q.get("status") == "approved":
                continue
            needs_run = q.get("validation", {}).get("method") == "executed" or q.get("source", {}).get("type") == "run"
            if needs_run and run is None:
                run = runner(cpp, a.cxx)
            status, reasons = judge(q, notes, run)
            q.setdefault("validation", {}).update(status=status, reasons=reasons, checked=dt.date.today().isoformat())
            failed += status == "failed"
            print(f"{q['id']:28} {status:13} {'; '.join(reasons)}")
        f.write_text(json.dumps(drafts, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
