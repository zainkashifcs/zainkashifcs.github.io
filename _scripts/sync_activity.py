"""Rebuild the activity data from the solutions repository's git history. Deterministic: no AI, standard library only.

Usage:
    python _scripts/sync_activity.py --solutions ../comp-program-grind [--fetch-titles]

Every run re-reads the whole history, so it is idempotent by construction, survives renames, deletions
and rewritten history, and never duplicates an entry. Decisions on ambiguous commits live in
_review/activity-decisions.json (written by a human). Outputs:

    _data/activity.json         displayed entries (verified, plus clearly labelled message-only practice)
    _data/activity_stats.json   distinct-problem counts, active days, streak
    _data/sync_state.json       solutions-repo HEAD this data was built from
    _data/cf_problems.json      cached Codeforces titles (official API)
    _review/activity-queue.json       commits that need a decision (not published)
    _review/activity-unverified.json  internal unverified records (not published)
    _review/activity-ignored.json     edits, renames, setup and unmentioned files (not published)

Self-check: python -m doctest _scripts/sync_activity.py
"""
import argparse
import datetime as dt
import json
import re
import subprocess
import sys
import urllib.request
from pathlib import Path
from urllib.parse import quote

SITE = Path(__file__).resolve().parent.parent
VERB = re.compile(r"\b(upsolv\w*|solv\w*|redo\w*|add\w*|attempt\w*)", re.I)
PID = re.compile(r"\b(\d{1,4}[A-Z]\d?)\b")
ASSISTED = re.compile(r"assist|hint", re.I)
STOP = {"solve", "solved", "redo", "with", "from", "scratch", "own", "solution", "cpp", "and", "the"}


def verb_kind(word):
    """Map a message verb to an entry type.

    >>> [verb_kind(w) for w in ["solve", "solv", "Add", "upsolve", "redo", "attempted"]]
    ['solved', 'solved', 'solved', 'upsolved', 'redo', 'attempted']
    """
    w = word.lower()
    if w.startswith("upsolv"):
        return "upsolved"
    if w.startswith(("solv", "add")):
        return "solved"
    return {"redo": "redo", "atte": "attempted"}[w[:4]]


def parse_message(msg):
    """Split a commit message into (problem id, verb) mentions, a note and a rating.
    Parenthesised text is a note, never a problem mention ("first 2D grid" is not problem 2D).

    >>> parse_message("solve CF 1A theatre square (long long + integer ceiling) + redo 236A, 160A")
    ([('1A', 'solved'), ('236A', 'redo'), ('160A', 'redo')], 'long long + integer ceiling', None)
    >>> parse_message("solve CF 4C registration system (first 1300, map) + 112A")
    ([('4C', 'solved'), ('112A', 'solved')], 'first 1300, map', 1300)
    >>> parse_message("solve CF 1790D matryoshkas (map + new sets per size, 1200)")
    ([('1790D', 'solved')], 'map + new sets per size', 1200)
    >>> parse_message("Add CF 158A - Next Round (vectors, loops, conditionals); tiny hints needed")
    ([('158A', 'solved')], 'vectors, loops, conditionals; tiny hints needed', None)
    >>> parse_message("734A anton and danik")
    ([('734A', None)], '', None)
    """
    notes = re.findall(r"\(([^)]*)\)", msg)
    bare = re.sub(r"\([^)]*\)", " ", msg)
    tail = bare.split(";", 1)[1].strip() if ";" in bare else ""
    head = bare.split(";", 1)[0]
    mentions, verb = [], None
    for m in re.finditer(rf"{VERB.pattern}|{PID.pattern}", head, re.I):
        if m.group(1):
            verb = verb_kind(m.group(1))
        elif re.fullmatch(PID, m.group(0)):  # IDs are upper-case in practice; keep the check strict
            mentions.append((m.group(0), verb))
    is_rating = lambda s: re.fullmatch(r"\d{3,4}", s.strip()) is not None  # a bare rating is stored as `rating`, not repeated in the note
    note = "; ".join(x for x in [", ".join(p.strip() for n in notes for p in n.split(",") if not is_rating(p)), tail] if x)
    ratings = [int(r) for r in re.findall(r"\b(\d{3,4})\b", " ".join(notes)) if 800 <= int(r) <= 3500 and int(r) % 100 == 0]
    return mentions, note.strip(), (ratings[0] if len(ratings) == 1 else None)


