---
title: "Routing before reasoning: a four-stage hybrid router for multi-agent assistants"
summary: "Why NexusAI tries the cheapest routing method first, and asks a clarifying question instead of guessing when it isn't sure."
date: "2026-11-06"
topics: ["Agentic AI", "Multi-Agent Architecture", "AI Engineering"]
relatedProjects: ["nexusai"]
---

A multi-agent assistant lives or dies by its router. If the router sends a finance question to the travel agent, no amount of clever prompting downstream will save the answer. But the obvious fix — ask a large model to classify every message — adds latency and cost to *every* turn, including the many turns where the answer is obvious.

In **NexusAI** the router is a ladder. Each rung is more capable and more expensive than the one before, and a turn only climbs as far as it needs to.

## The four stages

1. **Keyword rules.** A fast path for unambiguous requests. A match only counts if it is confident *and* clearly ahead of the runner-up — a margin check stops "weather in the stock market" from going to the weather agent just because one keyword matched.
2. **Follow-up context.** Short follow-ups such as "and tomorrow?" carry no keywords of their own. They inherit the agent from the previous turn.
3. **LLM classifier.** Only when the cheap stages are unsure does GPT-4o classify the message, returning JSON with the chosen agents and a confidence. Any agent name that doesn't exist is discarded rather than trusted.
4. **Fallback and clarification.** If confidence is still below a floor, the system asks the user a clarifying question instead of guessing.

## Why ask instead of guess?

A wrong route is worse than a short delay. It spends tokens on the wrong specialist, produces a confident but irrelevant answer, and pollutes conversation memory. A one-line question — *"Do you mean the share price or the company news?"* — costs one turn and keeps everything downstream clean.

## What the ladder buys

- **Predictability.** Rules are deterministic, so common requests behave the same way every time and are easy to test.
- **Cost control.** The LLM classifier only runs on the turns that need it.
- **Debuggability.** Every decision records which stage made it, so a misroute can be traced to a rule, a context carry-over or a classifier call.

A simplified sketch of the control flow (illustrative, not the production code):

```python
def route(turn, history):
    for stage in (keyword_rules, follow_up_context, llm_classifier):
        decision = stage(turn, history)
        if decision and decision.confident:
            return decision
    return Clarify(question=build_clarifying_question(turn))
```

The same idea applies well beyond chat assistants: put deterministic, testable logic in front of the model, and let the model handle only the cases that genuinely need judgement.
