"""Create or update a blog post from a solution .cpp file.

Usage:
    python make_post.py "../comp-program-grind/CF Questions/1_A_Theatre_Square.cpp"

The .cpp file starts with comment lines like these (any section can be left out;
extra // lines continue the section above them). Write notes naturally: each line
becomes its own paragraph, a sentence you wrap onto the next line stays together,
a blank // line adds a break, and "- ", "1. ", "# ", code and maths lines stay separate:

    // Problem: 1A Theatre Square
    // Link: https://codeforces.com/problemset/problem/1/A
    // Tags: math, implementation
    // Rating: 1000            (optional, only if a source states it)
    // Summary: ...            (optional; otherwise the site uses the first Lesson paragraph)
    // Solved: 2026-10-14      (optional; otherwise the site uses the commit date)
    // Status: attempted       (optional: solved, attempted or unsolved; not solved shows "Sorry, not solved.")
    // Idea: ...
    // Stuck: ...
    // Lesson: ...

Self-check: python -m doctest make_post.py
"""
import datetime
import json
import re
import sys
from pathlib import Path

KEYS = ("Problem", "Link", "Tags", "Rating", "Summary", "Solved", "Status", "Idea", "Stuck", "Lesson")
SECTIONS = {"Idea": "Idea", "Stuck": "Where I got stuck", "Lesson": "Lesson"}
POSTS = Path(__file__).parent / "_posts"


def parse(source):
    """Split a .cpp file into its header fields and the code below the header.

    >>> parse("// old note\\n// Problem: 1A\\n// Idea: a\\n//   b\\n\\nint main() {}\\n")
    ({'Problem': '1A', 'Idea': 'a\\nb'}, 'int main() {}\\n')
    """
    lines = source.splitlines(keepends=True)
    fields, key, i = {}, None, 0
    while i < len(lines) and lines[i].lstrip().startswith("//"):
        text = lines[i].strip()[2:].strip()
        match = re.match(rf"({'|'.join(KEYS)}):\s*(.*)", text)
        if match:
            key = match[1]
            fields[key] = match[2]
        elif key:  # lines before the first known key are ignored
            fields[key] += "\n" + text
        i += 1
    return fields, "".join(lines[i:]).lstrip("\n")


def kind(line):
    """Classify one note line; only "text" lines can be continued by the next line."""
    if not line:
        return "blank"
    if re.match(r"#+\s", line):
        return "heading"
    if re.match(r"[-*+]\s", line):
        return "bullet"
    if re.match(r"\d+[.)]\s", line):
        return "numbered"
    # "#include ..." or a statement/brace line such as "std::sort(v.begin(), v.end());"
    if re.match(r"#\w", line) or (re.search(r"[;{}]$", line) and re.search(r"::|[(\[=]", line)):
        return "code"
    if re.search(r"[=<>≤≥]", line):
        return "math"
    if len(line.split()) <= 3 and line[-1] not in ".!?:;,":
        return "label"  # e.g. "Key insight": never swallows the line below it
    return "text"


def paragraphs(text):
    r"""Turn a header section into Markdown, keeping the structure it was written with.

    Each line is its own paragraph, except that a prose line which doesn't finish its
    sentence (no . ! ? : ; at the end) is joined by the next prose line. Blank lines,
    headings, lists, code and maths lines always stand alone.

    Finished lines and blank lines both start paragraphs:
    >>> print(paragraphs("First idea.\nSecond idea.\n\nAfter a blank line."))
    First idea.
    <BLANKLINE>
    Second idea.
    <BLANKLINE>
    After a blank line.

    A sentence wrapped over several lines stays together, even before a number:
    >>> print(paragraphs("The answer can reach\n1e18, so an int\nwould overflow."))
    The answer can reach 1e18, so an int would overflow.

    A short label without punctuation keeps its own line:
    >>> print(paragraphs("Key insight\nn is small, so brute force works."))
    Key insight
    <BLANKLINE>
    n is small, so brute force works.

    Headings (demoted below the section's own heading) and lists, which stay tight:
    >>> print(paragraphs("# Plan\nSteps:\n- read input\n- sort it\n1. first\n2. second"))
    ### Plan
    <BLANKLINE>
    Steps:
    <BLANKLINE>
    - read input
    - sort it
    <BLANKLINE>
    1. first
    2. second

    Maths and code lines never merge with the lines around them:
    >>> print(paragraphs("Tiles per side is\nceil = (n + a - 1) / a\nNo loop needed."))
    Tiles per side is
    <BLANKLINE>
    ceil = (n + a - 1) / a
    <BLANKLINE>
    No loop needed.
    >>> print(paragraphs("Then sort with\nstd::sort(v.begin(), v.end());\n#include <map>"))
    Then sort with
    <BLANKLINE>
    `std::sort(v.begin(), v.end());`
    <BLANKLINE>
    `#include <map>`
    """
    blocks = []  # [kind, text]
    for line in text.split("\n"):
        k = kind(line)
        if k == "heading":
            line = "### " + line.lstrip("#").strip()
        elif k == "code" and "`" not in line:
            line = f"`{line}`"  # stops Markdown reading * _ < # inside code
        prev = blocks[-1] if blocks else None
        if prev and prev[0] == "text" and k in ("text", "label") and prev[1][-1] not in ".!?:;":
            prev[1] += " " + line
        else:
            blocks.append([k, line])
    out, last = "", None
    for k, line in blocks:
        if k != "blank":  # items of the same list stay on adjacent lines (a tight list)
            out += ("\n" if k == last in ("bullet", "numbered") else "\n\n" if out else "") + line
        last = k
    return out


