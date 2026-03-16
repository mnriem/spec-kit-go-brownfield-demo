# spec-kit NASA Hermes Brownfield Demo

This project demonstrates a brownfield AI-assisted development workflow using [spec-kit](https://github.com/github/spec-kit) and **GitHub Copilot CLI** on an existing NASA ground support system. Starting from a cloned open-source repository, a new web-based telemetry dashboard feature was added entirely through structured agents invoked from the terminal. The steps below document exactly what was done — you can follow the same process to extend your own projects.

> **Note on the workflow:** There was no pre-existing spec-kit constitution or formal specifications in this project. The constitution was generated from scratch by having the agent analyze the existing codebase. The feature specification is not an elaborate formal document — it is a short natural-language prompt describing the desired outcome, as you will see below.

## Acknowledgements

This project is built on top of **[Hermes](https://github.com/nasa/hermes)**, an open-source ground support system created and maintained by **[NASA](https://github.com/nasa)**. All credit for the original architecture, feature set, and implementation belongs to the Hermes contributors. Please visit the original repository to learn more, contribute, or show your appreciation.

---

## Prerequisites

- [uv](https://docs.astral.sh/uv/) — Python package manager used to install spec-kit
- [GitHub Copilot CLI](https://docs.github.com/en/copilot/github-copilot-in-the-cli) — `gh extension install github/gh-copilot`
- [Go](https://go.dev/) — required to build and run the Hermes backend

---

## Step 1 — Clone the project

```bash
git clone https://github.com/nasa/hermes.git
cd hermes
```

This was cloned at commit `d2ff1e85d002415723ecc9e91c017d19158df49e`.

## Step 2 — Install spec-kit

```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
```

## Step 3 — Initialize the project

```bash
specify init . --ai copilot
```

This scaffolded the spec-kit structure and installed the Copilot custom agents.

## Step 4 — Start Copilot CLI

```bash
copilot
```

All spec-kit agents are invoked using `/agent` slash commands from within the Copilot CLI.

## Step 5 — How to invoke a spec-kit agent

Each agent interaction is a two-step sequence inside the Copilot CLI:

1. **Select the agent** — type `/agent <name>` and press Enter. This switches Copilot CLI into that agent's mode.
2. **Enter your prompt** — type your request and press Enter. The agent processes it in context of the current project.

The agents available are:

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

---

## Step 6 — Establish project principles

The **`speckit.constitution`** agent was selected and prompted:

```
# 1. Select the agent
/agent speckit.constitution

# 2. Enter the prompt
As this is a pre-existing brownfield project I need you to analyze the
codebase exhaustive and in-depth. Do NOT skim over but use multiple
iterations to do a deep analysis and use or create principles focused on
code quality, testing standards, user experience consistency, and
performance requirements. Include governance for how these principles
should guide technical decisions and implementation choices.
```

This created `.specify/memory/constitution.md`, which all subsequent agents respected. Because this is a brownfield project with no prior constitution, the agent derived all principles directly from the existing codebase — no manual pre-authoring was required.

---

## Feature — Web-Based Telemetry Dashboard

### Step 7 — Write the feature specification

The **`speckit.specify`** agent was selected and prompted:

```
# 1. Select the agent
/agent speckit.specify

# 2. Enter the prompt
Web-Based Dashboard (Beyond Grafana)
The frontend is VSCode-only. Add a lightweight web UI (React, reusing the
existing src/modules/) for read-only telemetry monitoring and event viewing
— useful for stakeholders who don't need the full VSCode environment.
```

### Step 8 — Create the implementation plan

The **`speckit.plan`** agent was selected and prompted:

```
# 1. Select the agent
/agent speckit.plan

# 2. Enter the prompt
Execute
```

### Step 9 — Generate the task list

The **`speckit.tasks`** agent was selected and prompted:

```
# 1. Select the agent
/agent speckit.tasks

# 2. Enter the prompt
Execute
```

### Step 10 — Implement

The **`speckit.implement`** agent was selected and prompted:

```
# 1. Select the agent
/agent speckit.implement

# 2. Enter the prompt
Execute
```

Copilot CLI completed an initial implementation pass and suggested a command to manually verify the result. Rather than running it manually:

```
Run it for me!
```

The agent found an issue and performed additional implementation work, then reported completion. The next step was to start the application:

```
Start it up for me!
```

The agent identified remaining tasks, completed them, and reported done. At this point, YOLO mode was enabled — Copilot CLI was not permitted to start processes without it. The request was sent again:

```
Start it up for me!
```

The agent continued resolving outstanding tasks. Once it signalled completion:

```
Start it for me so I can test
```

The application started and the dashboard was accessible at `http://localhost:8080`.

### Step 11 — Debug and verify telemetry

Upon opening the dashboard, no telemetry was visible. The gRPC server status was queried:

```
Is the gRPC server running?
```

Copilot confirmed it was running. Pressed further:

```
Then why am I not seeing telemetry?
```

The agent identified a CORS origin issue, applied the fix, and restarted the server — noting that no events would appear until data was actually sent to the backend.

### Step 12 — Simulate telemetry data

To verify the full pipeline end-to-end:

```
Can you quickly simulate some data yourself and send it to Hermes?
```

The agent created a temporary telemetry simulator and began feeding live data into the backend. Events appeared in the dashboard confirming the complete implementation.

---

## Result

A brownfield NASA ground support system extended with a lightweight React-based web dashboard — built through structured agent workflows without manual scaffolding. The dashboard provides read-only telemetry monitoring and event viewing for stakeholders who do not require the full VS Code environment.

---

## What Could Have Been Done Better

Looking back at this walkthrough, a few things were left on the table.

**The feature spec was too thin.** The single-sentence prompt to `speckit.specify` described a desired outcome but gave the agent almost no constraints: no mention of authentication, no data refresh strategy, no accessibility requirements, no mobile/responsive expectations, no target browser list. A slightly more considered spec would have avoided the CORS debugging detour in Step 11 — the agent had no guidance that the dashboard would be served from a different origin than the gRPC backend, so it simply didn't think about it.

**`speckit.plan` received no guidance.** The [Piranha demo](https://github.com/mnriem/spec-kit-java-brownfield-demo/blob/main/README.md) used the planning step to steer technology choices, module layout, and dependency strategy. Here it was given a bare `Execute`. That left all architectural decisions entirely to the agent, which increases the risk of choices that don't align with how the codebase is actually structured or deployed.

**`speckit.analyze` was skipped.** After generating tasks, the `speckit.analyze` agent can cross-check the spec, plan, and task list for inconsistencies before any code is written. Skipping it meant the CORS issue, the missing data-feed wiring, and any other gaps weren't caught until runtime.

**YOLO mode was required but not anticipated.** Without it, Copilot CLI is not permitted to start processes such as servers or applications. Knowing this upfront and enabling YOLO mode at the start of `speckit.implement` would have made this walkthrough smoother and easier to follow.

**The simulator was throwaway.** Asking for a quick telemetry simulator to test the pipeline was pragmatic, but it was left implicit that this is temporary. The README would be more complete if it noted whether the simulator was committed, removed, or lives somewhere in the repo — so a reader following along knows what state the codebase is in after Step 12.

---

## Conclusion

This walkthrough demonstrates that structured AI-assisted development with spec-kit works on real brownfield codebases — not just greenfield projects designed to make the tooling look good. Starting from an existing NASA ground support system with no prior constitution, no existing specs, and no formal design documents, a working web-based telemetry dashboard was delivered entirely through agent-driven workflows without manually writing scaffolding or boilerplate.

The rough edges are worth being honest about. The CORS bug, the repeated start attempts, and the need to enable YOLO mode mid-way through were all avoidable with slightly more upfront investment: a more detailed feature spec, a guided planning prompt, and running `speckit.analyze` before implementation began. None of these are failures of the tooling — they are the natural consequence of moving fast and skipping steps that exist precisely to catch these problems early.

The more interesting takeaway is the ceiling, not the floor. Even with a thin spec, a bare plan, and no analysis pass, the agents produced a running, end-to-end implementation that required only conversational follow-up to debug and verify. The incremental effort to do it properly — spending an extra few minutes on each spec-kit step — would have eliminated most of the back-and-forth entirely.

For teams considering this workflow: the agents are only as good as the context you give them. Treat `speckit.specify`, `speckit.plan`, and `speckit.analyze` as investments, not formalities. The implementation will reflect the quality of the artifacts that precede it.
