+++
title = "Can AI Agents Keep Our Architecture Repository Up to Date?"
slug = "can-ai-agents-keep-our-architecture-repository-up-to-date"
date = 2026-10-26
category = "EA · RESEARCH"
card_label = "EA · RESEARCH"
breadcrumb = "Enterprise architecture"
description = "AI agents can find drift between an architecture repository and the systems it describes, and propose fixes for an architect to approve. They cannot yet be trusted to edit it unattended. Based on Gartner's 2026 research on enterprise architecture tools and the context layer for AI agents."
summary = "What Gartner says about stale EA repositories, what agents can reconcile today, why data quality and trust limit them, and what to check in your EA tool before you try."
lede = "Partly. AI agents can compare an enterprise architecture repository with the CMDB, cloud accounts, contracts and change tickets, spot what has drifted and propose updates for an architect to approve. Gartner's 2026 research says practitioners still struggle with data quality and with AI output they cannot trust for critical decisions, so the sensible set-up has an agent doing the checking and a person approving what goes in."
author = "Tarun Bulchandani"
research = true
cta = "Want to see how much of your architecture repository has drifted from reality?"
keywords = [
  "can AI keep enterprise architecture repository up to date",
  "AI agents enterprise architecture",
  "architecture repository automation",
  "EA tool MCP server",
  "keep CMDB and EA tool in sync",
  "context layer for AI agents",
  "enterprise architecture tools 2026",
  "Gartner enterprise architecture AI",
]
about = ["Enterprise architecture", "AI agents", "Architecture repositories"]
footnote = "Gartner does not endorse any vendor, product or service depicted in its research publications, and does not advise technology users to select only those vendors with the highest ratings or other designation. Gartner research publications consist of the opinions of Gartner's research organisation and should not be construed as statements of fact. GARTNER and MAGIC QUADRANT are registered trademarks of Gartner, Inc. and/or its affiliates."

[citation]
name = "Magic Quadrant for Enterprise Architecture Tools"
publisher = "Gartner, Inc."
date = 2026-10-13
identifier = "G00842974"
url = "https://www.gartner.com/doc/reprints?id=00ThR00000O0uUFUAZ&ct=261019&st=sb"

[[mentions]]
name = "Gartner"
url = "https://www.gartner.com/"

[[mentions]]
name = "Model Context Protocol"
url = "https://modelcontextprotocol.io/"

[[mentions]]
name = "Ardoq"
url = "https://www.ardoq.com/platform-overview"

[[mentions]]
name = "SAP LeanIX"
url = "https://www.leanix.net/en/"

[[mentions]]
name = "ServiceNow"
url = "https://www.servicenow.com/products/enterprise-architecture.html"

[[mentions]]
name = "Orbus Software"
url = "https://www.orbussoftware.com/landing-pages/orbusinfinity-enterprise-architecture"

[[mentions]]
name = "Bee360"
url = "https://www.bee360.com/product"

[[mentions]]
name = "Avolution"
url = "https://www.avolutionsoftware.com/abacus/"

[[faq]]
q = "Can AI agents update an enterprise architecture repository automatically?"
a = "They can propose updates automatically, and some tools let an agent write to the repository, but Gartner's 2026 research says practitioners find AI output hard to trust for critical decisions. Most teams should let an agent compare the repository with source systems and queue changes for an architect to approve, then widen what it may change without approval as its record builds up."

[[faq]]
q = "Why does an architecture repository go out of date?"
a = "Gartner describes EA teams caught in nonstop manual maintenance. The repository depends on feeds from the CMDB, planning, finance and process tools, and each feed has its own data quality and owners. Applications are bought, retired and renamed faster than anyone updates the model."

[[faq]]
q = "Do EA tools support MCP so that AI agents can connect to them?"
a = "Some do. Gartner says buyers increasingly see MCP access as essential. In its 2026 Magic Quadrant it notes that Bee360 provides a vendor-managed MCP server, that SAP LeanIX has shipped interactive MCP apps, and that Orbus Software trails most peers on customer-accessible MCP. Check the current state of each product with the vendor before you rely on it."

