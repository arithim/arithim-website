+++
title = "Agentic AI in 2026: where is it actually working?"
slug = "agentic-ai-where-is-it-working"
kind = "keynote"
date = 2026-11-15
minutes = 20
speaker = "Tarun Bulchandani"
topic = "Agentic AI"
description = "Slides and speaker notes from Tarun Bulchandani's keynote on agentic AI in 2026: what an agent is, how far adoption has got, the five patterns that work today, where agents fall short and five steps before your first agent. Based on Gartner's 2026 Hype Cycle for Agentic AI."
lede = "In 2026, agentic AI works best on bounded, repetitive work where a person approves the risky steps, and most clearly in software engineering. These are the slides from the talk, with the speaker notes and sources underneath."
source_insight = "what-is-agentic-ai-where-is-it-working"
cta = "Want to know which of your processes an agent could take on first?"
keywords = [
  "agentic AI keynote",
  "agentic AI 2026 slides",
  "where is agentic AI working",
  "AI agents in the enterprise",
  "agentic AI adoption",
  "Gartner Hype Cycle for Agentic AI 2026",
]
about = ["Agentic AI", "AI agents", "Automation"]
footnote = "Gartner does not endorse any vendor, product or service depicted in its research publications. Gartner research publications consist of the opinions of Gartner's research organisation and should not be construed as statements of fact. GARTNER and HYPE CYCLE are registered trademarks of Gartner, Inc. and/or its affiliates."

[[faq]]
q = "What is agentic AI?"
a = "Software that works towards a goal by planning steps, using tools and acting in other systems. A chatbot answers a prompt and RPA replays a fixed script; an agent decides its own next step."

[[faq]]
q = "Where are AI agents working in 2026?"
a = "Most clearly in software engineering. Elsewhere, on bounded and repetitive tasks, domain-specific work held to the domain's procedures, screen-based tasks on systems with no API, tightly controlled multi-agent workflows with a checking step, and data extraction from common documents."

[[faq]]
q = "Can I use these slides?"
a = "Yes. Link to this page when you share or quote them, so people can find the notes and sources. To have this talk at your event, [get in touch](contact.html)."

[[sources]]
text = "Gartner, [Hype Cycle for Agentic AI, 2026](https://www.gartner.com/doc/reprints?id=1-2NOY9EK5&ct=260709&st=sb), Rajesh Kandaswamy, Leinar Ramos et al., 2 April 2026 (updated 20 July 2026), ID G00842058. Complimentary reprint; the link may expire."

[[sources]]
text = "Gartner, [Predicts 2026: The New Era of Agentic Automation Begins](https://www.gartner.com/doc/reprints?id=1-2NBSQ18V&ct=260508&st=sb), Arthur Villa, Saikat Ray et al., 1 December 2025, ID G00840857. Complimentary reprint; the link may expire."

[[sources]]
text = "[Model Context Protocol](https://modelcontextprotocol.io/); [OpenTelemetry](https://opentelemetry.io/). Accessed 9 November 2026."
+++

--- title
kicker: Keynote · Agentic AI
# Agentic AI in 2026: where is it ==actually working==?
notes: This talk draws on two Gartner reports: the Hype Cycle for Agentic AI, 2026, which profiles 33 technologies, and Predicts 2026: The New Era of Agentic Automation Begins.

--- statement
kicker: The short answer
## Bounded, repetitive work, with a person approving the ==risky steps==.
And most clearly in software engineering.
notes: Gartner's Hype Cycle says fully autonomous agents are not yet ready for most enterprise work. The agents that work today have a narrow job and a person in the approval path.

--- cards
kicker: What an agent is
## An agent decides its own next step.
- Chatbot | Answers a prompt.
- RPA | Replays a fixed script across screens.
- Agent | Plans, calls tools, acts in other systems and adapts when something changes.
notes: Gartner warns about agent-washing, where assistants, chatbots and RPA products are relabelled as agents. A useful test is whether the product decides its own next step and acts in another system, or simply answers a prompt or replays a script.

