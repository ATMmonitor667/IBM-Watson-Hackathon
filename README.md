# IBM watsonx Challenge — Hackathon Project

A hackathon project built for the **IBM watsonx Challenge**, using IBM's watsonx
AI stack (watsonx.ai, watsonx Orchestrate, and Granite models) to solve a
real-world problem.

> Status: early setup. Problem statement and solution details TBD.

## Repository layout

```
.
├── README.md                     # This file
├── CLAUDE.md                     # Project context for Claude / Claude Code
├── research/
│   └── watsonx-challenge-research.md   # Research brief on the watsonx Challenge
└── .claude/
    └── agents/
        └── watsonx-hackathon-assistant.md   # Custom Claude subagent
```

## The idea

_TODO: one-paragraph problem statement — who has the problem, why it matters, and
what our solution does._

## Tech stack

- **watsonx.ai** — foundation-model inference (IBM Granite models).
- **watsonx Orchestrate** — agentic layer for automating workflows (ADK +
  Developer Edition for local iteration).
- **RAG** — retrieval over a focused document set for domain grounding.
- _App/framework, language, and any other libraries: TBD._

## Getting started

```bash
# clone
git clone https://github.com/ATMmonitor667/IBM-Watson-Hackathon.git
cd IBM-Watson-Hackathon

# TODO: environment setup, dependencies, and IBM Cloud / watsonx credentials
```

You'll need IBM Cloud credentials and a watsonx.ai project. Keep API keys out of
git — use a `.env` file (git-ignored) or your platform's secret manager.

## Submission checklist

- [ ] Working end-to-end demo
- [ ] Clear write-up of **where and how each watsonx product is used**
- [ ] Demo video
- [ ] Original work, in English, no IP/legal issues
- [ ] Submitted via the event's channel (Devpost or event portal)

See [`research/watsonx-challenge-research.md`](research/watsonx-challenge-research.md)
for the full research brief, judging criteria, and open questions to confirm.

## Team

_TODO: add team members and roles._