def extras(fields):
    """Optional Rating / Summary / Solved front matter, validated; absent fields are left out entirely.

    >>> extras({"Rating": "1000", "Summary": "Use integer\\nrounding.", "Solved": "2026-10-14"})
    {'rating': 1000, 'summary': 'Use integer rounding.', 'solved': '2026-10-14'}
    >>> extras({})
    {}
    >>> extras({"Status": "Attempted"})
    {'status': 'attempted'}
    >>> extras({"Status": "nearly"})
    Traceback (most recent call last):
    SystemExit: Status must be solved, attempted or unsolved, got 'nearly'
    >>> extras({"Rating": "about 1000"})
    Traceback (most recent call last):
    ...
    SystemExit: Rating must be a whole number, got 'about 1000'
    """
    out = {}
    if fields.get("Rating"):
        if not fields["Rating"].strip().isdigit():
            sys.exit(f"Rating must be a whole number, got {fields['Rating']!r}")
        out["rating"] = int(fields["Rating"])
    if fields.get("Summary"):
        out["summary"] = " ".join(fields["Summary"].split())
    if fields.get("Solved"):
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", fields["Solved"].strip()):
            sys.exit(f"Solved must be a date like 2026-10-14, got {fields['Solved']!r}")
        out["solved"] = fields["Solved"].strip()
    if fields.get("Status"):
        st = fields["Status"].strip().lower()
        if st not in ("solved", "attempted", "unsolved"):
            sys.exit(f"Status must be solved, attempted or unsolved, got {fields['Status']!r}")
        out["status"] = st
    return out


def main(cpp):
    cpp = Path(cpp).resolve()
    fields, code = parse(cpp.read_text(encoding="utf-8"))
    if not fields.get("Problem"):
        sys.exit(f"{cpp.name}: needs a '// Problem: ...' line at the top")
    repo = next((p for p in cpp.parents if (p / ".git").exists()), None)
    if repo is None:
        sys.exit(f"{cpp} is not inside a git repo, so the solution link can't be built")

    title = fields["Problem"]
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    existing = sorted(POSTS.glob(f"????-??-??-{slug}.md"))
    path = existing[0] if existing else POSTS / f"{datetime.date.today()}-{slug}.md"

    front = {
        "title": title,
        "link": fields.get("Link"),
        "tags": [t.strip() for t in fields.get("Tags", "").split(",") if t.strip()],
        "solution": cpp.relative_to(repo).as_posix(),
        **extras(fields),
    }
    # JSON strings are valid YAML, so quotes and colons in titles are safe.
    out = ["---", *(f"{k}: {json.dumps(v)}" for k, v in front.items() if v), "---"]
    out.append("{% raw %}")  # stops Jekyll reading C++ like {{1, 2}} as Liquid
    for key, heading in SECTIONS.items():
        if fields.get(key):
            out += [f"## {heading}", "", paragraphs(fields[key]), ""]
    out += ["## Code", "", "```cpp", code.rstrip(), "```", "{% endraw %}", ""]

    path.write_text("\n".join(out), encoding="utf-8", newline="\n")
    print(f"{'Updated' if existing else 'Created'} {path}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
