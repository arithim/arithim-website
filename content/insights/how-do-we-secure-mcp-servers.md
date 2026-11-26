+++
title = "How Do We Secure MCP Servers?"
slug = "how-do-we-secure-mcp-servers"
date = 2026-11-23
category = "APPSEC · RESEARCH"
card_label = "APPSEC · RESEARCH"
breadcrumb = "Application security"
description = "How do we secure MCP servers? Gartner says to treat every Model Context Protocol deployment as a privileged asset, find the shadow MCP servers first, put an AI or MCP gateway in front of them, scope tokens with OAuth and demand evidence from vendors before connecting their hosted servers."
summary = "What Gartner's 2026 Hype Cycle for Secure Software Engineering and its first Magic Quadrant for Software Supply Chain Security say about MCP server risk, the controls to put in place and the vendors adding MCP governance."
lede = "Treat every MCP server as a privileged asset. Find the ones already running, route agent traffic through an AI or MCP gateway, give each server narrowly scoped OAuth tokens, and ask vendors for evidence of input validation, sandboxing and data loss prevention before you connect to their hosted servers. That is the short version of Gartner's advice in its 2026 Hype Cycle for Secure Software Engineering, which places MCP cybersecurity at the peak of inflated expectations and warns that shadow MCP adoption is outpacing security teams."
author = "Tarun Bulchandani"
research = true
cta = "Want to know which MCP servers your agents already reach, and what they can do there?"
keywords = [
  "how to secure MCP servers",
  "MCP server security",
  "Model Context Protocol security risks",
  "MCP gateway",
  "shadow MCP servers",
  "OWASP MCP Top 10",
  "Gartner Hype Cycle secure software engineering 2026",
  "MCP cybersecurity Gartner",
]
about = ["Application security", "Model Context Protocol", "AI agent security"]
footnote = "Gartner does not endorse any vendor, product or service depicted in its research publications, and does not advise technology users to select only those vendors with the highest ratings or other designation. Gartner research publications consist of the opinions of Gartner's research organisation and should not be construed as statements of fact. GARTNER, HYPE CYCLE and MAGIC QUADRANT are registered trademarks of Gartner, Inc. and/or its affiliates. Arithim builds with Claude, made by Anthropic, which Gartner lists as a sample vendor in the AI agent communication protocols profile cited here."

[citation]
name = "Hype Cycle for Secure Software Engineering 2026"
publisher = "Gartner, Inc."
date = 2026-06-02
identifier = "G00847347"
url = "https://www.gartner.com/doc/reprints?id=1-2NII8O1Z&ct=260610&st=sb"

[[mentions]]
name = "Gartner"
url = "https://www.gartner.com/"

[[mentions]]
name = "Model Context Protocol"
url = "https://modelcontextprotocol.io/"

[[mentions]]
name = "OWASP MCP Top 10"
url = "https://owasp.org/www-project-mcp-top-10/"

[[mentions]]
name = "Cycode Maestro"
url = "https://cycode.com/maestro/"

[[mentions]]
name = "JFrog Software Supply Chain Platform"
url = "https://jfrog.com/platform/"

[[mentions]]
name = "Lineaje UnifAI"
url = "https://www.lineaje.com/unifai"

[[mentions]]
name = "Zenity"
url = "https://zenity.io/platform"

[[mentions]]
name = "Noma Security"
url = "https://noma.security/platform/"

[[mentions]]
name = "Lumia Security"
url = "https://www.lumia.security/"

[[faq]]
q = "What are the main security risks of MCP servers?"
a = "Gartner's Hype Cycle for Secure Software Engineering 2026 names shadow MCP adoption that security teams cannot see, MCP servers with unapproved or uncontrolled access, and vendor-hosted servers with weak controls. The OWASP MCP Top 10 lists ten risks, including token mismanagement and secret exposure, privilege escalation through scope creep, tool poisoning, command injection, prompt injection, shadow MCP servers and a lack of audit and telemetry."

[[faq]]
q = "What is an MCP gateway?"
a = "An MCP gateway, or AI gateway, is a proxy that sits between AI agents and the MCP servers they call, so security teams can apply policy and see traffic at runtime. Gartner recommends AI and MCP gateways and proxies as the main runtime control for MCP, alongside OAuth-scoped tokens and TLS 1.3, and has published a separate Innovation Insight on MCP gateways."

[[faq]]
q = "How do we find shadow MCP servers in our organisation?"
a = "Gartner says discovery needs several sources together: controls on endpoints and servers, network detection, and monitoring of your SaaS estate. Its agentic coding security guidance adds an inventory of coding agents and the MCP servers they use, and its guardian agent guidance recommends inventorying every agent, sanctioned or not."

