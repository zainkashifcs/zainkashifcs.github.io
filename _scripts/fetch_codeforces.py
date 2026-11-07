"""Cache Zain's public Codeforces profile in _data/codeforces.json for the site (no keys, public API only).

The handle comes from `codeforces_handle` in _config.yml. Three calls at most (user.info, user.rating, user.status),
two seconds apart as Codeforces asks. Outcomes recorded in the file's "status":
    ok              profile, rating history and accepted problems are summarised
    not-configured  no handle set; nothing is fetched
    not-found       the API says the handle does not exist
On a network or API failure the previous file is kept unchanged, so a bad run never blanks the site.

Usage:
    python _scripts/fetch_codeforces.py [--handle HANDLE] [--out PATH]
Self-check: python -m doctest _scripts/fetch_codeforces.py
"""
import argparse
import datetime as dt
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
API = "https://codeforces.com/api/"


def configured_handle():
    """The handle in _config.yml, or "" when unset."""
    m = re.search(r'^codeforces_handle:\s*"?([^"\n#]*)"?', (SITE / "_config.yml").read_text(encoding="utf-8"), re.M)
    return (m[1] if m else "").strip()


def call(method, **params):
    url = API + method + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "zains-blog-profile"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:  # Codeforces answers 400 with a JSON body for unknown handles
        return json.load(e)


def summarise(handle, info, rating, status, today):
    """Turn the three API results into the small summary the site reads.

    >>> info = {"rating": 1012, "maxRating": 1100, "rank": "newbie", "maxRank": "pupil"}
    >>> rating = [{"contestId": 1, "contestName": "Round 1", "ratingUpdateTimeSeconds": 1730000000, "newRating": 1012, "oldRating": 0, "rank": 900}]
    >>> subs = [{"verdict": "OK", "problem": {"contestId": 4, "index": "A", "rating": 800, "tags": ["math"]}},
    ...         {"verdict": "OK", "problem": {"contestId": 4, "index": "A", "rating": 800, "tags": ["math"]}},
    ...         {"verdict": "WRONG_ANSWER", "problem": {"contestId": 1, "index": "A", "rating": 1000, "tags": ["math"]}}]
    >>> s = summarise("me", info, rating, subs, "2026-11-07")
    >>> (s["status"], s["rating"], s["max_rank"], s["contests"], s["accepted"], s["by_rating"], s["tags"])
    ('ok', 1012, 'pupil', 1, ['4A'], {'800': 1}, {'math': 1})
    >>> s["history"][0]["date"]
    '2024-10-27'
    """
    accepted = {}
    for sub in status:
        p = sub.get("problem", {})
        if sub.get("verdict") == "OK" and p.get("contestId"):
            accepted[f"{p['contestId']}{p['index']}"] = p
    by_rating, tags = {}, {}
    for p in accepted.values():
        if p.get("rating"):
            by_rating[str(p["rating"])] = by_rating.get(str(p["rating"]), 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    return {
        "status": "ok", "handle": handle, "fetched": today,
        "rating": info.get("rating"), "max_rating": info.get("maxRating"),
        "rank": info.get("rank"), "max_rank": info.get("maxRank"),
        "contests": len(rating),
        "history": [{"contest": r["contestName"], "date": dt.datetime.fromtimestamp(r["ratingUpdateTimeSeconds"], dt.timezone.utc).date().isoformat(),
                     "rating": r["newRating"], "rank": r["rank"]} for r in rating],
        "accepted": sorted(accepted), "accepted_count": len(accepted),
        "by_rating": dict(sorted(by_rating.items(), key=lambda kv: int(kv[0]))),
        "tags": dict(sorted(tags.items(), key=lambda kv: (-kv[1], kv[0]))),
        "spark": spark([r["newRating"] for r in rating]),
    }


def spark(values, w=300, h=60):
    """SVG polyline points for a rating history, scaled into a w x h box (empty when there is no history).

    >>> spark([1000, 1200, 1100])
    '0,58 150,2 300,30'
    >>> spark([])
    ''
    """
    if not values:
        return ""
    lo, hi = min(values), max(values)
    span, step = (hi - lo) or 1, w / max(1, len(values) - 1)
    return " ".join(f"{round(i * step)},{round(h - 2 - (v - lo) / span * (h - 4))}" for i, v in enumerate(values))


def fetch(handle, today):
    if not handle:
        return {"status": "not-configured"}
    info = call("user.info", handles=handle)
    if info.get("status") != "OK":
        if "not found" in str(info.get("comment", "")).lower():
            return {"status": "not-found", "handle": handle, "checked": today}
        raise RuntimeError(f"user.info: {info.get('comment')}")
    time.sleep(2)
    rating = call("user.rating", handle=handle)
    time.sleep(2)
    status = call("user.status", handle=handle)
    for name, r in (("user.rating", rating), ("user.status", status)):
        if r.get("status") != "OK":
            raise RuntimeError(f"{name}: {r.get('comment')}")
    return summarise(handle, info["result"][0], rating["result"], status["result"], today)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--handle", help="override the handle in _config.yml (for testing)")
    ap.add_argument("--out", default=str(SITE / "_data/codeforces.json"))
    a = ap.parse_args(argv)
    out = Path(a.out)
    handle = a.handle if a.handle is not None else configured_handle()
    try:
        data = fetch(handle, dt.date.today().isoformat())
    except (OSError, ValueError, RuntimeError) as e:
        print(f"Codeforces unavailable ({e}); keeping {out.name} as it is")
        return 0
    old = json.loads(out.read_text(encoding="utf-8")) if out.exists() else None
    if data["status"] == "not-found" and old and old.get("status") == "not-found" and old.get("handle") == handle:
        data = old  # same answer as before; avoid a commit just for the date
    if data != old:
        out.write_text(json.dumps(data, indent=1) + "\n", encoding="utf-8", newline="\n")
    print(f"codeforces: {data['status']}" + (f" ({data.get('handle')})" if data.get("handle") else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
