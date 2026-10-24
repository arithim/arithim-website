+++
title = "Do You Need More Than One Application Security Testing Tool?"
slug = "more-than-one-application-security-testing-tool"
date = 2026-10-20
category = "APPSEC · RESEARCH"
card_label = "APPSEC · RESEARCH"
breadcrumb = "Application security"
description = "Probably. Gartner's 2025 comparison of 16 AST vendors found none that covers the whole field. We look at what each vendor is good at, the work that falls between the tools, and where AI agents fit."
summary = "Gartner's 2025 comparison of 16 AST vendors found none that covers the whole field. What each vendor is good at, the work that falls between the tools, and where AI agents fit."
lede = "Probably. When Gartner compared 16 application security testing vendors in October 2025, none of them covered the whole field well, and most large engineering organisations already run three or four of these tools side by side. Adding another scanner is rarely the hard decision. What tends to go wrong is the work between the tools, and that is the part we think AI agents are suited to."
read_minutes = 8
author = "Tarun Bulchandani"
research = true
cta = "Running three AppSec consoles and still chasing fixes by hand?"
keywords = [
  "application security testing tools",
  "best application security testing tool",
  "SAST DAST SCA",
  "ASPM",
  "application security posture management",
  "AI agents for application security",
  "vibe coding security",
  "pipeline security",
  "Gartner Critical Capabilities application security testing",
]
about = ["Application security testing", "Application security posture management", "AI agents"]
footnote = "Gartner does not endorse any vendor, product or service depicted in its research publications. Gartner research publications consist of the opinions of Gartner's research organisation and should not be construed as statements of fact. GARTNER is a registered trademark of Gartner, Inc. and/or its affiliates. Vendor counts and score ranges above are Arithim's own arithmetic on Gartner's published ratings."

[citation]
name = "Critical Capabilities for Application Security Testing"
publisher = "Gartner, Inc."
date = 2025-10-13
identifier = "G00795985"
url = "https://www.gartner.com/doc/reprints?id=1-2M5Q4EI5&ct=251024&st=sb"

[[mentions]]
name = "Apiiro"
url = "https://apiiro.com/"

[[mentions]]
name = "Black Duck"
url = "https://www.blackduck.com/"

[[mentions]]
name = "Checkmarx"
url = "https://checkmarx.com/"

[[mentions]]
name = "Contrast Security"
url = "https://www.contrastsecurity.com/"

[[mentions]]
name = "Cycode"
url = "https://cycode.com/"

[[mentions]]
name = "Data Theorem"
url = "https://www.datatheorem.com/"

[[mentions]]
name = "GitHub"
url = "https://github.com/"

[[mentions]]
name = "GitLab"
url = "https://about.gitlab.com/"

[[mentions]]
name = "HCLSoftware"
url = "https://www.hcl-software.com/"

[[mentions]]
name = "JFrog"
url = "https://jfrog.com/"

[[mentions]]
name = "Mend.io"
url = "https://www.mend.io/"

[[mentions]]
name = "OpenText"
url = "https://www.opentext.com/"

[[mentions]]
name = "Semgrep"
url = "https://semgrep.dev/"

[[mentions]]
name = "Snyk"
url = "https://snyk.io/"

[[mentions]]
name = "Sonatype"
url = "https://www.sonatype.com/"

[[mentions]]
name = "Veracode"
url = "https://www.veracode.com/"

[[mentions]]
name = "Gartner"
url = "https://www.gartner.com/"

[[faq]]
q = "Do we need more than one application security testing tool?"
a = "For most large organisations, yes. In Gartner's 2025 assessment no vendor scored much above 3.5 out of 5 in any buyer scenario, and most rely on partners for at least one capability. It is worth deciding early how the tools will share findings and who owns the result."

[[faq]]
q = "Our AppSec vendor already has AI autofix. What would an agent add?"
a = "Autofix writes a patch for a finding inside one product. Most of the time to remediate goes on finding the owner, getting a review, verifying the fix with a rescan and updating tickets across several products, and an agent can take on that surrounding work."

[[faq]]
q = "Is an agent layer the same as buying an ASPM product?"
a = "Posture management gives you a single prioritised view across tools. An agent acts on that view by opening pull requests, chasing reviews and closing tickets. You can use both, and an agent can deliver some of the value before an ASPM product is in place."

[[faq]]
q = "How do I secure apps that people vibe-coded with AI?"
a = "Find them first by looking for new repositories, low-code projects and deployed apps that none of your scanners cover. Give each one a named owner, run it through the same SAST, SCA and secrets scanning as the rest of your code, and explain the findings in plain language, because the person who built it may not be a developer."

[[faq]]
q = "How do you keep AI agents safe inside a security workflow?"
a = "Give each agent least-privilege credentials for each tool, require human approval for every change, log every decision with its reasoning, and treat model output as untrusted input."

