# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build (tsc -b && vite build)
npm run preview   # Preview production build locally
```

No test runner or linter is configured.

## Architecture

**ElectroMontage** — a React SPA for an electrical services business (Russian language). Built with Vite + TypeScript (strict mode) + Tailwind CSS.

### Stack

- React 18 with React Router DOM 7 (two routes: `/` home, `/services/:id` detail)
- Framer Motion for animations and page transitions (AnimatePresence)
- Flubber for SVG path morphing (Preloader bulb explosion)
- Canvas-based particle systems (Hero electric particles)
- React Helmet Async for per-page SEO meta tags and JSON-LD schemas
- Swiper for carousels

### Key Patterns

- **Theming**: Dark/light via CSS custom properties + React Context (`src/context/ThemeContext.tsx`). Persisted to localStorage. Accent color: `#f59e0b`. Theme transitions use 600ms cubic-bezier easing applied globally.
- **Service data**: Centralized in `src/data/services.ts` — array of 6 services with icons, descriptions, and pricing. Service pages are dynamically routed by ID.
- **Animations**: Framer Motion `useInView` for scroll-triggered animations. Custom Canvas renderers in Hero and Preloader components. SVG morphing via flubber in Preloader.
- **SEO**: Structured data schemas (LocalBusiness, FAQPage, Service, BreadcrumbList) spread across `index.html`, `App.tsx`, and `ServicePage.tsx`.
- **Navigation**: Header handles both hash-anchor scrolling (home sections) and route navigation, detecting current route to choose behavior.

### Source Layout

- `src/main.tsx` — Entry point (BrowserRouter + ThemeProvider)
- `src/App.tsx` — Route definitions, page transitions, FAQPage schema
- `src/components/` — All UI components (Header, Hero, Services, Portfolio, etc.)
- `src/context/ThemeContext.tsx` — Theme provider and `useTheme` hook
- `src/data/services.ts` — Service definitions (interface + data array)
- `src/pages/ServicePage.tsx` — Dynamic service detail page with SEO schemas
- `src/index.css` — CSS variables for both themes, Tailwind directives, global utilities

# context-mode — MANDATORY routing rules

You have context-mode MCP tools available. These rules are NOT optional — they protect your context window from flooding. A single unrouted command can dump 56 KB into context and waste the entire session.

## BLOCKED commands — do NOT attempt these

### curl / wget — BLOCKED
Any Bash command containing `curl` or `wget` is intercepted and replaced with an error message. Do NOT retry.
Instead use:
- `ctx_fetch_and_index(url, source)` to fetch and index web pages
- `ctx_execute(language: "javascript", code: "const r = await fetch(...)")` to run HTTP calls in sandbox

### Inline HTTP — BLOCKED
Any Bash command containing `fetch('http`, `requests.get(`, `requests.post(`, `http.get(`, or `http.request(` is intercepted and replaced with an error message. Do NOT retry with Bash.
Instead use:
- `ctx_execute(language, code)` to run HTTP calls in sandbox — only stdout enters context

### WebFetch — BLOCKED
WebFetch calls are denied entirely. The URL is extracted and you are told to use `ctx_fetch_and_index` instead.
Instead use:
- `ctx_fetch_and_index(url, source)` then `ctx_search(queries)` to query the indexed content

## REDIRECTED tools — use sandbox equivalents

### Bash (>20 lines output)
Bash is ONLY for: `git`, `mkdir`, `rm`, `mv`, `cd`, `ls`, `npm install`, `pip install`, and other short-output commands.
For everything else, use:
- `ctx_batch_execute(commands, queries)` — run multiple commands + search in ONE call
- `ctx_execute(language: "shell", code: "...")` — run in sandbox, only stdout enters context

### Read (for analysis)
If you are reading a file to **Edit** it → Read is correct (Edit needs content in context).
If you are reading to **analyze, explore, or summarize** → use `ctx_execute_file(path, language, code)` instead. Only your printed summary enters context. The raw file content stays in the sandbox.

### Grep (large results)
Grep results can flood context. Use `ctx_execute(language: "shell", code: "grep ...")` to run searches in sandbox. Only your printed summary enters context.

## Tool selection hierarchy

1. **GATHER**: `ctx_batch_execute(commands, queries)` — Primary tool. Runs all commands, auto-indexes output, returns search results. ONE call replaces 30+ individual calls.
2. **FOLLOW-UP**: `ctx_search(queries: ["q1", "q2", ...])` — Query indexed content. Pass ALL questions as array in ONE call.
3. **PROCESSING**: `ctx_execute(language, code)` | `ctx_execute_file(path, language, code)` — Sandbox execution. Only stdout enters context.
4. **WEB**: `ctx_fetch_and_index(url, source)` then `ctx_search(queries)` — Fetch, chunk, index, query. Raw HTML never enters context.
5. **INDEX**: `ctx_index(content, source)` — Store content in FTS5 knowledge base for later search.

## Subagent routing

When spawning subagents (Agent/Task tool), the routing block is automatically injected into their prompt. Bash-type subagents are upgraded to general-purpose so they have access to MCP tools. You do NOT need to manually instruct subagents about context-mode.

## Output constraints

- Keep responses under 500 words.
- Write artifacts (code, configs, PRDs) to FILES — never return them as inline text. Return only: file path + 1-line description.
- When indexing content, use descriptive source labels so others can `ctx_search(source: "label")` later.

## ctx commands

| Command | Action |
|---------|--------|
| `ctx stats` | Call the `ctx_stats` MCP tool and display the full output verbatim |
| `ctx doctor` | Call the `ctx_doctor` MCP tool, run the returned shell command, display as checklist |
| `ctx upgrade` | Call the `ctx_upgrade` MCP tool, run the returned shell command, display as checklist |
