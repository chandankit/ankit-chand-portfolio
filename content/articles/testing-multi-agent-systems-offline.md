---
title: "Testing multi-agent systems without an API key"
summary: "Deterministic mock LLM clients let 571 tests across NexusAI and IntelliHub run offline — here is the pattern and what it does and doesn't prove."
date: "2026-11-06"
topics: ["LLM Evaluation", "AI Engineering", "Python"]
relatedProjects: ["nexusai", "intellihub"]
---

Multi-agent systems have a lot of moving parts that have nothing to do with the model's intelligence: routing rules, guardrails, tool schemas, fallbacks, memory writes, event streaming. When every test needs a live LLM, those parts go untested — tests are slow, cost money, and give different answers on every run.

Across **NexusAI (214 tests)** and **IntelliHub (357 tests)**, every test runs offline.

## The pattern: a deterministic stand-in for the model

- **Implement the real client interface.** IntelliHub's mock implements the same interface AutoGen expects from a model client, so the *real* agent and tool loop runs — only the model is replaced. On the first turn the mock requests the agent's tools; on the second it writes a narrative.
- **Inject it, don't patch it.** A factory returns either the live client or the mock based on configuration, so production code paths are unchanged.
- **Force offline mode in tests.** A fixture ensures no test can reach the network by accident.
- **One network seam.** In NexusAI all external calls go through a single seam, so one fixture can cut the network and exercise every tool's offline fallback.

## Guarding against the opposite failure

A mock that is too convenient creates a new risk: production silently running in mock mode. IntelliHub adds a **require-live** setting that fails loudly with a configuration error, a visible mock-mode warning, and a verify command to confirm which client is active.

## What offline tests prove — and what they don't

They prove the **plumbing**: routing decisions, guardrail behaviour, PII redaction, tool argument handling, fallbacks, status reporting and memory writes. They make refactoring safe.

They do **not** prove answer **quality**. Whether the model picks the right tool for a paraphrased request, or writes an accurate summary, needs a separate evaluation set run against the live model and scored over time. The two layers complement each other: fast deterministic tests on every change, and slower model evaluations on a schedule.
