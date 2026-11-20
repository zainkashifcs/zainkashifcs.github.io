"""Build the problem archive (_data/problems.json) and a page stub for every problem without a write-up.

Sources, nothing else:
  _data/activity.json, _data/activity_stats.json  the verified practice log (status, dates, evidence)
  _posts/*.md                                       Zain's write-ups (their tags and optional status win)
  _data/cf_meta.json                                Codeforces' public problem metadata (name, rating, tags),
                                                    refreshed with --fetch (one problemset.problems call)

Usage:
    python _scripts/build_problems.py [--fetch]
Self-check: python -m doctest _scripts/build_problems.py
"""
import argparse
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SITE / "_scripts"))
from check_data import front_matter  # noqa: E402

FENCE = "`" * 3

# Codeforces tag -> topic id in _data/topics.json. Tags without a topic are still shown, just not offered for quizzes.
CF_TOPICS = {
    "implementation": "implementation", "strings": "strings", "greedy": "greedy", "sortings": "sorting",
    "brute force": "brute-force", "math": "math", "geometry": "geometry", "data structures": "data-structures",
    "dp": "dp", "binary search": "binary-search", "hashing": "hashing", "number theory": "number-theory",
    "two pointers": "two-pointers", "graphs": "graphs", "dfs and similar": "bfs-dfs", "trees": "trees",
    "combinatorics": "combinatorics", "probabilities": "probability",
}
LABELS = {"solved": "Solved", "redo": "Solved (redo)", "help": "Solved with help", "attempted": "Attempted", "unsolved": "Not solved"}
GENERATED = "generated: build_problems.py"


def slugify(text):
    """
    >>> slugify("1790D Matryoshkas")
    '1790d-matryoshkas'
    >>> slugify("1703A YES or YES?")
    '1703a-yes-or-yes'
    """
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def status_of(pid, stats, types, post_status):
    """Status from the verified log; a write-up's own `status` front matter wins.

    >>> s = {"independent_total": ["1A"], "assisted_solves": ["158A"], "redos": ["69A"]}
    >>> [status_of(p, s, t, None) for p, t in [("1A", {"solved"}), ("158A", {"solved"}), ("69A", {"redo"}),
    ...                                         ("1791D", {"attempted", "practice"}), ("9Z", {"practice"})]]
    ['solved', 'help', 'redo', 'attempted', 'unsolved']
    >>> status_of("1A", s, {"solved"}, "attempted")
    'attempted'
    """
    if post_status:
        return post_status
    if pid in stats["independent_total"]:
        return "solved"
    if pid in stats["assisted_solves"]:
        return "help"
    if pid in stats["redos"]:
        return "redo"
    return "attempted" if "attempted" in types else "unsolved"


def topics_for(cf_tags, post_tags, vocab):
    """Quiz topics a problem supports: its write-up's tags plus its Codeforces tags, mapped to the vocabulary.

    >>> topics_for(["sortings", "*special", "greedy"], ["math"], {"sorting", "greedy", "math"})
    ['greedy', 'math', 'sorting']
    """
    found = {CF_TOPICS[t] for t in cf_tags if t in CF_TOPICS} | set(post_tags)
    return sorted(t for t in found if t in vocab)


def months(acts, problems):
    """Per-month facts from the verified log (newest first): problems first solved, attempted, active days.

    >>> a = [dict(problem="1A", type="solved", date="2026-10-14", verification="file"),
    ...      dict(problem="2B", type="attempted", date="2026-10-15", verification="file", assisted=True),
    ...      dict(problem="3C", type="practice", date="2026-11-02", verification="message")]
    >>> p = [dict(id="1A", solved_date="2026-10-14", status="solved"), dict(id="2B", solved_date=None, status="attempted"),
    ...      dict(id="3C", solved_date=None, status="unsolved")]
    >>> [(m["month"], m["solved"], m["attempted"], m["active_days"]) for m in months(a, p)]
    [('2026-11', [], [], 0), ('2026-10', ['1A'], ['2B'], 2)]
    """
    by = {}
    for e in acts:
        m = by.setdefault(e["date"][:7], {"days": set(), "attempted": set()})
        if e["verification"] != "message":
            m["days"].add(e["date"])
            if e["type"] == "attempted":
                m["attempted"].add(e["problem"])
    solved = {}
    for p in problems:
        if p.get("solved_date"):
            solved.setdefault(p["solved_date"][:7], []).append(p["id"])
    out = []
    for month in sorted(set(by) | set(solved), reverse=True):
        m = by.get(month, {"days": set(), "attempted": set()})
        got = sorted(solved.get(month, []))
        out.append({"month": month, "solved": got, "attempted": sorted(m["attempted"] - set(got)), "active_days": len(m["days"])})
    return out