[[faq]]
q = "What data does an AI agent need to maintain an architecture repository?"
a = "Gartner's research on the context layer for AI agents names three components. Semantics defines what your entities and rules mean, operational state gives the agent right-time access to systems, and provenance records what the agent decided and why. An EA repository already holds much of the first, which is why the second and third decide how far an agent can be trusted."

[[faq]]
q = "Will AI pricing change what an EA tool costs?"
a = "Probably. Gartner reports that vendors are moving from per-seat licensing towards consumption- and outcome-based pricing, because people increasingly query company-wide AI assistants instead of opening the EA tool. Ask each vendor how AI usage is metered and what happens when an agent runs every night."

[[sources]]
text = "Gartner, [Magic Quadrant for Enterprise Architecture Tools](https://www.gartner.com/doc/reprints?id=00ThR00000O0uUFUAZ&ct=261019&st=sb), Austin Steinmetz, Rowan Wakeford et al., 13 October 2026, ID G00842974. Complimentary reprint; the link may expire."

[[sources]]
text = "Gartner, [The 3 Core Components of the Context Layer for AI Agents](https://www.gartner.com/doc/reprints?id=1-2NCKLMK5&ct=260514&st=sb), Andrés García-Rodeja, Michael Gonzales et al., 11 March 2026, ID G00848874. Complimentary reprint; the link may expire."

