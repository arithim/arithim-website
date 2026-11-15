+++
title = "Why Do AI Pilots Stall Before Production in Regulated Industries?"
slug = "why-ai-pilots-stall-before-production"
date = 2026-11-15
category = "AI GOVERNANCE"
card_label = "AI GOVERNANCE"
breadcrumb = "AI governance"
description = "Most AI pilots in regulated firms work. They stall because nobody owns them, nothing records what they did and nobody can stop them. Four questions an auditor asks before go-live, and how to answer them in writing."
summary = "Why working AI pilots fail to reach production in regulated firms, the four questions an auditor asks before go-live, and what to put in place first."
lede = "AI pilots in regulated firms usually stall because of ownership, evidence and control, and rarely because of the model. Nobody is named as the owner, nothing the pilot does is recorded in a form an auditor can read, and there is no clear way to limit it or switch it off. Answer four questions in writing before go-live (who owns it, what may it do, how is it logged, who can switch it off) and most of the blockers go with them."
author = "Tarun Bulchandani"
cta = "Have a pilot that works but can't get past risk and compliance?"
keywords = [
  "why do AI pilots fail to reach production",
  "AI pilot to production",
  "AI governance in regulated industries",
  "AI audit trail",
  "who owns an AI agent",
  "AI kill switch",
  "ISO 42001 in practice",
  "AI business case stop rule",
]
about = ["AI governance", "Regulated industries", "ISO/IEC 42001", "AI agents"]

[[faq]]
q = "Why do AI pilots stall before production?"
a = "In regulated firms the model is rarely what stops them. The pilot has no named owner, its actions aren't recorded in a form an auditor can use, and nobody has set out how to limit it or stop it. Risk and compliance teams can't sign off on that, so the pilot waits."

[[faq]]
q = "What does an auditor ask before an AI system goes live?"
a = "Four things, in some form. Who owns it, what it may do (and what it must never do), how its actions are logged, and who can switch it off. If the answers are written down before the review, the meeting can check them instead of finding out they're missing."

[[faq]]
q = "Who should own an AI agent?"
a = "A named person, not a team and not whoever built it. The owner answers for what the agent does in production, approves changes to what it may do, and decides when it is re-checked or retired."

[[faq]]
q = "Do we need ISO/IEC 42001 certification to put AI into production?"
a = "No. ISO/IEC 42001 is a voluntary standard for an AI management system. Its structure is still a useful checklist, because it covers the same ground an auditor will: an inventory of AI systems, risk assessment, named responsibilities, controls and regular review. Certification can come later if customers or regulators ask for it."

[[faq]]
q = "What is a stop rule for an AI project?"
a = "A condition, agreed before the project starts, under which you stop or roll it back. For example, the measured saving falls below the cost of running and reviewing it for two quarters, or the error rate goes above an agreed level. Writing it down early makes the decision easier to take when the time comes."

[[sources]]
text = "ISO, [ISO/IEC 42001:2023 Information technology, Artificial intelligence, Management system](https://www.iso.org/standard/42001), published December 2023. Accessed 15 November 2026."

[[sources]]
text = "Regulation (EU) 2024/1689 (the EU AI Act), [Article 12: Record-keeping](https://artificialintelligenceact.eu/article/12/) and [Article 14: Human oversight](https://artificialintelligenceact.eu/article/14/), via the EU AI Act Explorer. Accessed 15 November 2026."
+++
When an AI pilot in a regulated firm stalls, the conversation is almost never about the model. The demo worked. The accuracy was fine. What stopped it was a set of questions nobody had answered in writing.

This article is the written version of my talk *From Pilot to Production in Regulated Industries*. The slides are above.

## Most pilots work

Pilots are built to succeed. They run on a clean slice of data, with the people who built them watching every output, and nobody is asked to sign anything. So most of them work.

Production is different. In a bank, an insurer or an energy company, putting a system live means someone in risk, compliance or internal audit has to be satisfied that it is controlled. A pilot that was never designed with that person in mind arrives at their desk with nothing for them to read, and it waits there until someone writes the missing answers.

## Why they stall

Pilots that stall tend to share the same three gaps.

The first is ownership. Nobody is named. The data science team built it, the business sponsored it, IT hosts it, and when an auditor asks who is accountable for what it does on a bad day, each group points at another.

