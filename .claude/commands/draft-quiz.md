---
description: Draft quiz questions for newly solved problems (Claude Sonnet only; drafts are never published)
model: claude-sonnet-5-5
argument-hint: "[problem ID, e.g. 1790D] (optional; defaults to everything in the queue)"
allowed-tools: Read, Glob, Grep, Write, Edit, Bash(python _scripts/verify_quiz.py:*), Bash(python -B _scripts/verify_quiz.py:*), Bash(python _scripts/check_data.py), Bash(git -C ../comp-program-grind log:*), Bash(git -C ../comp-program-grind show:*)
---

You are drafting multiple-choice questions for Zain's Blog. This command must run on **Claude Sonnet**.
If you are not Claude Sonnet, stop immediately and tell Zain to restart with `claude --model sonnet`.
Never call the Anthropic API or any paid service, and never create API keys.

## 1. Find the work
Run `python _scripts/verify_quiz.py --solutions ../comp-program-grind --queue`.
If `$ARGUMENTS` names a problem ID, work only on that problem (it may already have drafts; add new ones).
Otherwise take every problem in the queue. If the queue is empty and no ID was given, say so and stop.

## 2. Read the real material for each problem
- The solution file in `../comp-program-grind` (path from the queue): its leading `//` comment lines are the notes, the rest is the code.
- The published post in `_posts/` if there is one, and the problem's entries in `_data/activity.json`.
- Existing drafts in `_review/quiz/<slug>.json` and live questions in `_data/quizzes/<slug>.json`: never repeat or change them.

## 3. Draft 4 to 6 questions per problem
Mix the kinds that genuinely fit this solution: `tracing`, `edge-case`, `complexity`, `data-structure`, `math`, `reasoning`.

Give every question a `"tags"` list naming the topics it actually tests. Use only ids from `_data/topics.json`, and only tags that the write-up's own front matter lists (its `// Tags:` header). One question may carry several tags; never add a tag the write-up does not have. `approve_quiz.py` and `check_data.py` refuse anything else.
Test understanding of the algorithm and its reasoning, not recall of the code.

Every question must be grounded. Use exactly one of these sources:
- `{"type": "note", "section": "Idea", "quote": "..."}`: a quote copied **character for character** from the notes.
- `{"type": "run", "detail": "..."}` with `"validation": {"method": "executed", "input": "...", "output": "..."}`:
  an input that matches the problem's input format, and the exact output you expect the solution to print.
  The verifier compiles and runs the real solution, so a wrong output is caught.
- `{"type": "code", "detail": "line N: ..."}`: a claim read directly from the code. These always need Zain's review.

Rules:
- Exactly one correct choice; distractors must be plausible but clearly wrong. For tracing questions, exactly one choice
  must equal the program's output.
- Complexity answers come from the notes when the notes state them (quote it); otherwise use a `code` source.
- Never invent ratings, dates, problem statements or facts that are not in the code, the notes or a verified run.
- Plain ASCII only in questions, choices and explanations (write `x`, `-`, `<=`, `O(n log n)`).
- Explanations: one or two sentences saying *why*, consistent with the code.

Append to `_review/quiz/<slug>.json` (create it as a JSON array if missing). Slug = the problem title lower-cased with
non-alphanumerics replaced by `-` (e.g. `1790D Matryoshkas` gives `1790d-matryoshkas`; the queue lists it).
Each question:
```json
{"id": "<slug>-q<next number>", "status": "draft", "origin": "claude-sonnet", "kind": "tracing", "tags": ["math"], "code": false,
 "question": "...", "choices": ["...", "...", "...", "..."], "answer": 1, "explanation": "...",
 "source": {"type": "run", "detail": "hand-made input"},
 "validation": {"method": "executed", "input": "1\n4\n1 2 2 3", "output": "2"}}
```
Use `"validation": {"method": "note"}` for note sources and `{"method": "code"}` for code sources.

## 4. Verify, fix, report
Run `python _scripts/verify_quiz.py --solutions ../comp-program-grind <slug>` and then `python _scripts/check_data.py`.
Fix or delete any draft that **failed** (your own new drafts only) and verify again.
Finish with a short table: id, kind, status, and what Zain should check for each `needs-review` draft.

## Never
- Never run `_scripts/approve_quiz.py`, never edit `_data/quizzes/`, never edit `_posts/`.
- Never change existing drafts written by someone else, or live questions.
- Never commit, push, or edit the solutions repository.
