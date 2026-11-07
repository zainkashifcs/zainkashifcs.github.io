---
title: About
permalink: /about/
description: Zain Kashif, a first-year Computer Science student at the University of Nottingham, documenting the climb from beginner towards a 1800 Codeforces rating.
---
{%- assign s = site.data.activity_stats -%}
{%- assign solved = site.data.problems | where: "solved", true -%}
<header class="page-head about-head">
  <h1>About</h1>
  <p class="lede">I&rsquo;m Zain, a first-year BSc Computer Science student at the University of Nottingham and an aspiring software engineer.</p>
</header>

<div class="about">
  <section aria-labelledby="interests-h">
    <h2 id="interests-h">What I&rsquo;m interested in</h2>
    <p>I&rsquo;m drawn to AI, machine learning and algorithmic optimisation, and more broadly to understanding how efficient algorithms and good engineering solve real problems. Competitive programming is where I practise the fundamentals behind all of that: reading a problem carefully, finding the idea, and writing code that is correct and fast enough.</p>
  </section>

  <section aria-labelledby="why-h">
    <h2 id="why-h">Why this site exists</h2>
    <p>I&rsquo;m documenting my journey from beginner towards a <strong>1800 Codeforces rating</strong>. This is a record of the journey, not just the results: the problems I solved, the ones I didn&rsquo;t, where I got stuck and what each one taught me.</p>
    <p>Everything here comes from my real practice. Each entry in the activity log is traced to a commit in my <a href="{{ site.solutions_repo }}">solutions repository</a>, problems I haven&rsquo;t solved say so, and help I had is labelled as help.</p>
  </section>

  <section aria-labelledby="expect-h">
    <h2 id="expect-h">What you&rsquo;ll find</h2>
    <dl class="about-list">
      <div><dt><a href="{{ '/#index' | relative_url }}">The problem archive</a></dt><dd>Every problem in the log with its status, Codeforces rating and topics, and a write-up where I&rsquo;ve written one.</dd></div>
      <div><dt><a href="{{ '/activity/' | relative_url }}">The activity log</a></dt><dd>A day-by-day record of practice since {{ s.log_start | date: "%-d %B %Y" }}.</dd></div>
      <div><dt><a href="{{ '/quiz/' | relative_url }}">Quizzes</a></dt><dd>Questions on the problems I&rsquo;ve solved, checked by running my solutions, for revising by topic and difficulty.</dd></div>
      <div><dt><a href="{{ '/roadmap/' | relative_url }}">The roadmap</a></dt><dd>The route from fundamentals to the topics an 1800 rating needs, with what I&rsquo;ve practised so far and what is still ahead.</dd></div>
      <div><dt><a href="{{ '/journal/' | relative_url }}">The journal</a></dt><dd>Monthly progress notes: what I studied, what went well and what to work on next.</dd></div>
      <div><dt><a href="{{ '/projects/' | relative_url }}">Projects</a></dt><dd>The software I&rsquo;ve built beyond competitive programming, including this site.</dd></div>
    </dl>
  </section>

  <section aria-labelledby="now-h">
    <h2 id="now-h">So far</h2>
    <p class="about-facts">{{ solved.size }} of the {{ site.data.problems.size }} problems in the log solved ({{ s.assisted_solves.size }} with help), over {{ s.active_days }} active days. The log updates itself from my solutions repository.</p>
    <p><a href="https://github.com/zainkashifcs">GitHub</a></p>
  </section>
</div>
