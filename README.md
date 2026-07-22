# Storyverse

Storyverse is a collaborative visual-storytelling platform where small comic and animation
teams branch, review, and merge story ideas while AI protects continuity and visual
consistency.

This project targets the July 2026 **Reimagine Creative Industries with AI** theme of the IBM
AI Builders Challenge with IBM Bob.

## Current status

The repository contains the initial Next.js application foundation. The first product slice will
cover the PRD's focused demo path: create a project, lock a character, create scenes, branch a
timeline, review a continuity issue, and merge selected changes into canon.

## Stack

- Next.js App Router, React, and TypeScript
- Tailwind CSS and shadcn/ui-compatible configuration
- React Flow for visual story branches
- Three.js, React Three Fiber, and Drei for the cinematic branch-tree layer
- Framer Motion for interface transitions
- Zustand for local client state
- Supabase for authentication, PostgreSQL, storage, and realtime events
- Zod and React Hook Form for validated forms
- Vitest and React Testing Library for component tests

## Getting started

Requirements: Node.js 20.9 or newer and npm 10 or newer.

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Environment variables are documented in `.env.example`. The landing page runs without
credentials; Supabase and watsonx-backed features will require their corresponding values.

## Commands

```bash
npm run dev        # Start local development
npm run build      # Create a production build
npm run lint       # Run ESLint
npm run typecheck  # Check TypeScript
npm test           # Run the test suite once
```

## Project structure

```text
src/
  app/                 App Router pages, layouts, and route-local tests
  components/          Shared product and UI components
  hooks/               Shared React hooks
  lib/                 Framework integrations and utilities
    supabase/           Browser and server Supabase clients
  test/                Shared test setup
```

## Responsible AI and human control

Storyverse treats AI output as a proposal. Continuity findings, generated assets, branch
suggestions, and merge strategies must remain explainable, reviewable, reversible, and subject
to creator approval. Original visual styles are preferred over imitation of named living artists.

## Built with IBM Bob

IBM Bob is the primary development tool for this challenge entry. The team will record Bob's
contributions to architecture, implementation, testing, debugging, accessibility review, and
documentation, along with the human decisions and validation applied to its output.

## Near-term build path

1. Add Supabase schema and authentication.
2. Build the story workspace and scene-card model.
3. Implement the 2D branch tree and demo data.
4. Add the continuity review and visual diff flow.
5. Add the optional Three.js overview after the 2D workflow is reliable.