[[sources]]
text = "Vendor product pages and the [Model Context Protocol](https://modelcontextprotocol.io/) site, as linked. Accessed 3 November 2026."
+++
Most architecture repositories start going stale the day after they are updated. This piece looks at whether AI agents can fix that. It draws on two Gartner reports, the [Magic Quadrant for Enterprise Architecture Tools](https://www.gartner.com/doc/reprints?id=00ThR00000O0uUFUAZ&ct=261019&st=sb) from October 2026 and [The 3 Core Components of the Context Layer for AI Agents](https://www.gartner.com/doc/reprints?id=1-2NCKLMK5&ct=260514&st=sb) from March 2026.

## Why the repository goes out of date

Gartner calls the core problem in this market constant manual maintenance, and it says the ideal opportunity for EA teams is to end it and get a live view of the organisation's current state. The repository is meant to capture the relationships between applications, capabilities, processes, roles, information and technology. It also has to connect to the CMDB, planning, financial and business process tools. Gartner points out that its value therefore depends on data access, data quality and data governance across all of those systems.

That dependence explains the drift. Each connected system has its own owners and its own errors, and the architecture team sits at the end of the chain. When a team buys a new application, retires an old one or changes an owner, the repository only learns about it if somebody remembers to say so.

## What an agent can do about it

The task suits an agent because it is repetitive, the sources are known, and a mistake is easy to spot when a person looks at a proposed change. An agent can read the repository and the systems that change around it, then work out where they disagree. One example is an application that appears in the single sign-on list but not in the repository. Another is an owner who has left the company.

For this job the agent needs read access to the sources, a clear rule for what counts as a match, and a queue where its proposals wait for review. We described the same pattern for security findings in [how to reduce your application security backlog](insight-how-to-reduce-application-security-backlog.html), where the agent follows an item through to a verified result and a person approves the change.

## What the EA tool vendors are doing

Gartner reports that AI is the main driver of change in the market this year, and the vendors are splitting into two groups. Some are building agents into the product. Gartner credits ServiceNow with cross-product AI agent orchestration and a native CMDB, and it says ServiceNow and SAP LeanIX lead on AI agents and AI usage. Others rely on your own agents connecting from outside.

For that second route the connection point is the Model Context Protocol. Gartner says buyers increasingly see MCP access as essential, and it names a few examples. Bee360 provides a vendor-managed MCP server, SAP LeanIX has shipped interactive MCP apps, and Orbus Software trails most peers on customer-accessible MCP. The [Model Context Protocol](https://modelcontextprotocol.io/) is an open standard, so an agent you build or buy for another purpose can often read an EA tool that supports it.

There are gaps. Gartner notes that Avolution's ABACUS has no native artifact generation, component discovery or content enrichment, and that fewer than a quarter of the AI capabilities UNICOM proposed were generally available. Product pages and roadmaps describe intent, so test the specific feature you need before you rely on it. Vendor pages for reference include [Ardoq](https://www.ardoq.com/platform-overview), [SAP LeanIX](https://www.leanix.net/en/), [ServiceNow](https://www.servicenow.com/products/enterprise-architecture.html), [Orbus Software](https://www.orbussoftware.com/landing-pages/orbusinfinity-enterprise-architecture), [Bee360](https://www.bee360.com/product) and [Avolution](https://www.avolutionsoftware.com/abacus/).

## Why you cannot hand it over completely

Gartner is direct about two problems that practitioners face with AI inside EA tools. The first is data quality. The second is AI output that is hard to trust when the decision matters. A wrong owner or dependency written into the repository is hard to spot, and other people then build roadmaps on top of it.

The context layer report explains the mechanism. Gartner says agents behave unreliably and cost more when a large language model works on poorly prioritised or noisy data without effective filtering. It describes the context layer as three components that have to work together. Semantics is the explicit meaning and relationships in business data, operational state is right-time access to what is happening in the business, and provenance is a record of the agent's decisions, actions and outcomes, with feedback collected on them.

An EA repository is a good deal of the first component already, because it holds entities, relationships and ownership. What an agent still needs is the second, live access to the CMDB, cloud and contract data, and the third, a log that shows why it proposed each change. Gartner also says that the context layer is not an off-the-shelf product. It has to be assembled from services and custom modelling, and Gartner advises starting with one or two high-value use cases rather than building everything at once. Keeping an EA repository current looks like a sensible first use case.

## Cost and ownership

Two commercial points can catch buyers out. Gartner reports that vendors are moving from per-seat licensing towards consumption- and outcome-based pricing, because customers increasingly ask company-wide AI assistants for architecture answers rather than opening the EA tool. An agent that checks the repository every night will use more of whatever is metered than a human does.

Gartner also notes that Ardoq, GBTEC and ins-pi absorb or avoid third-party model costs, and warns that this may put pressure on their margins as agentic workflows grow. It tells buyers to check contract language on future AI features. Separately, Gartner flags some EA teams building their own AI tools on coding platforms to copy EA tool features, and treats that as an unmanaged AI risk. If you build a maintenance agent, give it an owner, access limits and a log like any other system.

## How to try it

1. Pick one source of truth to compare against, such as the CMDB or the single sign-on application list, and one slice of the repository, such as applications and owners.
2. Check that your EA tool exposes what the agent needs through an API or an MCP server, and ask the vendor how usage is charged.
3. Have the agent propose changes only. Keep a person approving each one at first.
4. Log every proposal with the evidence that triggered it, and record whether the architect accepted it.
5. Measure how often proposals are accepted before widening the agent's scope. Gartner proposes a similar measure for agent reliability, the share of actions with positive business outcomes.

Gartner's context layer paper suggests two further measures that suit this kind of pilot. Retrieval precision is the share of retrieved items that turn out to be relevant, and recall is the share of all relevant items that the agent found. For a repository agent, that translates into how many of its flagged differences were real, and how many real differences it missed. Gartner also proposes tracking the share of agent actions that comply with rules and policies, using audit logs or automated validation, which gives the architecture team evidence for widening the agent's remit.

## Where agents help

Keeping the repository current is the job we think agents should take on first. The agent Arithim would build for this problem reads the sources that change, including the CMDB, cloud accounts, the single sign-on application list, software contracts and change tickets. It compares them with the repository in whichever EA tool you already own, and it posts proposed updates with their evidence for an architect to approve. It has its own identity and limited access, it logs each decision with its reasoning, and it never writes to the repository without a person's approval.

The architect decides what the repository says, and the agent takes over the data entry. Which EA tool to run it against is covered in [how to choose an enterprise architecture tool](insight-how-to-choose-an-enterprise-architecture-tool.html).
