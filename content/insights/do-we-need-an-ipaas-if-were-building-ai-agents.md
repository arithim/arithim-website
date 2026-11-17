+++
title = "Do We Need an iPaaS If We're Building AI Agents?"
slug = "do-we-need-an-ipaas-if-were-building-ai-agents"
date = 2026-11-16
category = "INTEGRATION · RESEARCH"
card_label = "INTEGRATION · RESEARCH"
breadcrumb = "Integration"
description = "Most organisations building AI agents still need an integration platform. Agents act through the same connections, credentials and audit trails an iPaaS already manages, and much integration work is a poor fit for an agent. Based on Gartner's 2026 Magic Quadrant for Integration Platform as a Service."
summary = "Why AI agents rarely replace an integration platform, what Gartner's 2026 iPaaS Magic Quadrant says about agent features, how the Leaders compare, and how to decide."
lede = "Yes, in most cases. AI agents act on the same applications and data that your integrations already connect, and an iPaaS supplies the connectors, access control, monitoring and audit trail that agents would otherwise need rebuilt. Gartner's 2026 Magic Quadrant for iPaaS treats AI features as standard in the market but finds agent capabilities uneven, so choose the platform for integration and judge its agent features as a separate question."
author = "Tarun Bulchandani"
research = true
cta = "Want to know where agents fit alongside the integration platform you already run?"
keywords = [
  "do we need an iPaaS for AI agents",
  "iPaaS and AI agents",
  "integration platform as a service 2026",
  "Gartner Magic Quadrant iPaaS 2026",
  "MCP integration platform",
  "AI agent orchestration platform",
  "iPaaS vendor comparison",
  "agentic integration",
]
about = ["Integration platform as a service", "AI agents", "Integration"]
footnote = "Gartner does not endorse any vendor, product or service depicted in its research publications, and does not advise technology users to select only those vendors with the highest ratings or other designation. Gartner research publications consist of the opinions of Gartner's research organisation and should not be construed as statements of fact. GARTNER and MAGIC QUADRANT are registered trademarks of Gartner, Inc. and/or its affiliates."

[citation]
name = "Magic Quadrant for Integration Platform as a Service"
publisher = "Gartner, Inc."
date = 2026-03-16
identifier = "G00836353"
url = "https://www.gartner.com/doc/reprints?id=1-2N0PNGJC&ct=260317&st=sb"

[[mentions]]
name = "Gartner"
url = "https://www.gartner.com/"

[[mentions]]
name = "Boomi"
url = "https://boomi.com/platform/"

[[mentions]]
name = "Microsoft Azure Integration Services"
url = "https://azure.microsoft.com/en-us/solutions/integration-services/"

[[mentions]]
name = "Informatica Intelligent Data Management Cloud"
url = "https://www.informatica.com/platform.html"

[[mentions]]
name = "MuleSoft Anypoint Platform"
url = "https://www.mulesoft.com/platform/enterprise-integration"

[[mentions]]
name = "SAP Integration Suite"
url = "https://www.sap.com/products/technology-platform/integration-suite.html"

[[mentions]]
name = "Workato"
url = "https://www.workato.com/"

[[mentions]]
name = "Oracle Integration"
url = "https://www.oracle.com/integration/"

[[mentions]]
name = "Tray.ai"
url = "https://tray.ai/"

[[mentions]]
name = "Zapier"
url = "https://zapier.com/"

[[mentions]]
name = "Model Context Protocol"
url = "https://modelcontextprotocol.io/"

[[mentions]]
name = "Agent2Agent Protocol"
url = "https://a2a-protocol.org/"

[[faq]]
q = "Do AI agents replace an integration platform?"
a = "Rarely. Agents still need governed connections to the systems they act on, and much integration work, such as keeping records in step between systems, high-volume B2B exchange and EDI, needs predictable behaviour that an agent does not offer. Most organisations will run agents on top of an integration platform, calling it through APIs or the Model Context Protocol."

[[faq]]
q = "What is an iPaaS?"
a = "Integration platform as a service is a vendor-managed cloud service for building integrations between applications, services and data sources, inside or outside the organisation. Gartner's definition requires a cloud control plane, a vendor-managed runtime, low-code design tools, software lifecycle tooling, role-based access control and operational monitoring."

[[faq]]
q = "Which iPaaS vendors are Leaders in Gartner's 2026 Magic Quadrant?"
a = "Gartner's March 2026 Magic Quadrant for Integration Platform as a Service names six Leaders out of 18 vendors evaluated: Boomi, Microsoft, Salesforce (Informatica), Salesforce (MuleSoft), SAP and Workato. Gartner assessed Informatica and MuleSoft separately because Salesforce's acquisition of Informatica closed after the research cutoff."