[[faq]]
q = "Is it safe to use vendor-hosted MCP servers?"
a = "Gartner warns that many vendor-hosted MCP servers have weak controls. It advises buyers to ask for evidence of input validation, sandboxing and data loss prevention before connecting agents to them, and to treat each deployment as a privileged asset."

[[faq]]
q = "Which security vendors govern MCP servers?"
a = "In its first Magic Quadrant for Software Supply Chain Security, Gartner credits Cycode with governance of AI coding tools and MCP servers, notes that JFrog offers an MCP server while its AI agent skill controls are early, and names Lineaje's UnifAI policy layer. The Hype Cycle lists no sample vendors for MCP cybersecurity itself, but names Lumia Security, Noma Security, Zenity and others for guardian agents that supervise agent actions."

[[sources]]
text = "Gartner, [Hype Cycle for Secure Software Engineering 2026](https://www.gartner.com/doc/reprints?id=1-2NII8O1Z&ct=260610&st=sb), Aaron Harrison, 2 June 2026, ID G00847347. Complimentary reprint; the link may expire."

[[sources]]
text = "Gartner, [Magic Quadrant for Software Supply Chain Security](https://www.gartner.com/doc/reprints?id=1-2NK0VAB8&ct=260617&st=sb), Aaron Lord, Johnny Walters et al., 17 June 2026, ID G00843814. Complimentary reprint; the link may expire."

