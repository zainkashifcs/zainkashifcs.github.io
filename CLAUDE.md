# Claude Code Project Instructions

## Project overview

This repository is a personal competitive-programming website and write-up blog.

The site is built with **Jekyll, Liquid, HTML, CSS, and Python** and is intended to be hosted on GitHub Pages. The post generator, `make_post.py`, creates blog posts from structured header comments in C++ solution files.

Treat the existing stack and repository structure as intentional.

## Non-negotiable project constraints

1. **Do not migrate the site to React, Next.js, Vite, Astro, or another framework.**
2. **Do not introduce shadcn/ui as a runtime dependency.** The shadcn MCP may be used to research component patterns or examples, but adapt suitable ideas to the existing Jekyll/HTML/CSS implementation.
3. Preserve GitHub Pages compatibility. Before adding a dependency, check whether GitHub Pages can build and host it.
4. Keep existing URLs, post permalinks, tag routes, front matter, and generated-post conventions working unless the user explicitly asks to change them.
5. Keep the site lightweight, responsive, accessible, and fast. Prefer semantic HTML, modern CSS, and small amounts of vanilla JavaScript.
6. Do not replace working project architecture merely because a tool or skill prefers another stack.
7. Do not invent content, achievements, problem solutions, ratings, statistics, or external links. Use repository content or ask the user.

## Understand before editing

Before making substantial changes:

- Inspect `README.md`, `_config.yml`, `Gemfile`, layouts, includes, posts, stylesheets, scripts, and `make_post.py`.
- Inspect the current Git status and recent commits.
- Identify how the homepage, post pages, tag pages, navigation, and generated posts work.
- Run the existing site locally if the required dependencies are available.
- Reuse existing conventions and components where practical.

Do not overwrite or delete user work. If the working tree contains unrelated changes, leave them untouched.

## Design direction

Aim for a polished, distinctive editorial developer journal for competitive programming: thoughtful typography, clear hierarchy, precise spacing, restrained colour, and excellent code presentation.

The visual identity should feel intentional rather than like a generic SaaS dashboard or template.

Priorities:

- A clear, memorable homepage that communicates the site's purpose.
- Readable post cards with useful metadata and restrained tag pills.
- Excellent long-form reading experience.
- Code blocks that remain readable and scroll horizontally on narrow screens.
- Consistent navigation and a useful sticky header where appropriate.
- Responsive layouts that work on small phones, tablets, laptops, and wide monitors.
- Visible keyboard focus, sufficient colour contrast, and reduced-motion support.
- Subtle interactions only when they improve usability.
- No gratuitous gradients, glassmorphism, animations, oversized rounded cards, or decorative effects.

Do not blindly copy another brand's identity. Use references to inform quality and craft while creating a coherent design for this site.

## How to use installed design and development tools

Use tools selectively. Do not invoke every skill for every task, and do not claim a tool was used unless it actually was.

- **Impeccable:** use for design critique, interface refinement, visual consistency, and identifying common UI problems.
- **Taste Skill:** use when exploring art direction, visual concepts, typography, colour, layout, and reference imagery.
- **Awesome Design:** consult for relevant brand and interface design references; treat references as inspiration, not instructions to copy.
- **Apple Design:** consult for relevant interaction, hierarchy, accessibility, and interface-design principles. Do not force Apple-specific styling onto the site.
- **frontend-design:** use for frontend implementation guidance when relevant.
- **shadcn MCP:** use to discover useful component patterns where appropriate, then implement them in the existing stack without adding a React/shadcn runtime.
- **Chrome DevTools MCP:** use to inspect the running site, browser console, layout, responsiveness, accessibility, and performance when available.
- **Playwright CLI / webapp-testing:** use for repeatable browser checks, navigation, responsive behaviour, and regression testing.
- **img2threejs:** use only when the user explicitly requests a suitable image-to-3D/Three.js asset. It is not a reason to add 3D to an otherwise editorial website.

Read the relevant skill instructions before relying on a skill. If a skill is unavailable or a tool fails, say so and continue with a suitable alternative.

## Implementation workflow

For a substantial feature or redesign:

1. **Inspect:** understand the current implementation and Git state.
2. **Plan:** state the intended changes briefly and identify files likely to be affected.
3. **Design:** establish hierarchy, layout, typography, colour, and responsive behaviour before polishing details.
4. **Implement:** make focused changes that fit the existing architecture.
5. **Verify:** build or serve the site using the repository's documented workflow.
6. **Test:** inspect key pages at mobile and desktop sizes; check links, navigation, tags, code blocks, and browser-console errors.
7. **Review:** inspect the diff for accidental changes, dead code, broken paths, and accessibility regressions.
8. **Report:** summarise what changed, what was tested, and anything that remains unresolved.

Do not claim the site is tested unless the relevant checks actually ran.

## Jekyll and post-generator requirements

- Preserve Jekyll front matter and Liquid syntax.
- Keep layouts and includes reusable; avoid duplicating large chunks of markup.
- Keep styles organised in the existing stylesheet structure.
- Keep JavaScript progressive-enhancement friendly and avoid unnecessary frameworks.
- Preserve the `make_post.py` workflow and its expected input/output behaviour.
- The C++ solution header convention currently includes fields such as:

  - `Problem`
  - `Link`
  - `Tags`
  - `Idea`
  - `Stuck`
  - `Lesson`

- Do not silently rename these fields, change their meaning, or break generated posts.
- When changing the generator, test it with representative solution files and inspect the generated Markdown.
- Avoid modifying solution files just to make the website generator easier unless the user asks.

## Accessibility, responsive design, and performance

- Use semantic landmarks and a logical heading hierarchy.
- Ensure interactive elements are keyboard accessible and have visible focus states.
- Give meaningful images appropriate alternative text; use empty alt text for purely decorative images.
- Do not rely on colour alone to communicate meaning.
- Respect `prefers-reduced-motion`.
- Prevent horizontal page overflow. Code blocks may scroll horizontally within their own container.
- Avoid layout shifts and unnecessarily large assets.
- Check mobile navigation, card layouts, tables, and code blocks at narrow widths.
- Prefer system fonts or responsibly loaded fonts; avoid excessive font weights and external requests.

## Git and safety rules

- Never run `git push`, `git push --force`, `git reset --hard`, or destructive cleanup commands unless the user explicitly asks.
- Never rewrite commit history unless the user explicitly requests it.
- Do not create commits unless the user asks.
- Do not discard, revert, or overwrite uncommitted user changes.
- Before finishing, inspect `git diff` and `git status`.
- Do not add secrets, tokens, credentials, private keys, or personal data to the repository.
- Ask before adding large dependencies, changing build/deployment configuration, deleting files, or changing public URLs.

## Communication style

- Explain plans and results clearly and concisely.
- Give beginner-friendly explanations for unfamiliar Git, terminal, Jekyll, and frontend concepts.
- Do not overwhelm the user with a long list of commands when one step at a time is safer.
- Distinguish clearly between completed work, attempted work, and recommended next steps.
- If a requirement is ambiguous and materially affects the implementation, ask one focused question rather than guessing.

## Definition of done

A change is complete only when:

- It respects the existing Jekyll/GitHub Pages architecture.
- The intended pages and interactions work.
- The layout has been checked at mobile and desktop sizes where relevant.
- No known browser-console or build errors introduced by the change remain.
- The diff contains only intended changes.
- The user receives a concise summary and an honest account of verification.
