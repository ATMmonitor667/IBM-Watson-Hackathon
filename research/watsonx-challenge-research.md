# IBM watsonx Challenge — Research Brief

_Last updated: 2026-07-13_

This document collects research on the **IBM watsonx Challenge** to guide our
hackathon project. It covers the format, judging, tech stack, submission
requirements, and starter resources.

## What it is

The IBM watsonx Challenge is IBM's AI hackathon series built around the
**watsonx** platform. Events run in a short, intense format (typically ~2 days)
where teams design, build, and pitch creative solutions to real-world problems
using IBM's AI tooling, with mentorship and technical support from IBM experts.
Core activities: team-based rapid prototyping, hands-on time with watsonx
products, networking, and a final pitch to a panel of judges.

## Format

- **Duration:** Short sprint, usually a 2-day window to build and present.
- **Teams:** Work in small teams; design → build → pitch.
- **Support:** Mentors and IBM technical experts are available during the event.
- **Finale:** A live pitch/demo to judges.

## Judging criteria

Judges look for solutions that are creative, feasible, usable, and effective.
Across watsonx-ecosystem events the criteria typically break down as:

- **Technical Execution** — effective, well-structured use of IBM watsonx tools;
  a functional solution that actually runs.
- **Innovation** — creativity, originality, and a unique application of AI.
- **Challenge Fit** — relevance to the stated challenge and ability to solve a
  real-world problem.
- **Implementation & Feasibility** — practicality, scalability, and real-world
  potential.

Older Watson Developer Challenge scoring weighted **Watson usage, execution, and
originality** at roughly 25% each, with bonus points for using additional
Watson/watsonx capabilities in interesting ways. Expect a similar shape.

## Prizes (recent events)

- Cash prizes up to **$5,000 USD** for top teams.
- Complimentary passes to **IBM TechXchange 2026** (Atlanta). Eligibility rules
  apply — confirm on the official event page.

## The watsonx tech stack

Design the project so it clearly leans on IBM watsonx. Key pieces:

### watsonx.ai
IBM's studio for building, training, and deploying AI. Gives access to
foundation models (including IBM **Granite**), prompt engineering, and inference
APIs. Common pattern: call watsonx.ai for LLM inference (e.g., a Granite model)
behind an app or agent.

### watsonx Orchestrate
Platform to create, deploy, and manage **AI agents** that automate workflows.
It's a multi-agent system with an automation layer that picks the best action
and tools. Highly relevant for agentic hackathon builds.

- **Agent Development Kit (ADK):** a Python library + CLI to build and deploy
  agents.
- **Developer Edition:** a self-contained local copy that runs on your laptop
  for fast iteration before deploying.
- **AI Gateway:** route across multiple foundation models — IBM Granite, OpenAI,
  Anthropic Claude, Google Gemini, Mistral, Llama — without vendor lock-in.
- **RAG:** enhance agents with domain knowledge via retrieval over uploaded
  documents (e.g., a `knowledge-agent.yaml` pattern with Granite models).

### Granite models
IBM's open family of foundation models (e.g., Granite 3.x / 4.0). Frequently the
default LLM for watsonx builds and RAG pipelines. Well-suited to enterprise text
tasks.

### Common architecture patterns seen in past projects
- **Agentic copilots** (e.g., an AI SOC/security copilot).
- **Autonomous auditing / compliance agents** over contracts or documents.
- **RAG Q&A systems** with real-time feedback loops.

## Submission requirements (typical)

- Submissions in **English**, wholly **original**, free of IP/legal issues.
- **Working demo** — judges want a functional hack, not just slides.
- **Document your watsonx usage** — clearly explain where and how each IBM
  watsonx product (features, skills, integrations, workflows) is used, so judges
  can verify the implementation.
- Many events submit through **Devpost** (repo link + demo video + write-up).
  Confirm the channel for the specific event.

## Recommended approach for our project

1. Pick a real-world problem with a clear user and measurable outcome.
2. Center the build on watsonx: use **watsonx.ai + Granite** for inference and
   **watsonx Orchestrate** for the agentic layer if the problem is workflow/
   automation-shaped.
3. Add **RAG** over a focused document set for domain grounding.
4. Prioritize a **working end-to-end demo** early; polish the pitch second.
5. Keep a running log of exactly how each watsonx product is used (for the
   submission write-up).

## Open questions to confirm on the official event page

- Exact event dates, location/format (in-person vs virtual), and team size caps.
- Which watsonx products are mandatory vs optional for this specific challenge.
- Submission channel (Devpost vs event portal) and required deliverables
  (video length, repo requirements, slide template).
- Eligibility for prizes and TechXchange passes.

## Sources

- [IBM watsonx Hackathons (IBM Developer)](https://developer.ibm.com/hackathons/)
- [IBM TechXchange Hackathons](https://www.ibm.com/community/techxchange-hackathons/)
- [watsonx Challenge event portal (example)](https://0126hackathon.watsonx-challenge.ibm.com/)
- [Agentic AI Hackathon with IBM watsonx Orchestrate (IBM Developer)](https://developer.ibm.com/events/agentic-ai-hackathon-with-ibm-watsonx-orchestrate/)
- [AI Hackathon Guide: Building Agentic AI Solutions with IBM watsonx Orchestrate (lablab.ai)](https://lablab.ai/blog/inside-the-agentic-ai-hack-with-ibm)
- [IBM watsonx.ai product page](https://www.ibm.com/products/watsonx-ai)
- [Build an AI agent with Langflow, Granite 4.0, and watsonx Orchestrate (IBM Developer)](https://developer.ibm.com/tutorials/develop-langflow-tools-watsonx-orchestrate-granite/)
- [IBM watsonx Challenge empowers partners to solve real-world problems with AI](https://www.ibm.com/new/announcements/ibm-watsonx-challenge-empowers-partners-to-solve-real-world-problems-with-ai)
- [Watson Developer Challenge (Devpost)](https://watson.devpost.com/)
