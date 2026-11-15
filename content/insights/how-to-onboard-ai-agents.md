+++
title = "How Do You Onboard AI Agents the Way You Onboard Staff?"
slug = "how-to-onboard-ai-agents"
date = 2026-11-14
category = "AI GOVERNANCE"
card_label = "AI GOVERNANCE"
breadcrumb = "AI governance"
description = "Give every AI agent the lifecycle you give a new member of staff: a requisition, a job description with a never list, a named owner, a supervised start, autonomy it earns, and a retirement step. Treat every model upgrade as a re-hire."
summary = "An HR-style lifecycle for AI agents, from requisition to retirement, with a one-page checklist per agent and four things to do on Monday."
lede = "Run each agent through the same lifecycle you use for a new hire: a requisition, a job description that includes what it must never do, a named owner, a supervised start, more autonomy once it has a record, and a retirement step. A model upgrade counts as a re-hire, so the agent gets checked again. Most organisations would never give a new starter production access on day one with no job description, no manager and no probation period, yet agents often go live with none of the three."
author = "Tarun Bulchandani"
cta = "Not sure who owns the agents already running in your business?"
keywords = [
  "how to onboard AI agents",
  "AI agent governance",
  "AI agent lifecycle management",
  "who owns an AI agent",
  "AI agent ownership and accountability",
  "AI agent job description",
  "AI agent inventory",
  "managing AI agents like employees",
]
about = ["AI governance", "AI agents", "Agentic AI", "Risk management"]

[[faq]]
q = "What does it mean to onboard an AI agent?"
a = "It means putting an agent through the steps you would use for a new member of staff before it touches real work. Someone requests it, it gets a job description with a list of things it must never do, a named person owns it, it starts under supervision and earns more freedom over time, and there is a planned way to retire it."

[[faq]]
q = "Who should own an AI agent?"
a = "One named person. A team is too easy to hide behind, and teams change. The owner answers for what the agent does, decides when it gets more autonomy and decides when it retires. When that person leaves, ownership should pass to someone by name before they go, as it would for any system they looked after."

[[faq]]
q = "Does a model upgrade really need a new review?"
a = "Yes. The agent keeps its name, but the model behind it is what does the reasoning, so its behaviour can change in ways nobody asked for. Treat the upgrade as a re-hire: check it against its job description and never list again before it goes back to its old level of autonomy."

[[faq]]
q = "Is agent onboarding an HR job or a technology job?"
a = "Both. HR already knows how to write a role, assign a manager and run a probation period. Technology knows what access the agent holds and how to switch it off. Neither can run the lifecycle alone, so the ownership should be shared and written down."

[[faq]]
q = "What is the first step if we already have agents running?"
a = "List them. You cannot govern agents you cannot list. Once you have the list, name an owner for each one, write each a never list, and agree that the next model upgrade will be treated as a re-hire."
+++

You would not give a new hire production access on their first day without a job description, a manager or a probation period. With AI agents, organisations do exactly that all the time. An agent gets built in a sprint, connected to a few systems and switched on. Months later someone asks who is responsible for it, and nobody has an answer ready.

At Arithim, our view is that you should onboard agents the way you onboard people. Companies already have a working process for bringing a new member of staff into the business, giving them a defined role and widening their responsibilities as they prove themselves. Most of it carries over to agents with very little change.

For more on what agents are and where they are working, see [what agentic AI is and where it is working in 2026](insight-what-is-agentic-ai-where-is-it-working.html). That piece recommends giving each agent its own identity and a named human owner. This one sets out the rest of the lifecycle around that owner.

## The lifecycle, from requisition to retirement

There are six stages: requisition, job description, named owner, supervised start, earned autonomy and retirement. One rule runs across all of them: a model upgrade is a re-hire.

### Requisition

A new role starts with someone asking for it and saying why. Agents should start the same way. Before anyone builds one, a person should write down what work it will take on, which systems it needs and who agreed to it. That record is also the first line of your agent inventory, which matters later.

### A job description with a never list

A job description says what the agent does. It should also say what the agent must never do. We call that the never list, and it is usually the more useful half. An agent that handles supplier invoices might be allowed to read invoices and draft payment runs, while its never list says it must not approve a payment, change bank details or email a supplier directly.

Writing the never list forces a conversation that rarely happens otherwise, about which actions are too risky to hand over at any level of trust. It also gives you something concrete to test against.

### A named owner

The owner is a person. A team cannot be called into a meeting, and teams get reorganised. The owner answers for what the agent does, decides when it gets more freedom and decides when it should stop.

Ask this in your own organisation: who owns the agent when the person who built it leaves? In many cases the builder was the owner by default, and nobody planned for their departure. Ownership should pass to a new name before they go, the way it would for any system they looked after.

### Supervised start and earned autonomy

On day one the agent works under supervision. A person reviews its output or approves its actions before they take effect. As the agent builds a record of doing the job well, the owner can give it more room, perhaps letting it act alone on low-value cases while people still approve the rest.

Autonomy is earned this way, as it is for a new hire on probation. It should also be recorded, so anyone can see what level of freedom each agent has today and who granted it.

### A model upgrade is a re-hire

This is the step organisations miss most often. When the model behind an agent changes, the agent keeps its name, its access and its place in the workflow. The thing doing the reasoning is new, though. It is the same name with a different employee behind it.

So re-check it. Run it against its job description and its never list, and consider dropping it back to supervised work until it has shown the new model behaves as the old one did. The owner should know an upgrade is coming before it happens, and should not find out from a change in behaviour.

### Retirement

Every agent needs a way out. When a process changes or a better tool arrives, the old agent should be switched off, its access removed and its record closed. Without a retirement step, old agents keep running quietly, holding credentials nobody remembers granting and doing work nobody checks.

## Why this is the shape an auditor wants to see

Auditors and regulators ask the same questions of any system that acts on a company's behalf: who is responsible for it, what is it allowed to do, and how do you know it stays within that? If you cannot say who owns an agent and what it may do, you cannot evidence control. And you cannot govern agents you cannot list.

The lifecycle produces that evidence as a by-product. The requisition is your inventory entry. The job description and never list define what the agent may do. The owner is your accountable person, and the autonomy record shows how decisions about trust were made. Standards such as ISO/IEC 42001, the international standard for an AI management system, are a natural home for this kind of record if you are working towards one.

## One page per agent

You do not need a heavy system to start. One page per agent, kept where your other system records live, should hold:

- the job description, including the never list
- the named human owner
- the agent's current level of autonomy
- a note that any model upgrade triggers a re-check
- the retirement step, and what switching it off involves

If a page is hard to fill in, the agent is probably not under control yet.

## What to do on Monday

Start small. List every agent you run, including the ones built by individual teams. Name an owner for each one. Write each agent a never list. Then agree that the next model upgrade, whenever it comes, will be treated as a re-hire.

None of this needs new software, and it answers the first question an auditor is likely to ask.

## HR and technology have to share this

HR already knows how to write a role, assign a manager, run a probation period and manage a leaver. Technology knows what access an agent holds, how to monitor it and how to switch it off. Agent onboarding needs both, and it tends to fail when one side assumes the other has it covered. Agree who runs each stage, and write it down.

## How Arithim helps

We help organisations work out which agents they already run and put an owner, a job description and a never list against each one. This fits into an [AI readiness assessment](services-ai-readiness.html). If you are not sure where to start, the list of agents is the place.