def file_pid(path):
    """Problem ID from a solution filename, or None.

    >>> [file_pid(p) for p in ["CF Questions/2275_B_Again.cpp", "1790D_Matryoshkas.cpp", "791A.Bear.cpp",
    ...                        "281_Word_Capitalisation.cpp", "watermelon.cpp", "1_A_Theatre_Square.cpp"]]
    ['2275B', '1790D', '791A', None, None, '1A']
    """
    stem = Path(path).name.rsplit(".", 1)[0]
    m = re.match(r"(\d{1,4})_?([A-Z]\d?)(?![a-z0-9])", stem)
    return m[1] + m[2] if m else None


def git(repo, *args):
    return subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True, encoding="utf-8", check=True).stdout


def commits(repo):
    """Yield dicts: full, short, date (author's local date), message, files [(status, path, old_path)]."""
    out = git(repo, "log", "--reverse", "-M", "--name-status", "--format=%x1e%H%x1f%h%x1f%aI%x1f%s")
    for n, block in enumerate(out.split("\x1e")[1:]):
        head, _, rest = block.partition("\n")
        full, short, when, msg = head.split("\x1f")
        files = []
        for line in rest.splitlines():
            if not line.strip():
                continue
            parts = line.split("\t")
            status = parts[0][0]
            files.append((status, parts[-1], parts[1] if status in "RC" else None))
        yield dict(n=n, full=full, short=short, date=when[:10], message=msg, files=files)


def header_fields(repo, rev, path):
    """Optional '// Problem:' / '// Rating:' / '// Solved:' header fields (and '(rating N)') from a solution file."""
    try:
        text = git(repo, "show", f"{rev}:{path}")
    except subprocess.CalledProcessError:
        return {}
    out = {}
    for line in text.splitlines()[:25]:
        if not line.lstrip().startswith("//"):
            break
        body = line.strip()[2:].strip()
        m = re.match(r"(Problem|Rating|Solved):\s*(.+)", body)
        if m:
            out[m[1].lower()] = m[2].strip()
        elif "rating" not in out:
            r = re.search(r"\(rating (\d{3,4})\)", body)
            if r:
                out["rating"] = r[1]
    return out


def match_file(pid, words, files, taken):
    """Choose the touched file that holds problem `pid`: exact ID, then a filename starting with its
    contest number, then a shared title word. Files claimed by another ID are never reused.

    >>> fs = [("A", "CF Questions/281_Word_Capitalisation.cpp", None), ("A", "CF Questions/71A_W2LW.cpp", None)]
    >>> match_file("281A", {"word", "capitalization"}, fs, set())
    'CF Questions/281_Word_Capitalisation.cpp'
    >>> match_file("4A", {"watermelon"}, [("A", "watermelon.cpp", None), ("A", "hello.exe", None)], set())
    'watermelon.cpp'
    >>> match_file("791A", {"bear", "big", "brother"}, [("A", "CF Questions/Bears_Again.cpp", None)], set()) is None
    True
    """
    cands = [p for s, p, _ in files if s in "AM" and p.endswith(".cpp") and p not in taken]
    for p in cands:
        if file_pid(p) == pid:
            return p
    num = re.match(r"\d+", pid)[0]
    loose = [p for p in cands if file_pid(p) is None]
    for p in loose:
        if re.match(rf"{num}(?!\d)", Path(p).name):
            return p
    for p in loose:
        toks = {t.lower() for t in re.split(r"[_.\s-]+", Path(p).name.rsplit(".", 1)[0])}
        if toks & {w for w in words if len(w) >= 4 and w not in STOP}:
            return p
    return None


