+++
title = "Which AI Agent Framework Should We Use?"
slug = "which-ai-agent-framework-should-we-use"
date = 2026-11-19
category = "AGENTIC AI · RESEARCH"
card_label = "AGENTIC AI · RESEARCH"
breadcrumb = "Agentic AI"
description = "How to choose an AI agent development framework in 2026. Gartner's Innovation Insight on agent frameworks sets out selection criteria and risks, and since it was published Microsoft has archived AutoGen while LangGraph, CrewAI and Google ADK have passed version 1.0."
summary = "What Gartner's Innovation Insight on AI agent development frameworks recommends, how LangGraph, CrewAI, Microsoft Agent Framework, Google ADK, the OpenAI Agents SDK and others stand in November 2026, and how to pick one for a first agent."
lede = "Pick the framework that fits your first, small, single-agent use case, your team's language and the models you need, and plan to use more than one. Gartner's Innovation Insight on AI agent development frameworks recommends choosing on explicit criteria such as ecosystem, tool coverage, memory and multiagent support, and building in evaluation and security from the start. The market has moved since the report, so check each framework's current status before you commit."
author = "Tarun Bulchandani"
research = true
cta = "Want to know which framework would suit the first agent you have in mind, and the systems it would need to reach?"
keywords = [
  "which AI agent framework should we use",
  "AI agent development frameworks",
  "LangGraph vs CrewAI vs Microsoft Agent Framework",
  "Gartner Innovation Insight AI agent development frameworks",
  "is AutoGen still maintained",
  "Google ADK vs OpenAI Agents SDK",
  "how to choose an agent framework",
  "single agent vs multiagent",
]
about = ["AI agent frameworks", "Agentic AI", "Software engineering"]
footnote = "Gartner does not endorse any vendor, product or service depicted in its research publications, and does not advise technology users to select only those vendors with the highest ratings or other designation. Gartner research publications consist of the opinions of Gartner's research organisation and should not be construed as statements of fact. GARTNER is a registered trademark of Gartner, Inc. and/or its affiliates."

[citation]
name = "Innovation Insight: AI Agent Development Frameworks"
publisher = "Gartner, Inc."
date = 2025-08-27
identifier = "G00833674"
url = "https://www.gartner.com/doc/reprints?id=1-2LY48OHL&ct=250922&st=sb"

[[mentions]]
name = "Gartner"
url = "https://www.gartner.com/"

[[mentions]]
name = "LangGraph"
url = "https://www.langchain.com/langgraph"

[[mentions]]
name = "LangChain"
url = "https://www.langchain.com/langchain"

[[mentions]]
name = "LangSmith"
url = "https://www.langchain.com/langsmith"

[[mentions]]
name = "CrewAI"
url = "https://www.crewai.com/"

[[mentions]]
name = "Microsoft Agent Framework"
url = "https://learn.microsoft.com/en-us/agent-framework/"

[[mentions]]
name = "AutoGen"
url = "https://github.com/microsoft/autogen"

[[mentions]]
name = "Google Agent Development Kit"
url = "https://adk.dev/"

[[mentions]]
name = "OpenAI Agents SDK"
url = "https://openai.github.io/openai-agents-python/"

[[mentions]]
name = "smolagents"
url = "https://huggingface.co/docs/smolagents/index"

[[mentions]]
name = "MetaGPT"
url = "https://github.com/FoundationAgents/MetaGPT"

[[mentions]]
name = "kagent"
url = "https://kagent.dev/"

[[mentions]]
name = "Solace Agent Mesh"
url = "https://solace.com/products/agent-mesh/"

[[mentions]]
name = "Model Context Protocol"
url = "https://modelcontextprotocol.io/"

[[mentions]]
name = "Agent2Agent protocol"
url = "https://a2a-protocol.org/"

[[faq]]
q = "What is an AI agent development framework?"
a = "It is a software library that handles the common parts of building an AI agent, such as calls to the language model, memory, tool use and the orchestration of multistep work. Gartner describes these frameworks as a way to speed up building agents and agentic applications, and notes that most are written in Python."

[[faq]]
q = "Is Microsoft AutoGen still maintained?"
a = "No. The AutoGen repository on GitHub now says the project is archived and that Microsoft provides no bug fixes, security fixes, new features or support. Microsoft points new users to Microsoft Agent Framework, which supports .NET, Python and Go, and publishes a migration guide for existing AutoGen users."

[[faq]]
q = "Should we start with a single agent or a multiagent system?"
a = "Gartner recommends starting with single agents on well-defined, low-risk tasks, such as document summarisation or back-office support. It treats distributed multiagent coordination and autonomous code execution as optional extras that add complexity and security risk, while advising against frameworks that only support distributed multiagent systems."

[[faq]]
q = "Can we use more than one agent framework?"
a = "Yes. Gartner recommends combining frameworks where one does not cover every need. Protocols such as the Model Context Protocol for tools and Agent2Agent for agent-to-agent communication make it easier to connect agents built on different frameworks."

