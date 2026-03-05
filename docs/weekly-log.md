# Weekly Log — Product Specification (v2)

## Purpose

Weekly Log is a reflection artifact generated from the structural signals recorded in INDEX during a selected week.

It answers:

> What happened in my thinking this week?

Unlike Direction / Shifts / Timeline (which are strict mirrors of current structure), Weekly Log is allowed a **light narrative touch**.

However:
- It must remain **observational and grounded in recorded signals**
- It must never coach, speculate, or interpret motives
- It should read like a **logbook entry / field note**

---

## Inputs (Information Sources)

Weekly Log summarizes signals from the selected week window:

- decisions recorded
- results recorded
- structural shifts
- active arcs (during that week)
- timeline pulses / structural change events (if distinct from shifts)

---

## Output Structure

Weekly Log contains four sections:

### 1) Week Overview
A short paragraph describing the week’s structural focus.

Example:
This week centered on stabilizing semantic labeling and clarifying the Direction model for INDEX v2.

### 2) Structural Changes
A bulleted list of notable shifts recorded during the week.

Example:
Structural changes recorded:
- Semantic overlay live
- v2 alpha readiness defined
- Structure updated

### 3) Decisions and Results
A compact summary (counts + optional bullets if helpful and short).

Example:
Decisions recorded: 2  
Results recorded: 1

Optional:
Decisions:
- Shift in INDEX’s Purpose
- Homepage title direction

Results:
- Direction logic aligned to current structure

### 4) Open Tension
List unresolved decisions / tensions still active at end of week.

Example:
Open decisions:
- Shift in INDEX’s Purpose
- Homepage title direction

---

## Tone Rules

- calm, factual, observational
- light narrative is OK *only* as connective tissue
- do not speculate
- do not give advice
- do not interpret intent

---

## Prompt Template (LLM)

You are generating a Weekly Log for INDEX.

INDEX is a structural ledger for thinking.

Summarize the structural signals recorded during the selected week.
Your job is to describe what happened structurally, not why it happened.

Inputs include:
- decisions recorded
- results recorded
- structural shifts
- active arcs
- timeline pulses / structural events

Rules:
- remain factual and grounded in the inputs
- no advice, no coaching
- no speculation, no motive inference
- tone: calm, observational, like a logbook entry

Return text only, using these four sections:

1. Week Overview
2. Structural Changes
3. Decisions and Results
4. Open Tension