def classify(repo, decisions):
    entries, queue, unverified, ignored, used = [], [], [], [], set()
    seen_solved = set()

    def decided(c, pid):
        for d in decisions:
            if c["full"].startswith(d["commit"]) and d.get("problem") == pid and d["action"] != "milestone":
                used.add(id(d))
                return d
        return None

    def record(c, pid, typ, path, assisted, verification, note, rating, evidence=None, display=True, decided_by="rule"):
        ev = evidence or c
        entries.append(dict(key=f"{c['short']}:{pid}:{typ}", n=c["n"], date=c["date"], commit=c["full"], short=c["short"],
                            evidence_commit=ev["full"], problem=pid, type=typ, assisted=assisted, verification=verification,
                            file=path, note=note, rating=rating, message=c["message"], display=display, decided_by=decided_by))
        if typ in ("solved", "upsolved"):
            seen_solved.add(pid)

    by_short = {}
    for c in commits(repo):
        by_short[c["short"]] = c
        mentions, note, rating = parse_message(c["message"])
        words = {w.lower() for w in re.findall(r"[A-Za-z]+", re.sub(r"\([^)]*\)", " ", c["message"]))}
        assisted = bool(ASSISTED.search(c["message"]))
        taken = set()
        problem_files = [(s, p) for s, p, _ in c["files"] if s in "AM" and p.endswith(".cpp") and file_pid(p)]
        if not mentions and VERB.search(c["message"]) and problem_files:
            d = decided(c, None)
            if d:
                apply_decision(c, d, record, unverified, ignored, by_short, taken)
            else:
                queue.append(dict(commit=c["short"], date=c["date"], message=c["message"], problem=None,
                                  reason="message has a verb but no problem ID", files=[p for _, p in problem_files]))
        for pid, verb in mentions:
            path = match_file(pid, words, c["files"], taken)
            if path:
                taken.add(path)
            d = decided(c, pid)
            if d:
                apply_decision(c, d, record, unverified, ignored, by_short, taken, pid, path, note, rating)
                continue
            status = next((s for s, p, _ in c["files"] if p == path), None)
            if path and verb is None and status == "M":
                ignored.append(dict(commit=c["short"], problem=pid, file=path, reason="edit (no verb)"))
            elif path and verb is None:
                queue.append(dict(commit=c["short"], date=c["date"], message=c["message"], problem=pid, reason="no verb", files=[path]))
            elif not path:
                queue.append(dict(commit=c["short"], date=c["date"], message=c["message"], problem=pid,
                                  reason=f"message says '{verb or 'nothing'}' but no file for {pid} changed in this commit", files=[]))
            elif verb in ("solved", "upsolved") and pid in seen_solved:
                queue.append(dict(commit=c["short"], date=c["date"], message=c["message"], problem=pid,
                                  reason=f"{pid} is already recorded as solved", files=[path]))
            else:
                record(c, pid, verb, path, assisted, "file", note, rating)
        for s, p, old in c["files"]:
            if p in taken or not p.endswith(".cpp"):
                continue
            why = {"A": "new file not mentioned in the message", "M": "edit", "D": "deleted", "R": f"renamed from {old}", "C": "copied"}.get(s, s)
            ignored.append(dict(commit=c["short"], problem=file_pid(p), file=p, reason=why))
    for d in decisions:  # milestones and orphaned decisions
        if d["action"] == "milestone":
            c = next((x for k, x in by_short.items() if x["full"].startswith(d["commit"])), None)
            if c:
                used.add(id(d))
                entries.append(dict(key=f"{c['short']}:{d['problem']}:milestone", n=c["n"], date=c["date"], commit=c["full"], short=c["short"],
                                    evidence_commit=c["full"], problem=d["problem"], type="milestone", assisted=False,
                                    verification="message", file=None, note=d["title"], rating=None, message=c["message"],
                                    display=True, decided_by="zain"))
    orphans = [d for d in decisions if id(d) not in used]
    for d in orphans:
        queue.append(dict(commit=d["commit"], date=None, message=None, problem=d.get("problem"),
                          reason="decision no longer matches any commit (history rewritten?)", files=[]))
    return entries, queue, unverified, ignored


def apply_decision(c, d, record, unverified, ignored, by_short, taken, pid=None, path=None, note="", rating=None):
    pid = d.get("problem_id") or d.get("problem") or pid
    if d["action"] == "ignore":
        ignored.append(dict(commit=c["short"], problem=pid, file=path, reason="decision: " + d.get("reason", "ignore")))
    elif d["action"] == "unverified":
        unverified.append(dict(key=f"{c['short']}:{pid}:{d['type']}", date=c["date"], commit=c["full"], problem=pid,
                               type=d["type"], verification="message", reason=d.get("reason", ""), message=c["message"], display=False))
    elif d["action"] == "record":
        ev = next((x for k, x in by_short.items() if x["full"].startswith(d.get("evidence_commit", c["short"]))), c)
        f = d.get("file", path)
        if f and ev is c:
            taken.add(f)
        record(c, pid, d["type"], f, d.get("assisted", False), d.get("verification", "file" if f else "message"),
               d.get("note", note), rating, evidence=ev, display=d.get("display", True), decided_by="zain")