[[faq]]
q = "Are AI agent frameworks free?"
a = "The core libraries of LangGraph, CrewAI, Google ADK, the OpenAI Agents SDK, smolagents and kagent were all under MIT or Apache 2.0 open-source licences when we checked in November 2026. Gartner warns that competition is pushing leading frameworks towards commercial licensing and paid extensions, so check the licence and roadmap before you build on one."

[[sources]]
text = "Gartner, [Innovation Insight: AI Agent Development Frameworks](https://www.gartner.com/doc/reprints?id=1-2LY48OHL&ct=250922&st=sb), Tigran Egiazarov, Arun Batchu et al., 27 August 2025, ID G00833674. Complimentary reprint; the link may expire."

[[sources]]
text = "Project pages, documentation and GitHub release records for LangGraph, LangChain, CrewAI, Microsoft Agent Framework, AutoGen, Google ADK, the OpenAI Agents SDK, smolagents, MetaGPT, kagent and Solace Agent Mesh; [Model Context Protocol](https://modelcontextprotocol.io/); [Agent2Agent protocol](https://a2a-protocol.org/). Accessed 19 November 2026."
+++
Most teams that decide to build their own AI agents reach the same question within a week, which is what to build them with. This article draws on Gartner's [Innovation Insight: AI Agent Development Frameworks](https://www.gartner.com/doc/reprints?id=1-2LY48OHL&ct=250922&st=sb), published on 27 August 2025, and on each framework's own project pages as they stood on 19 November 2026. A good deal has changed in the fifteen months between the two.

## What an agent framework does

Gartner describes AI agent development frameworks as libraries that speed up building agents by abstracting the parts every agent needs. These are calls to the language model, memory, the orchestration of multistep work and the use of tools. Gartner positions them as an accelerator for the top priority of software engineering leaders, which is building AI capabilities into their applications.

In its 2025 AI in Software Engineering Survey, Gartner found that agent frameworks ranked among the top three kinds of platform and tool used to build AI agents. The same survey found that teams in top-performing organisations were significantly more likely to take full ownership of building their agents than teams elsewhere. Gartner's planning assumption is that by 2028, 80% of organisations will report that AI agents, more than developers, consume the majority of their APIs.

