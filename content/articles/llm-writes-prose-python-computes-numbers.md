---
title: "Let the LLM write prose — let Python compute the numbers"
summary: "How IntelliHub keeps briefings reproducible by computing every structured section in code and giving the model only the narrative."
date: "2026-11-06"
topics: ["Generative AI", "AI Engineering", "Multi-Agent Architecture"]
relatedProjects: ["intellihub"]
---

Ask a language model to "summarise these market quotes in a table" and you'll usually get a good-looking table. Ask it a hundred times and you'll eventually get a transposed digit, a rounded figure, or a row that quietly disappeared. For a briefing someone might act on, "usually right" isn't good enough.

**IntelliHub** draws a hard line: **the LLM writes prose; Python builds everything that has a schema.**

## How the split works

Each domain agent wraps a Microsoft AutoGen assistant that calls tools — news search, market data, job portals, lab-report parsing. But the full tool results never pass through the model's text output:

- Tool results go to a **side collector**. The model sees only a short status line saying what was fetched.
- **Section builders** written in Python turn collected results into tables, figures, trends and source lists.
- The model then writes the **narrative** around those computed sections — context, comparison and caveats.

## What this buys

- **Reproducibility.** The same inputs always produce the same numbers. A briefing can be regenerated and compared.
- **Testability.** Section builders are plain functions, so they are covered by ordinary unit tests — no model calls needed.
- **Honest status.** Because results are collected structurally, the system knows when a feed failed. A briefing is marked **PARTIAL** when only some agents succeed, and network fallbacks are labelled **DEGRADED** sample data instead of being passed off as live.
- **Lower cost.** The model reads short status lines instead of large raw payloads.

## The trade-off

The narrative can only be as rich as the context it is given, so section builders must expose the right facts. And some flexibility is lost: the model can't invent a new table layout on the fly. For a briefing whose numbers someone may act on, that is exactly the flexibility you want to give up.

**Rule of thumb:** if a value could appear in a spreadsheet, compute it in code. Use the model for language, not for arithmetic or record-keeping.