[[sources]]
text = "[Model Context Protocol authorization specification](https://modelcontextprotocol.io/specification/latest/basic/authorization) and [OWASP MCP Top 10](https://owasp.org/www-project-mcp-top-10/), plus vendor pages for Cycode, JFrog, Lineaje, Zenity, Noma Security and Lumia Security. Accessed 26 November 2026."
+++
MCP servers give AI agents their reach into the rest of the business, and Gartner says their adoption is outpacing the security teams meant to control them. This article sets out how to secure them, drawing on two Gartner reports: the [Hype Cycle for Secure Software Engineering 2026](https://www.gartner.com/doc/reprints?id=1-2NII8O1Z&ct=260610&st=sb), published in June 2026, and the first [Magic Quadrant for Software Supply Chain Security](https://www.gartner.com/doc/reprints?id=1-2NK0VAB8&ct=260617&st=sb), published the same month.

## Why MCP servers need their own security

The [Model Context Protocol](https://modelcontextprotocol.io/) is a standard way for an AI agent to call tools and read data outside itself. An MCP server wraps a system, such as a code repository, a ticket queue or a database, and exposes actions an agent can take on it. An agent connected to the server inherits all of those actions.

Gartner tracks two related entries in the Hype Cycle. AI agent communication protocols, which cover MCP and UTCP for links between agents and their environment and A2A for links between agents, sit on the rise with a high benefit rating and 1% to 5% market penetration. Gartner recommends MCP as the short-term choice for connecting agents to tools and data, and says A2A should be used with caution. Its sample vendors for the category include Anthropic, Google, Microsoft, OpenAI and The Linux Foundation.

MCP cybersecurity is the second entry. Gartner defines it as applying architecture controls to secure how AI agents connect to tools, data and MCP servers. It sits at the peak of inflated expectations, with a high benefit rating and 5% to 20% penetration, and Gartner lists no sample vendors for it. Its headline recommendation is to treat every MCP deployment as a privileged asset.

The reason is that MCP widens the attack surface quickly. In its profile of AI-native software engineering, Gartner lists MCP servers alongside agent skills, plug-ins and IDE extensions as the ways AI tools expand what an attacker can reach. Its profile of agentic coding security adds that coding agents can pull in vulnerable or malicious open-source packages and that MCP servers may have access nobody approved.

## The risks to plan for

Gartner's first concern is visibility. It says shadow MCP adoption is outpacing security teams, so many organisations cannot list the servers their agents already call.

Its second concern is vendor-hosted servers. According to Gartner, many of them have weak controls, and buyers should ask for evidence of input validation, sandboxing and data loss prevention before connecting.

Credentials are the third. The Hype Cycle's agentic AI governance profile notes that agents often hold their own credentials and API keys, and that tracking which agent decided what is usually manual or missing, a gap Gartner calls "decision amnesia".

The [OWASP MCP Top 10](https://owasp.org/www-project-mcp-top-10/), which Gartner names among the relevant standards, gives a fuller checklist. Its ten entries include token mismanagement and secret exposure, privilege escalation through scope creep, tool poisoning, software supply chain attacks and dependency tampering, command injection, prompt injection through contextual payloads, insufficient authentication and authorisation, a lack of audit and telemetry, and shadow MCP servers.

## The controls Gartner recommends

Gartner splits the work into discovery and protection.

For discovery, it says no single source is enough. You need controls on endpoints and servers to see local MCP servers that developers run on their machines, network detection to spot traffic to remote ones, and monitoring of your SaaS estate for servers that vendors host. The agentic coding security profile adds an inventory of coding agents and the MCP servers they use, and the guardian agent profile recommends discovering and inventorying every agent, sanctioned or not.

For protection, Gartner recommends AI and MCP gateways and proxies for runtime control, OAuth-scoped tokens and TLS 1.3. A gateway gives the security team one place to apply policy and watch what agents do. Scoped tokens limit what each server can do on behalf of an agent. The [MCP authorisation specification](https://modelcontextprotocol.io/specification/latest/basic/authorization) is built on OAuth 2.1, with the MCP server acting as a resource server that accepts access tokens and the client requesting them on a user's behalf, so the standard already supports this.

Gartner's guidance for coding agents fits MCP closely. It recommends "least agency" permissions, so an agent gets only what a given task needs, a human in the loop for high-risk work, and continuous monitoring of agent activity and tool access. For observability, it says agent systems should use OpenTelemetry at a minimum.

Some of the work stays manual for now. Gartner notes that incident playbooks for MCP-specific failures have to be written by hand. It also says the protocols themselves lack management features such as registration, discovery and access policies, and that buyers will need AI gateways and registries for agents, APIs, MCP servers and models to fill that gap until the vendor community does.

Put together, a starting checklist looks like this.

1. Build an inventory of MCP servers from endpoint, network and SaaS data, and record an owner and a purpose for each.
2. Route agent traffic to MCP servers through a gateway or proxy, and block servers that are not on the inventory.
3. Issue each server short-lived, narrowly scoped OAuth tokens, and remove long-lived API keys held by agents.
4. Before connecting a vendor-hosted server, ask the vendor for evidence of input validation, sandboxing and data loss prevention.
5. Log every tool call with the agent, the user it acted for and the result, and send it to the same monitoring as your other production systems.
6. Write incident playbooks for the MCP failures you are most worried about, such as a poisoned tool or a leaked token.

Onboarding agents raises many of the same questions about access and ownership, which we cover in [how to onboard AI agents](insight-how-to-onboard-ai-agents.html).

## Who sells MCP governance

No product covers all of it yet. The Hype Cycle lists no sample vendors for MCP cybersecurity, and much of the market is arriving through adjacent categories.

Software supply chain security is one. In its first Magic Quadrant for the market, Gartner lists MCP servers among the third-party risks these tools should reduce, and counts protection of AI components, including LLMs and MCP servers, as an optional feature. Gartner says vendors are adding AI supply chain security, AI bills of materials, MCP server and AI coding tool governance, and agentic remediation. It credits [Cycode](https://cycode.com/maestro/), a Leader, with governance of AI coding tools and MCP servers and a native AI bill of materials. [JFrog](https://jfrog.com/platform/), also a Leader, offers an MCP server, though Gartner says its governance of IDE plug-ins covers only VS Code-based tools and its AI agent skill controls only recently left proof of concept. [Lineaje](https://www.lineaje.com/unifai), a Visionary, has its UnifAI policy control layer for AI. Gartner estimates this market exceeded $2.8 billion in 2025 and forecasts it will pass $5 billion by 2030.

Guardian agents are the other. These are agents that supervise other agents, monitor and block risky actions, and enforce policy across platforms. Gartner rates them high benefit with less than 1% penetration, and names Amazon, Google, [Lumia Security](https://www.lumia.security/), Microsoft, [Noma Security](https://noma.security/platform/), Virtue AI, Wayfound and [Zenity](https://zenity.io/platform) as sample vendors. It advises trialling them now and choosing products that are independent of any single AI agent platform. It also notes that SaaS guardian agents cannot yet block actions in line and in real time, so they do not replace a gateway.

Expect to combine products. Gartner's broader message in the Hype Cycle is that buying more tools alone will not fix secure development, and that security has to be built into the workflows developers and agents already use. The same applies to the pipelines those agents commit to, which we cover in [how to secure CI/CD pipelines and GitHub Actions](insight-how-to-secure-ci-cd-pipelines-github-actions.html).

## Where agents help

Most of the controls above depend on an inventory that stays current. Gartner's point about shadow adoption is that new servers appear faster than a security team can record them by hand, and its discovery advice spans endpoint, network and SaaS data that usually sit with different teams.

The agent we would build works alongside the endpoint management, network monitoring, identity provider and gateway a customer already owns. It reads their data each day to find MCP servers and the agents calling them, matches each to an owner, and flags any that are missing from the inventory, hold long-lived credentials or reach systems marked sensitive. For each new vendor-hosted server it drafts the evidence request Gartner recommends and tracks the reply. It proposes gateway rules and token scopes for a named security engineer to approve, and it never changes access on its own. Every finding and decision goes into a log the team can audit, so the next incident review starts with a list of what was connected and who allowed it. Teams choosing which coding agents to allow can pair this with our comparison of [AI coding agents for engineering teams](insight-which-ai-coding-agent-should-our-engineering-team-use.html).