[[sources]]
text = "Gartner, [Critical Capabilities for Application Security Testing](https://www.gartner.com/doc/reprints?id=1-2M5Q4EI5&ct=251024&st=sb), Mark Horvath, Jason Gross et al., 13 October 2025, ID G00795985. Ratings as of 9 September 2025. Complimentary reprint; the link may expire."

[[sources]]
text = "Vendor product pages and documentation as linked above, accessed 20 October 2026."

[[sources]]
text = "[SLSA (Supply-chain Levels for Software Artifacts)](https://slsa.dev/); [OWASP Top 10 for LLM Applications](https://genai.owasp.org/llm-top-10/); [Model Context Protocol](https://modelcontextprotocol.io/)."
+++
We're writing a series on where agents fit alongside software that companies have already bought. This one starts from Gartner's [Critical Capabilities for Application Security Testing](https://www.gartner.com/doc/reprints?id=1-2M5Q4EI5&ct=251024&st=sb), adds what each vendor says about its own product today, and ends with the agents we would build.

## What Gartner's 2025 comparison found

Gartner scored 16 vendors on 15 capabilities, including static and dynamic testing, software bills of materials, pipeline security and AI coding assistants. It then weighted those scores for six buyer scenarios, among them enterprise, DevSecOps, cloud-native and software supply chain security.

The core scanners now give broadly similar results. Gartner says this about SAST, DAST, IAST and SCA, and notes that price per developer has become one of the main ways buyers choose between them.

Coverage beyond the core is uneven. On Gartner's scale of 1 to 5, where 3 means a product meets requirements, the best score any vendor got in any of the six scenarios was about 3.5. Counting through the published ratings ourselves, we found interactive testing weak or missing at 12 of the 16 vendors, and pipeline security weak or missing at 7 of them, with a median score of 1.6. Dynamic testing was weak at 7 vendors and API testing at 6. Many vendors close these gaps through partners or OEM deals, which Gartner describes as fragile arrangements.

Gartner also observes that many large organisations have assembled their own application security platform out of several vendors' products, since nobody sells a complete one yet, and that teams increasingly report application risk instead of raw counts of findings.

## What each vendor is known for

Each vendor is strong somewhere different, which is why most stacks end up mixed. The table summarises Gartner's ratings from September 2025, with our note on what buyers usually add alongside each product.

| Vendor | Known for | Usually paired with something for |
|---|---|---|
| [Apiiro](https://apiiro.com/) | Risk graph and posture management; top score for ASPM | Dynamic, container and IaC testing |
| [Black Duck](https://www.blackduck.com/) | Broad suite, strong IAST, ASPM that ingests third-party tools | Pipeline security; lighter needs at SMB scale |
| [Checkmarx](https://checkmarx.com/product/application-security-platform/) | Checkmarx One, ASPM, developer enablement | IAST and mobile binary scanning |
| [Contrast Security](https://www.contrastsecurity.com/) | Runtime-first: IAST, RASP, detection and response | Pipeline, container and IaC coverage |
| [Cycode](https://cycode.com/) | Pipeline and supply chain security; first for SSCS | DAST, API and IAST |
| [Data Theorem](https://www.datatheorem.com/) | Cloud-native, API, container and mobile testing | Pipeline and artifact integrity |
| [GitHub](https://github.com/security/advanced-security) | Advanced Security in the developer workflow; supply chain | DAST, IAST, API, IaC and containers; AI features need GitHub.com |
| [GitLab](https://about.gitlab.com/solutions/application-security-testing/) | One DevSecOps platform with end-to-end pipeline visibility | Deeper DAST, IAST and AI risk |
| [HCLSoftware](https://www.hcl-software.com/appscan) | AppScan full suite; first for the enterprise scenario | API business-logic testing; supply chain via a partner |
| [JFrog](https://jfrog.com/advanced-security/) | Software supply chain, SCA and runtime context | Dynamic and API testing |
| [Mend.io](https://www.mend.io/) | Composition analysis and automated dependency updates | DAST, IAST and secrets detection |
| [OpenText](https://www.opentext.com/products/application-security) | Fortify: enterprise breadth, air-gapped deployment, AI-risk detection | Container and pipeline security |
| [Semgrep](https://semgrep.dev/) | Custom rules on source code, with open-source roots | Dynamic, API and container testing; cross-tool orchestration |
| [Snyk](https://snyk.io/) | Developer-first suite and AppRisk posture management | Pipeline security and IAST |
| [Sonatype](https://www.sonatype.com/) | Composition analysis, repository firewall, AI component detection | SAST, DAST, IaC and posture management |
| [Veracode](https://www.veracode.com/) | SAST and SCA, pen-testing service, EU data region | Pipeline security and IAST |

Summarised from Gartner's ratings as of 9 September 2025. Vendors have shipped a lot since, so check current capabilities with each of them. {.note}

In practice a large organisation might run GitHub or GitLab for repository-native scanning, a deeper scanner such as Checkmarx, Veracode, Black Duck, OpenText or HCL, a supply chain tool like JFrog, Sonatype or Mend.io, and increasingly a posture management product such as Apiiro, Cycode, Snyk AppRisk or Checkmarx ASPM on top. Each of these has its own console and its own idea of severity, and their findings overlap.

## Work no single tool owns

Comparing the gaps side by side, seven jobs keep turning up that no individual product is responsible for.

### Getting a finding fixed and merged

Most vendors can now suggest an AI-generated fix. Getting that fix merged still means working out which team owns the code, getting someone to review the change, waiting for tests, checking that the next scan no longer reports the issue, and closing the ticket before its SLA runs out. Those steps cross Jira or ServiceNow, Slack or Teams, and the repository, and in most organisations an AppSec engineer still does them by hand.

### Triage across scanners

When the same vulnerability appears in two tools under different identifiers, or a finding sits in code that never runs in production, someone has to decide what to keep. Posture management products are built to correlate these findings, but plenty of organisations haven't bought one, and those that have usually still run a tool or two it doesn't ingest cleanly.

### Pipeline security

Pipeline security is the weakest capability across the vendors Gartner rated. Doing it properly starts with an inventory of CI/CD runners, stored secrets and the third-party actions and plugins each pipeline pulls in, and then checks build integrity against a framework such as [SLSA](https://slsa.dev/). We would be surprised if most teams had even the inventory.

### Vibe-coded apps outside the pipeline

Gartner calls out vibe coding, where people with little development background use AI to build working applications, as a new attack surface, because those apps tend to sit outside normal security processes. A scanner only tests code that someone points it at, so finding these apps, giving each one an owner and getting it scanned is currently nobody's job.

### Models, prompts and MCP servers

Applications now ship with models, prompts and [Model Context Protocol](https://modelcontextprotocol.io/) servers inside them, and Gartner recommends choosing tools that scan those artifacts as well. Several vendors have added this in the past year. Keeping one inventory across every repository and team, and checking it against something like the [OWASP Top 10 for LLM applications](https://genai.owasp.org/llm-top-10/), is still mostly a governance task.

### Reporting risk to the board

If risk is going to be the KPI, someone has to combine findings from several tools into a trend for each application and explain why it moved. In many organisations that is still a spreadsheet assembled by hand before each quarterly review.

### Switching vendors

Gartner points out that changing AST vendors is contractually easier than it used to be, but re-instrumenting every pipeline is real work, so organisations often renew tools they have outgrown.

## Where we think agents fit

Each of those jobs involves reading from a few systems, making a judgement with some context, acting in another system and keeping a record of why. Agents handle that kind of work well, provided they use the tools a customer already has. These are the ones we would build.

- A remediation agent that picks up a prioritised finding from any scanner, finds the owner from CODEOWNERS or the CMDB and drafts a fix, using the vendor's own autofix where there is one. It opens the pull request, follows up with reviewers, confirms the rescan is clean and closes the ticket. A person approves every merge.
- A triage agent that deduplicates findings across tools, checks whether the vulnerable code is reachable, and records its reason for setting anything aside, so the security team can audit what it filtered out.
- A pipeline auditor that inventories GitHub Actions, GitLab CI, Jenkins or Azure DevOps configuration, scores it against policy and SLSA, and proposes changes as pull requests.
- An intake agent for AI-built and low-code apps that finds them, gets them scanned and explains the results to owners who aren't developers.
- A reporting agent that writes the monthly application risk summary for the CISO and the board from every tool at once, with its working shown.
- A migration agent that maps rules and policies from one scanner to another, rewrites pipeline configuration and runs both tools in parallel until their results line up. Some vendors run switching programmes of their own, but those only move customers toward that vendor.

## What vendors are shipping in 2026

The vendors have moved a long way since Gartner's ratings. [Apiiro](https://apiiro.com/) and [Cycode](https://cycode.com/) now market themselves as platforms for securing agentic development. Many vendors publish MCP servers so coding assistants can read their findings, and several now check AI-written code as it is generated, [Semgrep Guardian](https://semgrep.dev/products/semgrep-guardian/) being one example. [GitHub's Copilot Autofix](https://docs.github.com/en/code-security/responsible-use/security-and-quality-ai-features) proposes fixes for code scanning alerts on pull requests and on the default branch.

This makes an agent layer easier to build, because there are better interfaces to call. Each vendor's AI still only sees that vendor's findings, though, and most of the new features target code being written today. The backlog already sitting in four consoles gets less attention. We expect the gaps between products to stay open for a while.

## How we would start

We would begin by mapping the tools you have, what their APIs expose and where findings tend to stall. Then we would pick the loop that costs your team the most time, usually remediation or triage, and put one agent into production on it, with approvals and an audit trail from the first day. If time to remediate, SLA breaches or the amount of noise rejected improves, we extend it. If it doesn't, we stop there.