The report names several forces pushing adoption along. Language models keep improving, context windows keep growing, and the [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) and the [Agent2Agent protocol](https://a2a-protocol.org/) (A2A) have spread quickly. Against that, Gartner lists the nondeterminism of language models, the lack of established guardrails and rising security and compliance risk.

## Gartner's selection criteria

Gartner's main advice is to choose against explicit criteria that fit the job, and to combine frameworks where one does not cover everything. Its criteria are ecosystem access, tool coverage, memory, ease of use, multiagent support and code execution. The report's wider discussion adds language runtime, the range of model connectors, observability and evaluation, and the licensing trajectory.

Tool coverage means built-in tools, retrieval pipelines, connections to external APIs and support for MCP clients. Memory covers both the short-term context passed between steps and long-term storage in a vector database or a dedicated memory tool. Ease of use includes low-code options; Gartner notes that LangGraph and AutoGen both shipped visual studios for fast experiments.

Gartner says the Google ADK and the OpenAI Agents SDK were optimised for certain model families, while other frameworks supported a broader range. If you expect to switch models, or need to run models offline through tools such as Ollama or LM Studio, test that before you commit.

Most frameworks are written in Python, so Gartner tells teams to invest in Python skills and to connect agents to enterprise systems written in other languages through APIs. It recommends a composable, API-first architecture over embedding agents inside monolithic applications.

## Where each framework stands in November 2026

Gartner's report described a market where most frameworks were below version 1.0 and changing fast, with breaking changes and a real risk of rework. Several of those projects have since passed 1.0, according to their release pages on 19 November 2026.

[LangGraph](https://www.langchain.com/langgraph) from LangChain released version 1.2.23 on 19 November 2026. Gartner describes it as managing communication between agents through an underlying graph. For simpler work Gartner points to [LangChain](https://www.langchain.com/langchain) itself, calling it the most efficient choice for single agents of simple to medium complexity that follow a linear, multistep flow. LangChain's [LangSmith](https://www.langchain.com/langsmith) is one of the external evaluation tools Gartner says frameworks integrate with.

[CrewAI](https://www.crewai.com/) was at version 1.15.43, released the same day. Gartner lists it as a representative framework without product-specific comment.

Gartner's report credits [AutoGen](https://github.com/microsoft/autogen) with both event-driven and synchronous communication between agents. The AutoGen repository now says the project is archived, that Microsoft provides no bug fixes, security fixes, new features or support, and that Microsoft continues to advise against production use. New users are pointed to [Microsoft Agent Framework](https://learn.microsoft.com/en-us/agent-framework/), which supports .NET, Python and Go. Its documentation lists model providers including Microsoft Foundry, Azure OpenAI, OpenAI, Anthropic and Ollama, and describes graph-based workflows that connect agents and functions. If you built a pilot on AutoGen, Microsoft publishes a migration guide.

The [Google Agent Development Kit](https://adk.dev/) has moved well past the model-family caution in Gartner's report. Its Python release reached version 2.14.1 on 12 November 2026, its site offers Python, TypeScript, Go, Java and Kotlin, and its documentation covers Gemini, Gemma, Claude, OpenAI models, Ollama, vLLM and LiteLLM.

The [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/) is still below 1.0, at version 0.25.0 from 18 November 2026. Its documentation now has a section on non-OpenAI models, with third-party adapters including LiteLLM and Any-LLM.

Hugging Face's [smolagents](https://huggingface.co/docs/smolagents/index) was at version 1.26.0, released in May 2026. [kagent](https://kagent.dev/) reached version 1.0.1 on 12 November 2026, and [Solace Agent Mesh](https://solace.com/products/agent-mesh/) is on a 2.x release line. [MetaGPT](https://github.com/FoundationAgents/MetaGPT) is the exception among Gartner's examples, with its latest tagged release, version 0.8.1, dating from April 2024 and its last code change from January 2026. Gartner warns that immature open-source communities can lose interest and move elsewhere, and a framework with no recent release deserves that check.

On licensing, Gartner expects competition to push leading open-source frameworks towards commercial licences and paid enterprise extensions. When we checked, the core libraries of LangGraph, CrewAI, Google ADK, the OpenAI Agents SDK, smolagents and kagent all still carried MIT or Apache 2.0 licences. That can change, so record the licence you adopted under.

## The risks Gartner flags

Gartner's risk list applies whichever framework you pick. Agents are unpredictable by nature, which makes them a risky replacement for traditional applications and core systems. The two failures it names are deploying an agent that is too unpredictable for its purpose and investing in one that can never meet reliability or compliance needs.

Many frameworks have weak debugging and observability, so teams end up building monitoring themselves, and that complicates compliance. Many also lack built-in guardrails, which leaves developers to build evaluation, fallback and safety mechanisms by hand. Agents that call external tools or read external data are exposed to prompt injection and data leakage, and they can be fed malicious input by the users or upstream systems that trigger them. Gartner's answer is evaluation, security, governance and monitoring at both the model level and the agent level, alongside AI-ready data, ModelOps and sound data governance.

Frameworks also leave out the user interface, so you will add something like Flask, Django, React or Angular. Gartner adds that a single standard framework cuts boilerplate but may limit experimentation, and that distributed multiagent systems bring extra cost and complexity.

Gartner also notes that an agent is not always the right tool. Robotic process automation and workflow automation are often more reliable where a process is routine, the goal is clear and exceptions are few. Our article on [why AI pilots stall before production](insight-why-ai-pilots-stall-before-production.html) covers what tends to go wrong after the framework choice.

## How to choose for your first agent

Gartner's advice is to start with a well-scoped, low-risk internal use case, usually a single agent, and to treat distributed coordination and autonomous code execution as optional until a use case needs them. It also warns against tying yourself to a framework that only supports distributed multiagent systems. These questions follow from the report and from the November 2026 status above.

1. What is the first agent for? A linear, single-agent task points towards something light, while work that branches or hands off between agents suits a graph or workflow model such as LangGraph or Microsoft Agent Framework.
2. Which language does the team write? Python covers most frameworks; .NET shops have Microsoft Agent Framework, and Google ADK reaches Java, Go and TypeScript.
3. Which models must it run? Test your intended models, including any offline ones, on the framework itself.
4. Is the project alive? Check the date of the latest release and whether the maintainer still supports it, since AutoGen is archived and MetaGPT has not tagged a release since 2024.
5. How will you evaluate and watch it? Decide on tracing and evaluation before the first demo.
6. What does it connect to? MCP support for tools and A2A for agent-to-agent communication keep your options open if you later add a second framework.

Our guide to [onboarding AI agents](insight-how-to-onboard-ai-agents.html) covers the access and accountability side once you have chosen, and [what agentic AI is and where it is working in 2026](insight-what-is-agentic-ai-where-is-it-working.html) gives the wider picture.

## Where agents help

Most of the effort in an agent project goes into connecting it to the systems a company already runs and keeping it inside the rules. When we build an agent for a customer, we pick the framework to suit that one job and the customer's team, connect it to their existing tools through MCP and their own APIs, and put a person in the approval path for anything that changes a record or sends something outside the company.

A good first agent is often a narrow internal one, in line with Gartner's advice. One example is an agent that reads incoming supplier documents, checks them against the contract and purchase order already held in the customer's systems, and drafts a note on any mismatch for a named person to approve. Tracing and evaluation are built in from the first version, so the customer can see what the agent did and why before it is trusted with more.