def posts():
    """Published write-ups from _posts (dates from filenames, problem ID = first word of the title)."""
    out = []
    for p in sorted((SITE / "_posts").glob("????-??-??-*.md")):
        title = re.search(r'^title:\s*"?(.*?)"?\s*$', p.read_text(encoding="utf-8"), re.M)[1]
        out.append(dict(date=p.name[:10], slug=p.stem[11:], title=title, problem=title.split()[0]))
    return out


def titles(ids, fetch):
    path = SITE / "_data" / "cf_problems.json"
    cache = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    missing = sorted(set(ids) - set(cache))
    if missing and fetch:
        try:  # official Codeforces API; failure only leaves titles blank, it never blocks the sync
            with urllib.request.urlopen("https://codeforces.com/api/problemset.problems", timeout=60) as r:
                data = json.load(r)["result"]["problems"]
            names = {f"{p['contestId']}{p['index']}": p["name"] for p in data if "contestId" in p}
            cache.update({i: names[i] for i in missing if i in names})
        except Exception as e:  # noqa: BLE001 - network problems are reported, not fatal
            print(f"warning: Codeforces titles not fetched ({e})", file=sys.stderr)
    return cache


def stats(entries):
    """Distinct-problem statistics from displayed entries (definitions approved in planning).

    >>> e = [dict(type="solved", assisted=False, verification="file", problem="1A", date="2026-01-01", display=True),
    ...      dict(type="redo", assisted=False, verification="file", problem="1A", date="2026-01-02", display=True),
    ...      dict(type="solved", assisted=True, verification="file", problem="2B", date="2026-01-04", display=True)]
    >>> s = stats(e); (s["independent_total"], s["assisted_solves"], s["distinct_problems"], s["active_days"], s["longest_streak"]["days"])
    (['1A'], ['2B'], 2, 3, 2)
    """
    act = [e for e in entries if e["type"] != "milestone" and e["display"]]
    ver = [e for e in act if e["verification"] in ("file", "post")]
    key = lambda p: (int(re.match(r"\d+", p)[0]), p)
    pick = lambda f: sorted({e["problem"] for e in act if f(e)}, key=key)
    indep = pick(lambda e: e["type"] == "solved" and not e["assisted"] and e["verification"] == "file")
    up = pick(lambda e: e["type"] == "upsolved" and not e["assisted"] and e["verification"] == "file")
    assisted = sorted(set(pick(lambda e: e["type"] in ("solved", "upsolved") and e["assisted"])) - set(indep) - set(up), key=key)
    attempts = pick(lambda e: e["type"] == "attempted")
    redos = pick(lambda e: e["type"] == "redo" and e["verification"] == "file")
    practice = pick(lambda e: e["type"] == "practice")
    days = sorted({e["date"] for e in ver})
    best, span, run = 0, [None, None], 0
    for i, s in enumerate(days):
        run = run + 1 if i and (dt.date.fromisoformat(s) - dt.date.fromisoformat(days[i - 1])).days == 1 else 1
        if run > best:
            best, span = run, [days[i - run + 1], s]
    return dict(independent_solves=indep, independent_upsolves=up, independent_total=sorted(set(indep) | set(up), key=key),
                assisted_solves=assisted, assisted_attempts=attempts, redos=redos, practice_unverified=practice,
                distinct_problems=len(set(indep) | set(up) | set(assisted) | set(attempts) | set(redos)),
                verified_entries=len(ver), active_days=len(days), first_day=days[0] if days else None,
                longest_streak=dict(days=best, start=span[0], end=span[1]),
                highest_rating=max(([e["rating"], e["problem"]] for e in act if e.get("rating")), default=None))