def fetch_cf_meta(ids):
    """One public API call (no key needed); keep only the archive's problems."""
    req = urllib.request.Request("https://codeforces.com/api/problemset.problems", headers={"User-Agent": "zains-blog-archive"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.load(r)
    if data.get("status") != "OK":
        raise SystemExit(f"Codeforces API: {data.get('comment')}")
    out = {}
    for p in data["result"]["problems"]:
        pid = f"{p.get('contestId', '')}{p.get('index', '')}"
        if pid in ids:
            out[pid] = {"name": p["name"], "rating": p.get("rating"), "tags": p.get("tags", [])}
    return out


def split_solution(text):
    r"""Leading // comment lines (Zain's notes, minus a bare "CF 4A ..." title line) and the code below them.

    >>> split_solution("// CF 4A Watermelon\n// Insight: even + even.\n\n#include <iostream>\nint main() {}\n")
    ('Insight: even + even.', '#include <iostream>\nint main() {}')
    >>> split_solution("int main() {}")
    ('', 'int main() {}')
    """
    lines, notes = text.splitlines(), []
    while lines and lines[0].lstrip().startswith("//"):
        notes.append(lines.pop(0).strip()[2:].strip())
    if notes and re.match(r"CF\s*\w+", notes[0]):
        if len(notes[0]) < 60 and not notes[0].endswith("."):
            notes.pop(0)          # a bare title line repeats the page heading
        else:
            notes.insert(1, "")   # a longer first line (e.g. with a note in brackets) keeps its own paragraph
    return "\n".join(notes).strip(), "\n".join(lines).strip()


def page_body(p, text):
    """Markdown body of a problem page: the notes and code from the solution file, verbatim."""
    from make_post import paragraphs
    notes, code = split_solution(text)
    parts = ["{% raw %}"]
    if notes:
        parts += ["## My notes", "", paragraphs(notes), ""]
    if code:
        parts += ["## Code" if p["solved"] else "## Attempt (not counted as solved)", "", FENCE + "cpp", code, FENCE, ""]
    parts.append("{% endraw %}")
    return "\n".join(parts) + "\n"


def build(fetch=False, solutions=None):
    acts = [e for e in json.loads((SITE / "_data/activity.json").read_text(encoding="utf-8")) if e["type"] != "milestone" and e.get("display", True)]
    stats = json.loads((SITE / "_data/activity_stats.json").read_text(encoding="utf-8"))
    vocab = {t["id"] for g in json.loads((SITE / "_data/topics.json").read_text(encoding="utf-8")) for t in g["topics"]}
    ids = sorted({e["problem"] for e in acts})
    meta_path = SITE / "_data/cf_meta.json"
    if fetch:
        meta = fetch_cf_meta(set(ids))
        meta_path.write_text(json.dumps(meta, indent=1, sort_keys=True) + "\n", encoding="utf-8", newline="\n")
        time.sleep(2)  # Codeforces asks for at most one call every two seconds
    meta = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}
    posts = {}
    for p in (SITE / "_posts").glob("????-??-??-*.md"):
        fm = front_matter(p)
        posts[str(fm.get("title", "")).split(" ")[0]] = dict(fm, slug=p.stem[11:])
    out, warnings = [], []
    for pid in ids:
        items = sorted((e for e in acts if e["problem"] == pid), key=lambda e: e["seq"])
        m, post = meta.get(pid, {}), posts.get(pid)
        name = m.get("name") or items[-1]["title"]
        st = status_of(pid, stats, {e["type"] for e in items}, (post or {}).get("status"))
        evidence = [e for e in items if e["verification"] != "message"]
        solves = [e for e in evidence if e["type"] in ("solved", "upsolved", "redo") and not e.get("assisted")]
        proof = (solves or evidence or items)[-1]
        recorded = sorted({e["rating"] for e in items if e.get("rating")})
        if m.get("rating") and recorded and recorded != [m["rating"]]:
            warnings.append(f"{pid}: recorded rating {recorded} differs from Codeforces {m['rating']}")
        slug = post["slug"] if post else slugify(f"{pid} {name}")
        out.append({
            "id": pid, "name": name, "slug": slug, "status": st, "status_label": LABELS[st],
            "solved": st in ("solved", "redo", "help"), "eligible": st == "solved",
            "rating": m.get("rating") or (post or {}).get("rating") or (recorded[0] if len(recorded) == 1 else None),
            "rating_source": "codeforces" if m.get("rating") else ("recorded" if recorded or (post or {}).get("rating") else None),
            "cf_tags": [t for t in m.get("tags", []) if not t.startswith("*")],
            "topics": topics_for(m.get("tags", []), (post or {}).get("tags") or [], vocab),
            "first_date": items[0]["date"], "last_date": items[-1]["date"],
            "solved_date": solves[0]["date"] if solves else None,
            "solution_file": proof.get("file"), "solution_url": proof.get("source_url"),
            "post": f"/posts/{post['slug']}/" if post else None,
            "page": None if post else f"/problems/{slug}/",
            "link": "https://codeforces.com/problemset/problem/{}/{}".format(*re.match(r"(\d+)(\w+)", pid).groups()),
        })
    out.sort(key=lambda p: (p["last_date"], p["id"]), reverse=True)
    (SITE / "_data/months.json").write_text(json.dumps(months(acts, out), indent=1) + "\n", encoding="utf-8", newline="\n")
    (SITE / "_data/problems.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    # one stub page per problem without a write-up; stale generated stubs (e.g. a write-up appeared) are removed
    stubs = SITE / "_problems"
    stubs.mkdir(exist_ok=True)
    want = {p["slug"]: p for p in out if p["page"]}
    for f in stubs.glob("*.md"):
        if f.stem not in want and GENERATED in f.read_text(encoding="utf-8"):
            f.unlink()
    if solutions:
        sys.path.insert(0, str(SITE))
        from verify_quiz import solution_file
    for slug, p in want.items():
        f = stubs / f"{slug}.md"
        head = f"---\n# {GENERATED}\npid: \"{p['id']}\"\ntitle: \"{p['id']} {p['name']}\"\n---\n"
        body = f.read_text(encoding="utf-8").split("---\n", 2)[2] if f.exists() else ""  # kept when no solutions path is given
        if solutions:
            cpp = solution_file(solutions, p["id"])
            body = page_body(p, cpp.read_text(encoding="utf-8")) if cpp else ""
        text = head + body
        if not f.exists() or f.read_text(encoding="utf-8") != text:
            f.write_text(text, encoding="utf-8", newline="\n")
    return out, warnings


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--fetch", action="store_true", help="refresh _data/cf_meta.json from the Codeforces API")
    ap.add_argument("--solutions", help="path to the solutions repository (read only): adds notes and code to problem pages")
    a = ap.parse_args()
    probs, warns = build(a.fetch, a.solutions)
    print("\n".join("warning: " + w for w in warns))
    by = {}
    for p in probs:
        by[p["status"]] = by.get(p["status"], 0) + 1
    print(f"{len(probs)} problems: {by}; {sum(1 for p in probs if p['page'])} problem pages, {sum(1 for p in probs if p['eligible'])} eligible for quizzes")