[[faq]]
q = "Should AI agent orchestration run in our ERP or CRM suite or in a separate platform?"
a = "Gartner's Predicts 2026 report expects that by 2030, 60% of organisations will adopt AI agent orchestration platforms from vendors outside their existing enterprise application suite, because agents will come from several vendors. Set governance rules early on which work stays inside one platform and which is orchestrated across vendors."

[[faq]]
q = "What should we ask an iPaaS vendor about AI agents?"
a = "Ask whether it supports MCP and Agent2Agent today or only on its roadmap, how it enforces policy, confidence thresholds and human approval on AI-driven actions, what it records for audit, where its control plane and runtimes are hosted, and how agent usage is priced."

[[sources]]
text = "Gartner, [Magic Quadrant for Integration Platform as a Service](https://www.gartner.com/doc/reprints?id=1-2N0PNGJC&ct=260317&st=sb), Andrew Humphreys, Keith Guttridge et al., 16 March 2026, ID G00836353. Complimentary reprint; the link may expire."

[[sources]]
text = "Gartner, [Predicts 2026: The New Era of Agentic Automation Begins](https://www.gartner.com/doc/reprints?id=1-2NBSQ18V&ct=260508&st=sb), Arthur Villa, Saikat Ray et al., 1 December 2025, ID G00840857. Complimentary reprint; the link may expire."