def write(path, data):
    text = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    if not path.exists() or path.read_text(encoding="utf-8") != text:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8", newline="\n")
        return True
    return False


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--solutions", required=True, help="path to a full clone of comp-program-grind")
    ap.add_argument("--fetch-titles", action="store_true", help="fill missing titles from the Codeforces API")
    a = ap.parse_args(argv)
    repo = Path(a.solutions)
    decisions = json.loads((SITE / "_review" / "activity-decisions.json").read_text(encoding="utf-8"))
    entries, queue, unverified, ignored = classify(repo, decisions)
    head = git(repo, "rev-parse", "HEAD").strip()
    current = {file_pid(p): p for p in git(repo, "ls-tree", "-r", "--name-only", "HEAD").splitlines() if p.endswith(".cpp") and file_pid(p)}
    for e in entries:  # ratings and dates may also come from the problem's current file header
        hdr = header_fields(repo, head, current[e["problem"]]) if e["problem"] in current else {}
        if not e["rating"] and hdr.get("rating", "").isdigit():
            e["rating"], e["rating_source"] = int(hdr["rating"]), "solution header"
        elif e["rating"]:
            e["rating_source"] = "commit message"
        if e["type"] == "solved" and re.fullmatch(r"\d{4}-\d{2}-\d{2}", hdr.get("solved", "")) and hdr["solved"] <= e["date"]:
            e["date"], e["date_source"] = hdr["solved"], "solution header"
    for p in posts():
        entries.append(dict(key=f"site:{p['problem']}:published", date=p["date"], commit=None, short=None, evidence_commit=None,
                            problem=p["problem"], type="published", assisted=False, verification="post", file=None,
                            note="", rating=None, message=None, display=True, decided_by="rule", post=f"/posts/{p['slug']}/"))
    first_post = min((e for e in entries if e["type"] == "published"), key=lambda e: e["date"], default=None)
    if first_post:
        entries.append(dict(first_post, key="site:first-write-up:milestone", type="milestone", note="First write-up published", post=first_post["post"]))
    names = titles({e["problem"] for e in entries} | {u["problem"] for u in unverified}, a.fetch_titles)
    repo_url = re.search(r"^solutions_repo:\s*(\S+)", (SITE / "_config.yml").read_text(encoding="utf-8"), re.M)[1].rstrip("/")
    post_of = {e["problem"]: e["post"] for e in entries if e["type"] == "published"}
    for e in entries:
        e["title"] = names.get(e["problem"], "")
        e.setdefault("post", post_of.get(e["problem"]))
        # permalink pinned to the evidence commit: still valid after the file is later renamed or deleted
        e["source_url"] = f"{repo_url}/blob/{e['evidence_commit']}/{quote(e['file'])}" if e["file"] and e["evidence_commit"] else None
    keys = [e["key"] for e in entries]
    dupes = {k for k in keys if keys.count(k) > 1}
    if dupes:
        sys.exit(f"duplicate activity keys: {sorted(dupes)}")
    # milestones sort just before their entry, so the newest-first feed reads "solved X", then "milestone"
    entries.sort(key=lambda e: (e["date"], e.get("n", 10**9), e["type"] != "milestone", e["key"]))
    for i, e in enumerate(entries):  # chronological order for the feed (commit order within a day)
        e.pop("n", None)
        e["seq"] = i
    # Raw commit messages stay out of the published data (they can name unverified problems); the commit hash traces each entry.
    public = [{k: v for k, v in e.items() if k != "message"} for e in entries if e["display"]]
    changed = [write(SITE / "_data" / "activity.json", public),
               write(SITE / "_data" / "activity_stats.json", dict(stats(entries), log_start=git(repo, "log", "--reverse", "--format=%aI").split("\n", 1)[0][:10])),
               write(SITE / "_data" / "sync_state.json", dict(solutions_head=head, solutions_head_short=head[:7])),
               write(SITE / "_data" / "cf_problems.json", dict(sorted(names.items()))),
               write(SITE / "_review" / "activity-queue.json", queue),
               write(SITE / "_review" / "activity-unverified.json", unverified),
               write(SITE / "_review" / "activity-ignored.json", ignored)]
    print(f"{len(entries)} entries, {len(queue)} awaiting a decision, {sum(changed)} file(s) changed")
    return queue


if __name__ == "__main__":
    main()
