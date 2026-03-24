# Spec Kit Workshop — NASA Hermes Brownfield Demo

> This workshop works two ways: follow it **self-guided** at your own pace, or
> use it to **present a live session** to a group. Presenter-specific guidance
> is marked with 🎤 throughout — skip those sections if you're working solo.

---

## What You'll Do

You're going to take a real NASA codebase — [Hermes](https://github.com/nasa/hermes),
an open-source Go + React ground support system for telemetry operations — and
extend it with a new web-based telemetry dashboard. You won't write any
scaffolding by hand. You'll write a specification, and the AI agent will build
the feature from it.

By the end you'll understand why **writing a good spec before you prompt** is the
single highest-leverage thing you can do with an AI coding agent.

The [README](README.md) documents exactly what was done when this demo was
originally run. This workshop wraps those same steps into a hands-on guide with
the context and lessons learned baked in.

---

## Before You Start

Make sure you have the following installed before beginning. Nothing here takes
long, but doing it upfront keeps the momentum going once you start.

> 🎤 **If presenting:** Send this section to attendees **at least 24 hours ahead.**
> Everything stalls if people spend the first 15 minutes installing prerequisites.

### Prerequisites

| Tool | Check | Install |
|------|-------|---------|
| **Python 3.11+** | `python3 --version` | [python.org](https://www.python.org/downloads/) or `brew install python` |
| **uv** | `uv --version` | [docs.astral.sh/uv](https://docs.astral.sh/uv/) |
| **Git** | `git --version` | [git-scm.com](https://git-scm.com/) |
| **Go** | `go version` | [go.dev](https://go.dev/) — needed to build the Hermes backend |
| **GitHub Copilot CLI** | `copilot --version` | `gh extension install github/gh-copilot` |

> **Using a different agent?** Any [supported agent](https://github.com/github/spec-kit#-supported-ai-agents)
> works. Replace `--ai copilot` with your agent (e.g. `--ai claude`, `--ai gemini`)
> and invoke commands using your agent's interface instead of `copilot`. The prompts
> are identical.

### Install Spec Kit ahead of time

```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
```

Verify it works:

```bash
specify --help
```

---

## Agenda

> 🎤 **If presenting:** Use this table to pace the session. Self-guided
> readers can ignore the time estimates and go at their own speed.

| Part | What | Time |
|------|------|------|
| **Background** | Why specs matter — the vibe coding trap | ~5 min |
| **Steps 1–3** | Clone Hermes, install spec-kit, initialize | ~10 min |
| **Steps 4–5** | Meet the agents | ~5 min |
| **Step 6** | Establish project principles (constitution) | ~10 min |
| **Steps 7–9** | Specify → Clarify → Plan → Analyze → Tasks | ~25 min |
| **Steps 10–12** | Implement, debug, verify | ~20 min |
| **Wrap-up** | What we learned, tips & tricks | ~10–20 min |

---

## Background — Why Specs Matter

If you've used an AI coding agent, you've probably done this: pasted a one-liner
prompt, gotten 500 lines back, and spent the next two hours figuring out why it
broke everything. That's vibe coding — you prompt, you pray, you debug.

It works for throwaway scripts. It doesn't work when the codebase is tens of
thousands of lines of Go and TypeScript that somebody at NASA actually depends on.

The alternative is **Spec-Driven Development**: write a short, structured
specification *before* you prompt, and let the spec drive everything downstream —
the technical plan, the task breakdown, and the implementation.

[Spec Kit](https://github.com/github/spec-kit) is the toolkit that makes this
workflow concrete. In this workshop you'll use it on a real brownfield codebase —
NASA's Hermes ground support system — and extend it with a new feature.

> 🎤 **If presenting:** Open with this as a conversation, not a lecture. Ask
> the room who's had the "500 lines of broken code" experience. Let people
> share their war stories for a minute — it sets up the *why* before you
> get into the *how*.

---

## Step 1 — Clone the Project

```bash
git clone https://github.com/nasa/hermes.git
cd hermes
```

Take a moment to look around. This is not a toy project:

| Language | Files | Lines of code |
|----------|------:|-----:|
| Go | 179 | 41,089 |
| TypeScript / TSX | 228 | 29,919 |
| JavaScript | 6 | 21,571 |
| Python | 12 | 3,087 |
| Protocol Buffers | 9 | 1,263 |
| CSS | 2 | 1,603 |
| HTML | — | — |
| **Total** | **436** | **98,532** |

A Go backend with gRPC, Protocol Buffers, a React/TypeScript frontend, Docker
Compose config, a Python tooling layer, and nearly 100,000 lines of source code.
There are no specs, no constitution, and no formal design documents. That's
the starting point.

Browse the directory structure — `cmd/`, `pkg/`, `proto/`, `src/` — to get a
sense of the project's shape before any spec-kit commands are run.

> 🎤 **If presenting:** This is the first "keyboards out" moment. Have
> everyone clone and `ls` around. Let them feel the weight of the project.

---

## Step 2 — Install Spec Kit

```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
```

Verify the install:

```bash
specify --help
```

---

## Step 3 — Initialize the Project

```bash
specify init . --ai copilot
```

> **Using a different agent?** Replace `copilot` with your agent name
> (e.g. `--ai claude`, `--ai gemini`). The rest of the workflow is identical.

This scaffolded the spec-kit structure into the existing repo and installed the
agent-specific command files. For Copilot, these live in `.github/agents/`.

The key thing to notice: `--ai copilot` with `.` (current directory) means
spec-kit merged into the existing Hermes project without destroying anything.
This is how brownfield initialization works.

Run a quick check to confirm everything is wired up:

```bash
specify check
```

---

## Step 4 — Start Your AI Agent

For GitHub Copilot CLI:

```bash
copilot
```

For other agents, launch them as you normally would (e.g. `claude`, `gemini`,
or open your IDE).

All spec-kit agents are invoked using slash commands from within the agent
interface.

---

## Step 5 — How to Invoke a Spec-Kit Agent

Each agent interaction is a two-step sequence:

1. **Select the agent** — type `/agent <name>` (Copilot CLI) or the
   equivalent for your agent, and press Enter.
2. **Enter your prompt** — type your request and press Enter.

Here are the agents you'll use:

| Agent | Purpose |
|---|---|
| `speckit.constitution` | Define project-wide principles and governance |
| `speckit.specify` | Generate a feature specification from a description |
| `speckit.clarify` | Ask targeted questions to tighten an existing spec |
| `speckit.plan` | Produce a technical design and implementation plan |
| `speckit.analyze` | Check consistency across spec, plan, and tasks |
| `speckit.tasks` | Generate a dependency-ordered task list |
| `speckit.checklist` | Produce a custom quality checklist |
| `speckit.implement` | Execute tasks from `tasks.md` |
| `speckit.taskstoissues` | Convert tasks into GitHub Issues |

> 🎤 **If presenting:** Walk through the table briefly. Don't explain each
> agent in detail — just make sure everyone understands the two-step pattern.

---

## Step 6 — Establish Project Principles

This is where things get interesting. The agent is about to analyze a codebase
it has never seen and derive governing principles from it — no manual
pre-authoring required.

Select the `speckit.constitution` agent and enter the following prompt:

```
As this is a pre-existing brownfield project I need you to analyze the
codebase exhaustive and in-depth. Do NOT skim over but use multiple
iterations to do a deep analysis and use or create principles focused on
code quality, testing standards, user experience consistency, and
performance requirements. Include governance for how these principles
should guide technical decisions and implementation choices.
```

This creates `.specify/memory/constitution.md`. Every subsequent agent command
will respect these principles. The implementation plan will include
**compliance gates** — the agent must pass them or document justified exceptions.

The constitution generation takes a few minutes because the agent is doing a
deep analysis of the entire codebase. While you wait, take a look at what's
being generated — it's deriving principles directly from how the code is
actually written.

> 🎤 **If presenting:** Use the wait time to talk about *why* a constitution
> matters — it prevents the agent from making architectural decisions that
> conflict with how the project is actually built.

---

## Feature — Web-Based Telemetry Dashboard

The feature we're building: a lightweight web dashboard for read-only telemetry
monitoring and event viewing. Useful for stakeholders who don't need the full
VS Code environment that Hermes currently requires.

### Step 7 — Write the Feature Specification (~5 min)

Select the `speckit.specify` agent and enter:

```
Web-Based Dashboard (Beyond Grafana)
The frontend is VSCode-only. Add a lightweight web UI (React, reusing the
existing src/modules/) for read-only telemetry monitoring and event viewing
— useful for stakeholders who don't need the full VSCode environment.
```

Notice what happened:

- A feature branch was created automatically (e.g. `001-web-telemetry-dashboard`)
- A spec directory was created (`specs/001-web-telemetry-dashboard/spec.md`)
- The spec template includes user stories, acceptance criteria, and
  `[NEEDS CLARIFICATION]` markers for anything the agent couldn't infer

> **Workshop challenge:** Before moving to the plan step, try running
> `/speckit.clarify` (Step 7b below). The original demo skipped this — and
> paid for it later with a CORS bug. Let's see if clarify catches it.

### Step 7b — Clarify the Spec (recommended)

This step was skipped in the original demo — and that decision led directly
to a CORS debugging detour in Step 11. In this workshop, we do it right.

Select the `speckit.clarify` agent:

```
Execute
```

The agent identifies underspecified areas and asks up to 5 targeted questions.
Answer them — your answers get encoded back into the spec.

Look for questions about:
- Will the dashboard be served from the same origin as the API?
- Authentication or access control requirements?
- Data refresh strategy (polling, streaming, manual)?

These are exactly the kinds of gaps that cause debugging detours later.

### Step 8 — Create the Implementation Plan

Select the `speckit.plan` agent.

The original demo passed a bare `Execute` here — no technology guidance, no
module layout, no dependency strategy. That left all architectural decisions
to the agent. You'll get better results by giving the planner real constraints:

```
Use React for the frontend, reuse the existing src/modules/ where possible.
Serve the dashboard from the Go backend on port 8080. Use gRPC-web for
communication. Keep dependencies minimal.
```

The agent produces:

- `plan.md` — architecture, tech stack, rationale
- `research.md` — technical decisions and constraints
- `data-model.md` — entity definitions
- `contracts/` — API specs and test requirements

Constitutional compliance gates fire during this step. If the plan violates
any principle from the constitution, the agent must justify the violation
explicitly.

### Step 8b — Analyze for Consistency (recommended)

This step was also skipped in the original demo. Running it catches
inconsistencies between spec, plan, and tasks *before* any code is written.
One minute here can save an hour of debugging.

Select the `speckit.analyze` agent:

```
Execute
```

Review the output. If the agent finds issues, fix them in the spec or plan
before proceeding.

### Step 9 — Generate the Task List

Select the `speckit.tasks` agent:

```
Execute
```

This transforms the plan into an ordered, actionable task list in `tasks.md`.
Tasks marked with `[P]` can be executed in parallel.

Browse the generated task list. Each task should be small, focused, and
independently testable.

---

### Step 10 — Implement

This is where it gets real. The agent is going to process every task from
`tasks.md`. It may need multiple passes — that's normal and expected.

**Copilot CLI users:** Enable YOLO mode before starting. Without it, Copilot
CLI won't be permitted to start processes like servers. The original demo hit
this mid-implementation and it was disruptive.

Select the `speckit.implement` agent:

```
Execute
```

The agent processes tasks from `tasks.md`, verifying checklists as it goes.

> 🎤 **If presenting:** Narrate what's happening as the agent works through
> the tasks. Point out what it's building and how it maps back to the spec.

When the agent completes an initial pass and suggests verifying the result:

```
Run it for me!
```

If the agent signals completion and you need the app running:

```
Start it up for me!
```

The agent may need several passes. This is iterative by nature. Keep
interacting conversationally — the agent responds to follow-up prompts.

When it's ready, the dashboard should be accessible at `http://localhost:8080`.

---

### Step 11 — Debug and Verify Telemetry

Open `http://localhost:8080` in a browser.

If you ran `/speckit.clarify` and `/speckit.analyze` earlier, you may not hit
any issues here. If you skipped them (matching the original demo), you'll
likely see the CORS bug — and that's a valuable lesson in itself. It shows
exactly which skipped step would have prevented it.

If no telemetry is visible, ask the agent:

```
Is the gRPC server running?
```

If it's running but no data appears:

```
Then why am I not seeing telemetry?
```

In the original demo, the agent identified a CORS origin issue, applied the
fix, and restarted the server.

---

### Step 12 — Simulate Telemetry Data

To verify the full pipeline end-to-end:

```
Can you quickly simulate some data yourself and send it to Hermes?
```

The agent creates a temporary telemetry simulator and feeds live data into the
backend. Events should appear in the dashboard, confirming the complete
implementation.

---

## Result

A brownfield NASA ground support system extended with a lightweight React-based
web dashboard — built through structured agent workflows without manually
writing scaffolding or boilerplate. The dashboard provides read-only telemetry
monitoring and event viewing for stakeholders who do not require the full
VS Code environment.

Here's what the codebase looks like now compared to where we started:

| Language | Before | After | Added |
|----------|-------:|------:|------:|
| Go | 41,089 | 41,274 | +185 |
| TypeScript / TSX | 29,919 | 30,948 | +1,029 |
| JavaScript | 21,571 | 21,571 | — |
| Python | 3,087 | 3,087 | — |
| Protocol Buffers | 1,263 | 1,263 | — |
| CSS | 1,603 | 1,954 | +351 |
| HTML | — | 13 | +13 |
| **Total** | **98,532** | **100,110** | **+1,578** |

1,578 lines of new code — a Go HTTP handler and a React dashboard — added to a
98,000-line codebase entirely through structured agent workflows.

---

## Wrap-Up — What We Learned

### The honest retrospective

The original demo's [What Could Have Been Done Better](README.md#what-could-have-been-done-better)
section is refreshingly honest — worth reading in full. Here's the summary:

The original demo skipped clarify, gave the planner no guidance, and skipped
analyze. The result still worked — but it required debugging detours that were
entirely preventable:

| What happened | Which step would have prevented it |
|---|---|
| CORS bug at runtime | A better spec or `/speckit.clarify` |
| No data wiring | `/speckit.analyze` before implementation |
| YOLO mode surprise | Anticipating it in the plan step |
| Thin spec, vague plan | More considered prompts to `specify` and `plan` |

The takeaway: **the agents are only as good as the context you give them.**
Treat `speckit.specify`, `speckit.plan`, and `speckit.analyze` as investments,
not formalities. The implementation will reflect the quality of the artifacts
that precede it.

### Tips & tricks

1. **Brownfield is the default.** Most real work is extending existing code.
   `specify init --here` works on codebases of any size — the
   [Java demo](https://github.com/mnriem/spec-kit-java-brownfield-demo) used
   a 420,000-line project.

2. **Your spec quality = your output quality.** This demo proved it both ways:
   a thin spec produced a working result *with* debugging detours; a richer
   spec would have been smoother.

3. **Don't skip `/speckit.analyze`.** It's the cheapest safety net in the
   workflow. One minute of analysis can save an hour of debugging.

4. **Give the planner guidance when you need control.** `Execute` keeps the
   agent creative and lets it make its own architectural choices. But if you
   require specific technology choices, module boundaries, or deployment
   constraints, spell them out in the plan prompt — the agent will follow them.

5. **Constitution first, always.** For brownfield, have the agent analyze the
   existing codebase deeply. For greenfield, write your non-negotiable rules
   upfront. Either way, do it before the first spec.

6. **Multi-pass implementation through scoped features.** Don't try to build
   everything in one shot. Scope each feature tightly, implement it, verify
   it works, then move to the next. Each pass builds on verified working code.

7. **Branch = context.** Each feature lives in its own Git branch.
   Spec-kit commands auto-detect the active feature from the branch name.

### Keep going

Done with the main workshop? Try one of these:

- **Add a second feature** to Hermes — shows the branching model and how
  spec-kit auto-increments feature numbers
- **Write a stricter constitution** and re-run the plan — see how the
  compliance gates constrain the output
- **Run `/speckit.analyze`** on your existing spec + plan and compare the
  results with skipping it
- **Try `/speckit.checklist`** to generate a custom quality checklist for
  your feature

> 🎤 **If presenting:** If there's time, let people keep building while you
> float around (or stay on the call) to help. This is where the real learning
> happens.

---

## 🎤 Presenter Notes

> This section is for people running this as a live workshop. Skip it if
> you're working self-guided.

### Setup

- Screen-share a terminal. Skip formal slide decks — this audience wants to
  see it work, not read about it.
- Have the [demo README](README.md) open in a browser tab as a reference.
- Bookmark [Spec Kit](https://github.com/github/spec-kit#readme) and the
  [Quick Start Guide](https://github.github.io/spec-kit/quickstart.html) for
  attendees who want to read more.

### When things go wrong

The demo is honest about its rough edges. Lean into them — they're teaching
moments, not failures. When a live demo hits a snag, narrate *which step
would have prevented it.* That's the lesson landing.

### One-liner pitch

For your call invite or event listing:

> *Stop prompting and praying — learn how to use specifications to make AI
> build what you actually want.*

---

## Other Community Demos

| Demo | Stack | Type | Highlights |
|------|-------|------|------------|
| [.NET CLI tool](https://github.com/mnriem/spec-kit-dotnet-cli-demo) | .NET | Greenfield | Full workflow from blank directory |
| [Spring Boot + React](https://github.com/mnriem/spec-kit-spring-react-demo) | Java, React | Greenfield | Includes clarify + analyze passes |
| [ASP.NET CMS](https://github.com/mnriem/spec-kit-aspnet-brownfield-demo) | C#, Razor | Brownfield | 307k LOC existing codebase |
| [Java runtime](https://github.com/mnriem/spec-kit-java-brownfield-demo) | Java | Brownfield | 420k LOC, 180 Maven modules |
| [Pirate Speak preset](https://github.com/mnriem/spec-kit-pirate-speak-preset-demo) | Spring Boot | Greenfield | Custom preset demo |