[[sources]]
text = "Vendor product pages for Boomi, Microsoft Azure Integration Services, Informatica, MuleSoft, SAP Integration Suite, Workato, Oracle Integration, Tray.ai and Zapier; [Model Context Protocol](https://modelcontextprotocol.io/); [Agent2Agent Protocol](https://a2a-protocol.org/). Accessed 17 November 2026."
+++
Teams that start building AI agents soon ask whether they still need an integration platform, or whether agents can call applications directly and make the iPaaS redundant. This article answers that from two Gartner reports: the [Magic Quadrant for Integration Platform as a Service](https://www.gartner.com/doc/reprints?id=1-2N0PNGJC&ct=260317&st=sb), published in March 2026, which evaluates 18 vendors, and [Predicts 2026: The New Era of Agentic Automation Begins](https://www.gartner.com/doc/reprints?id=1-2NBSQ18V&ct=260508&st=sb).

## What an iPaaS does

Gartner defines an iPaaS as a vendor-managed cloud service for building integrations between applications, services and data sources, whether they sit inside the organisation or outside it. A qualifying platform supports at least one of three patterns. It keeps data consistent by passing changes between systems, it runs multistep processes across applications, agents and services, and it exposes combined services as APIs or events.

The mandatory features are worth reading closely, because they are the same things an agent needs. Gartner requires a cloud control plane, a runtime that the vendor manages (in its cloud or on the customer's infrastructure), low-code design tools, tooling for the software lifecycle, role-based access control, and monitoring, alerting and auditing.

The market is large and still growing quickly. Gartner's figures put iPaaS revenue at $8.5 billion in 2024, up 23.4% from $6.9 billion in 2023, and it forecasts more than $18 billion by 2029.

## Why agents still need integration

An agent is only useful when it can read from and act on real systems, such as the ERP, the CRM, the service desk or a supplier portal. Each of those connections needs credentials, error handling, retries, logging and someone who notices when it breaks. An iPaaS already does that work for the integrations you run today. If agents bypass it, each agent team ends up rebuilding connectors and access rules on its own, and the audit trail splits across several places.

A good share of integration work also suits an agent badly. Keeping customer records in step between two systems, moving high volumes of B2B orders or running EDI with trading partners all need the same result every time. A deterministic flow is cheaper and easier to check for that kind of work.

The Predicts report gives a sense of the gap. Agents that work through an application's screens, which Gartner calls computer use agents, had an average success rate of 45% on a 50-step process, well below RPA on comparable tasks. They were also slower and had high variable costs. An API integration that runs the same steps correctly every time is a better foundation, with the agent handling the judgement calls on top.

Gartner's iPaaS report makes a related point from the other side. It says buyers now need an "AI control layer" in their integration platform, which enforces policy, confidence thresholds, human decision points and audit trails for actions that AI drives.

## What Gartner says about AI in the iPaaS market

AI-ready integration is now a main reason people buy, according to the Magic Quadrant. Gartner treats AI features for generating flows, mapping fields, testing, documentation and spotting runtime anomalies as mandatory, so they no longer separate one vendor from another. It tells buyers to judge how deep those features go, how they are governed and whether they are ready for enterprise use.

Agent capabilities are less mature. Gartner found that most vendors still describe agent builders, agent orchestration, retrieval pipelines and AI governance as roadmap items, experiments or near-term differentiators. It expects agent capabilities among iPaaS vendors to mature over the 12 to 24 months from March 2026, with more emphasis on AI governance.

Gartner says buyers need support for the [Model Context Protocol](https://modelcontextprotocol.io/) (MCP), which connects AI models to tools and data, and for [Agent2Agent](https://a2a-protocol.org/) (A2A), which lets agents talk to each other. Many of the vendor profiles in the report mention MCP servers or gateways.

## How the Leaders compare on agents

Gartner placed six vendors in the Leaders quadrant. Their profiles show how differently each one approaches agents.

Gartner credits [Boomi](https://boomi.com/platform/) with strong AI-native features, including MCP servers and its Agentstudio product for building and managing agents. Gartner cautions that its portfolio is fragmented, that its control plane was hosted only in the US at the time of research, and that its Peer Insights satisfaction scores are lower.

[Microsoft Azure Integration Services](https://azure.microsoft.com/en-us/solutions/integration-services/) has more than 1,400 connectors and data centres in 70 regions, and it serves both professional developers and low-code users. Gartner notes that it is a set of separate services, and that buyers working across several clouds will need a third-party layer for unified governance.

Salesforce owns two Leaders. [Informatica's Intelligent Data Management Cloud](https://www.informatica.com/platform.html) is data-centric, with its CLAIRE AI for workflows, but entry costs are high. [MuleSoft's Anypoint Platform](https://www.mulesoft.com/platform/enterprise-integration) is API-first, with agent integration and MCP and A2A support, though Gartner flags complex pricing with overage charges. For both, Gartner raises roadmap uncertainty now that one company owns two iPaaS products.

[SAP Integration Suite](https://www.sap.com/products/technology-platform/integration-suite.html) has more than 4,000 prebuilt flows and 250 third-party adapters. Gartner says some advanced users see its agent features as lagging, because its recent roadmap has focused on moving customers off older SAP integration tools.

[Workato](https://www.workato.com/) offers Enterprise MCP and an AI layer called AIRO, and scores highly on Peer Insights satisfaction. It runs only on AWS, in six data centre regions.

Outside the Leaders, two profiles matter for agent builders. [Oracle Integration](https://www.oracle.com/integration/) supports AI agents, MCP and human approval steps, which matches the control layer Gartner describes. [Tray.ai](https://tray.ai/) puts process automation, integration, API management, an MCP gateway and agent development in one platform, but lacks EDI, message brokering and event management.

At the low-cost end, [Zapier](https://zapier.com/) offers a free tier, public pricing, MCP and Zapier Agents, but has no API management, event streaming or EDI and no announced plans to add them.

## Should agent orchestration live in your suite or somewhere independent?

The Predicts report expects that by 2030, 60% of organisations will adopt AI agent orchestration platforms from vendors outside their existing enterprise application suite. Gartner's reasoning is that agents will come from several vendors, and organisations piloting agents built on different platforms already struggle to coordinate them. Buyers have preferred independent tools for integration over the past 30 years, and Gartner expects the same pattern for agents.

That makes the integration platform a natural place for orchestration, provided it supports open protocols. Gartner advises setting governance principles early, covering which work runs inside a single platform and which is coordinated across vendors, along with roles, risk management and integration standards. It also recommends granular role-based access, data masking, credentials kept in secure vaults, agent interactions that follow API, MCP or A2A standards, and full traceability of every agent action.

Gartner also warns against assuming one iPaaS will cover everything. It recommends a strategic iPaaS plus targeted specialist platforms where they are justified, for example for lightweight SaaS automation, high-volume B2B or advanced event processing.

## How to decide

If you already run an iPaaS, keep it and connect your agents through it. The useful questions are about its agent features and governance:

1. Does it support MCP and A2A in production today, or only on its roadmap?
2. Can it enforce policy, confidence thresholds and human approval on actions an agent takes, and record each one for audit?
3. Where do its control plane and runtimes run? Gartner says data sovereignty is now driving purchases, and some vendors host their control planes in only one or two regions.
4. How is agent usage priced? Gartner flags cost predictability and overage risk as a concern across vendors.

If you don't run one yet, Gartner's advice is to set out your integration priorities and architecture before you choose. Look at the connectivity you need, the skills of the people who will build integrations, reliability targets, security and compliance, hosting locations and total cost of ownership. Then judge agent features on top of that, knowing they will change quickly over the next two years.

For a wider view of where agents are working today, see [what agentic AI is and where it is working in 2026](insight-what-is-agentic-ai-where-is-it-working.html). If a pilot already works but cannot get through risk review, [why AI pilots stall before production](insight-why-ai-pilots-stall-before-production.html) covers the evidence an auditor will ask for.

## Where agents help

We build agents that work through the integration platform a customer already runs. Take an agent that handles exceptions in order-to-cash. It reads failed or held transactions from the iPaaS monitoring, looks up the order, customer and contract through the platform's existing connectors, works out the likely cause and drafts the fix, such as a corrected mapping, a re-submission or a note to the account owner. A person approves the change before the agent applies it, and the integration platform records the action alongside every other flow.

The agent has its own identity and only the access that job needs. It calls the platform through MCP or its APIs, so the customer keeps one place to see what touched each system. When a customer moves to a different iPaaS or adds a specialist one, the agent's prompts, tests and approval rules move with it.