--- statement
kicker: Agentic automation
## Very few processes will be handed to an agent alone.
Gartner's wider term covers processes run by agents, conventional automation and people together.
notes: Predicts 2026 uses agentic automation for business processes run by a mix of AI agents, RPA and workflow tools, and people. That is closer to how most organisations will actually use agents.

--- stats
kicker: How far adoption has got
## Adoption is ==early==.
- 17% | of organisations have deployed AI agents
- 42% | expect to within 12 months
- 22% | expect to in the year after that
notes: These figures come from Gartner's 2026 CIO and Technology Executive Survey. Most early use automates workflows that already exist; very few organisations have redesigned a process around agents yet.

--- stats
kicker: Agents inside your software
## They are arriving in the applications you already run.
- <5% | of enterprise applications had task-specific agents in 2025
- 40% | expected by the end of 2026
notes: Interest is running well ahead of deployment. Gartner reports that client inquiries about agentic technologies rose by more than 1,700% in 2025.

--- stats
kicker: Where it works
## Software engineering is the ==clearest success==.
- 90% | of engineering leaders say AI has increased productivity
- <25% | the gain most of them report
notes: Coding agents now take on feature work, tests, code review and modernisation, with a developer reviewing the output. The figures come from Gartner's 2026 software engineering survey. It is the one area where Gartner sees significant growth.

--- list
kicker: Outside engineering
## Five patterns that work today.
- Bounded, repetitive tasks | Clear steps and a clear right outcome
- Domain agents in regulated work | Claims, legal files and clinical coding, held to the domain's procedures
- Agents that use screens | IT support, web testing, data entry into systems with no API
- Tightly controlled multi-agent set-ups | With a checking step in the workflow
- Document extraction | Invoices, receipts and passports
notes: Enterprise AI assistants are the most widespread form, with more than half of the target market already using them. They mostly help people draft, analyse and report, and make fewer decisions on their own.

--- stats
kicker: Where it falls short
## Predictability is the ==main limit==.
- 45% | average success rate for screen-based agents on a 50-step process
notes: Many agents can carry out specific tasks but lack the consistency to run unattended. Predicts 2026 puts screen-based agents well below RPA on the same kind of work, and they are slower and cost more per run.

--- cards
kicker: Three more limits
## Cost, security and coordination.
- Cost | Varies run to run with context, tool calls, retries and reasoning time.
- Security | Prompt injection has no general fix. Borrowed logins break the audit trail.
- Coordination | One wrong output spreads down a chain of agents.
notes: Gartner recommends logging tokens, tool calls and cost for every step, capping steps and spend, and sending simple tasks to smaller models. Organisations piloting agents from several vendors struggle to coordinate them, and many agent products only work inside one vendor's environment.

--- quote
> If you agentify a garbage process, even automation will only amplify garbage.
cite: Gartner, Predicts 2026
notes: Analyse the process before you automate it.

--- list numbered
kicker: How to start
## Five steps before your first agent.
- Check whether simpler automation would do | Rules-based workflow or RPA is often cheaper and more reliable for a fixed process
- Analyse the process first
- Keep a person approving high-risk actions | Payments, sensitive data, changes to production
- Give each agent its own identity | Short-lived, least-privilege credentials and a named human owner
- Stay independent of any one vendor | MCP for tools, OpenTelemetry as a minimum for observability
notes: This is Gartner's advice across both reports. Never let an agent reuse an employee's login. Keep your prompts, workflows, policies and tests portable.

--- statement
kicker: Where we think agents help
## Agents that work across the systems you ==already own==.
Each one has its own identity and limited access, logs every decision with its reasoning, and waits for a person to approve changes to production.
notes: Gartner expects that by 2030, 60% of organisations will adopt agent orchestration platforms from vendors outside their existing application suite. We build agents for that position, for example taking a security finding from any scanner through to a merged, verified fix.
