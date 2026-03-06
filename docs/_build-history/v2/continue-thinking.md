# Continue Thinking — Product Specification

## Purpose

Continue Thinking generates a continuity prompt for external AI tools.

It helps users resume a thinking thread using the structural context stored in INDEX.

This solves a common problem in AI workflows:

> AI conversations have no memory across sessions.

INDEX provides the structural memory needed to continue the conversation.

---

## Function

The feature gathers relevant signals from the project and constructs a prompt containing:

* project description
* active arcs
* open decisions
* recent shifts
* results recorded
* user-selected focus

The generated prompt can then be pasted into an AI tool such as ChatGPT or Claude.

---

## User Focus Options

Users may choose a focus for the continuation prompt:

* Next actions
* Decisions
* What's blocking me
* Full context

This allows the prompt to shape the next AI conversation.

---

## Prompt Structure

The generated prompt should contain:

### Project Context

Basic description of the project.

### Current Structural State

Summary of the current structure including:

* active arcs
* unresolved decisions
* recent structural shifts

### Signals

List recent decisions and results.

### Focus Request

Translate the user-selected focus into a clear request to the AI.

---

## Example Output

Project: INDEX v2

Description:
Building version 2 of INDEX, a structural ledger for thinking.

Current structural state:

* One arc active
* Two unresolved decisions
* Recent shifts: semantic overlay live, v2 alpha readiness defined

Open decisions:

* Shift in INDEX's Purpose
* Homepage title direction

Focus request:
Help identify the next actions required to move INDEX v2 toward alpha readiness.

---

## Prompt Generation Template

You are assisting with a project that is tracked in INDEX.

INDEX is a structural ledger for thinking.

Use the context below to help continue the thinking process.

Project context:
{project_description}

Current structural state:
{active_arcs}
{open_decisions}
{recent_shifts}

Recent signals:
{recent_results}

Focus request:
{user_focus}

Respond with thoughtful suggestions or analysis based on the context above.