The second is evidence. The pilot may log plenty for its developers, but nothing an auditor can read. There is no record of what it was allowed to do, what it actually did, or who approved the decisions it made.

The third is control. There is no clear way to limit what it can touch, and no agreed way to stop it. Everyone assumes that someone could switch it off, but nobody has written down who, or how.

None of these is a modelling problem. You could swap in a better model tomorrow and the pilot would stall in the same place.

## Four questions an auditor asks before go-live

The questions vary in wording, but they come down to four. If you answer them in writing before the review, the meeting can spend its time checking your answers.

### 1. Who owns it?

A named person, and not a team. And not whoever built it, because the builder will move on to the next project. The owner answers for what the system does in production, approves changes to what it may do, and decides when it is re-checked or retired.

### 2. What may it do?

Write it down, including what it must never do. "Drafts replies to customer complaints for a handler to review" is a scope. So is "never sends anything to a customer directly, and never changes an account". The second sentence is often the one the risk team cares about most.

### 3. How is it logged?

Record its actions as evidence an auditor can ask for: what came in, what it decided, what it did, and who approved it where approval was needed. Debug logs written for developers rarely answer those questions. For high-risk systems the EU AI Act goes further, and Article 12 requires them to allow automatic recording of events over the lifetime of the system.

### 4. Who can switch it off?

Name the person and describe the procedure. Article 14 of the EU AI Act, on human oversight of high-risk systems, expects the people overseeing them to be able to intervene or interrupt the system through a "stop" button or a similar procedure that brings it to a safe halt. Even where the Act doesn't apply, it's a fair test.

Switching off also covers the slower cases. Autonomy is earned, so an agent starts with a narrow scope and gets more only when the evidence supports it. A model upgrade means a re-check, because the system you approved is no longer the system you're running. Old agents get retired, on purpose, by their owner.

## Governance you may already have

Most regulated firms don't need a new governance machine for AI. They need to point the one they have at it.

At Sonnedix, a global renewable energy producer, I built the architecture function from scratch between 2023 and 2026. It had a governance board and a decision-record framework, and it covered more than 100 applications. Every significant change had an owner, a written decision record and a review. That is the same structure an AI system needs to get through a go-live review, and it is the structure an AI management system asks for.

ISO/IEC 42001, published in December 2023, specifies requirements for establishing, implementing, maintaining and continually improving an AI management system. Many organisations read it and stall, because a management standard describes outcomes and leaves the paperwork to you. In practice, a team ends up producing a small set of artefacts:

- an AI inventory, listing every AI system in use and who owns it
- a risk classification for each one
- named owners
- approval gates before go-live and before any change in scope
- evidence capture, plus a review cadence

If your architecture or change board already keeps decision records, you have the start of most of these. Add AI systems to the inventory, give each one an owner and route them through the board you already run.

## A business case I would trust

A pilot that can't show its value also stalls, more quietly. When I review an AI business case I look for four things.

A measured baseline, so the improvement is compared with how the work is done today. A named owner for the number, who will report it after go-live. A cost line that includes review and governance, because someone has to read the logs, re-check the system after model upgrades and sit on the board. And a stop rule, agreed up front, that says when you will roll it back.

The stop rule is the one most often missing. It is also the one that makes the others honest, because a business case with no exit condition tends to stay open long after the numbers have stopped supporting it.

## What to do on Monday

Pick your most advanced pilot. Answer the four auditor questions about it in writing: who owns it, what it may do, how it is logged and who can switch it off. Then write its stop rule.

If you can do all of that in an afternoon, the pilot is closer to production than you thought. If you can't, you now know what the risk team will ask for. For a wider view of where agents are working today, see [what agentic AI is and where it is working in 2026](insight-what-is-agentic-ai-where-is-it-working.html).

What is the stop rule on your largest AI project?

## How Arithim helps

We help regulated organisations take Claude-based agents and workflows from pilot to production, with the ownership, logging and approval steps built in from the start. Where the gap is evidence for review and approval, our [compliance workflows](services-regulatory.html) capture it as the work moves through. If you're not sure which AI systems you run in the first place, the [AI model inventory](product-ai-model-inventory.html) is a place to start.
