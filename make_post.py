"""Create or update a blog post from a solution .cpp file.

Usage:
    python make_post.py "../comp-program-grind/CF Questions/1_A_Theatre_Square.cpp"

The .cpp file starts with comment lines like these (any section can be left out;
extra // lines continue the section above them):

    // Problem: 1A Theatre Square
    // Link: https://codeforces.com/problemset/problem/1/A
    // Tags: math, implementation
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

KEYS = ("Problem", "Link", "Tags", "Idea", "Stuck", "Lesson")
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
    }
    # JSON strings are valid YAML, so quotes and colons in titles are safe.
    out = ["---", *(f"{k}: {json.dumps(v)}" for k, v in front.items() if v), "---"]
    out.append("{% raw %}")  # stops Jekyll reading C++ like {{1, 2}} as Liquid
    for key, heading in SECTIONS.items():
        if fields.get(key):
            out += [f"## {heading}", "", fields[key], ""]
    out += ["## Code", "", "```cpp", code.rstrip(), "```", "{% endraw %}", ""]

    path.write_text("\n".join(out), encoding="utf-8", newline="\n")
    print(f"{'Updated' if existing else 'Created'} {path}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
