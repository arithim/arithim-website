+++
title = "How Do I Secure Vibe-Coded Apps Built by People Who Aren't Developers?"
slug = "how-to-secure-vibe-coded-apps"
date = 2026-10-21
category = "APPSEC · RESEARCH"
card_label = "APPSEC · RESEARCH"
breadcrumb = "Application security"
description = "Find them, give each one an owner, scan them like any other code and explain the results in plain language. A practical process for securing AI-built apps, based on Gartner's 2026 secure software engineering research."
summary = "A practical process for finding, owning, scanning and fixing apps that people outside engineering have built with AI."
lede = "Treat them like any other application your company runs. Find them, give each one a named owner, scan them with the same tools you use on the rest of your code, and decide which of them are allowed near customer data. Most of these apps never pass through the systems where a security team would normally catch problems, which is why they need a process of their own."
author = "Tarun Bulchandani"
research = true
cta = "Not sure how many AI-built apps are running in your company?"
keywords = [
  "how to secure vibe coded apps",
  "vibe coding security",
  "AI-generated code security",
  "shadow AI apps",
  "citizen developer security",
  "AI app builder governance",
  "agentic coding security",
  "Gartner Hype Cycle secure software engineering",
]
about = ["Vibe coding", "Application security", "Shadow IT", "AI governance"]
footnote = "Gartner does not endorse any vendor, product or service depicted in its research publications. Gartner research publications consist of the opinions of Gartner's research organisation and should not be construed as statements of fact. GARTNER and HYPE CYCLE are registered trademarks of Gartner, Inc. and/or its affiliates."

[citation]
name = "Hype Cycle for Secure Software Engineering, 2026"
publisher = "Gartner, Inc."
date = 2026-06-02
identifier = "G00847347"
url = "https://www.gartner.com/doc/reprints?id=1-2NII8O1Z&ct=260610&st=sb"

[[mentions]]
name = "Gartner"
url = "https://www.gartner.com/"

[[mentions]]
name = "Center for Security and Emerging Technology"
url = "https://cset.georgetown.edu/"

[[mentions]]
name = "OX Security"
url = "https://www.ox.security/"

[[mentions]]
name = "Semgrep"
url = "https://semgrep.dev/"

[[faq]]
q = "What is vibe coding?"
a = "Vibe coding is building software by describing what you want to an AI tool in plain language and accepting the code it produces, often without reading it closely. It lets people with no development background build working apps in an afternoon."

[[faq]]
q = "Are vibe-coded apps less secure than apps written by developers?"
a = "Often, yes, mainly because they skip the checks developer code goes through. Gartner's 2026 research warns that vibe-coded prototypes can reach production without any security review, and a 2024 Georgetown CSET study found that almost half of the code samples produced by five AI models contained bugs, many of them exploitable."

[[faq]]
q = "Should we ban AI app builders?"
a = "We don't recommend it. A ban tends to push the work onto personal accounts and credit cards, where you can't see it at all. Approving a small set of tools, behind single sign-on, with templates that already handle login and secrets, gives people a safer route that's also the easier one."

[[faq]]
q = "Which tools check AI-generated code for vulnerabilities?"
a = "Your existing SAST, SCA and secrets scanners work on AI-generated code once it's in a repository they cover. Some newer tools check code as an AI agent writes it, such as Semgrep Guardian and OX Security's VibeSec. Gartner recommends keeping traditional SAST and SCA alongside AI code assistants."

[[faq]]
q = "Who should own a vibe-coded app?"
a = "The person or team that uses it should be its named business owner, responsible for keeping it patched or retiring it. Security sets the rules and runs the scans; the owner answers for what the app does with company data."

[[sources]]
text = "Gartner, [Hype Cycle for Secure Software Engineering, 2026](https://www.gartner.com/doc/reprints?id=1-2NII8O1Z&ct=260610&st=sb), Aaron Harrison et al., 2 June 2026, ID G00847347. Complimentary reprint; the link may expire."

[[sources]]
text = "Gartner, [Magic Quadrant for Application Security Testing](https://www.gartner.com/doc/reprints?id=1-2M3L9X6H&ct=251014&st=sb), Jason Gross, Mark Horvath et al., 6 October 2025, ID G00795930. Complimentary reprint; the link may expire."

[[sources]]
text = "Jessica Ji, Jenny Jun, Maggie Wu and Rebecca Gelles, [Cybersecurity Risks of AI-Generated Code](https://cset.georgetown.edu/publication/cybersecurity-risks-of-ai-generated-code/), Center for Security and Emerging Technology, Georgetown University, November 2024."

[[sources]]
text = "[OX Security VibeSec](https://www.ox.security/vibesec/) and [Semgrep Guardian](https://semgrep.dev/products/semgrep-guardian/) product pages, accessed 21 October 2026; [OWASP Top 10 for LLM Applications](https://genai.owasp.org/llm-top-10/); [CISA Secure by Design](https://www.cisa.gov/securebydesign)."
+++
This piece follows our look at [whether you need more than one application security testing tool](insight-more-than-one-application-security-testing-tool.html). It draws on Gartner's [Hype Cycle for Secure Software Engineering, 2026](https://www.gartner.com/doc/reprints?id=1-2NII8O1Z&ct=260610&st=sb) and its 2025 Magic Quadrant for Application Security Testing, plus what the tool vendors offer today.

## Why vibe-coded apps are a security problem

A finance analyst who builds an invoice tracker with an AI app builder has done something useful, but none of the usual checks happened along the way. Nobody reviewed the code, nobody scanned the open-source packages the AI chose, the database password is probably sitting in the source, and the app may be on the public internet because that was the default.

Gartner's 2026 Hype Cycle for Secure Software Engineering says this directly. Vibe-coded prototypes can reach production without security checks, coding agents can pull in vulnerable or malicious packages, and the MCP servers those agents connect to can have access nobody approved. Gartner's 2025 Magic Quadrant for Application Security Testing cites its own survey finding that 66% of organisations using AI tools in software development saw little or no improvement in code security. An independent study from Georgetown's [Center for Security and Emerging Technology](https://cset.georgetown.edu/publication/cybersecurity-risks-of-ai-generated-code/) found that almost half of the code samples produced by five AI models contained bugs, many of them exploitable.

A developer who sees a scanner finding can usually judge whether it's serious. Someone who builds apps from a finance or operations role can't, and shouldn't have to.

## Where these apps tend to live

Common places to find them include:

- repositories in personal GitHub or GitLab accounts, often created with a work email address
- apps deployed straight from an AI app builder to its own hosting, on a subdomain the company doesn't control
- internal tools running on a laptop or a spare cloud account outside the landing zone
- low-code apps and automations connected to company SaaS through personal API tokens
- MCP servers and coding-agent configurations on individual machines

None of these show up in the tools a security team normally watches, because those tools only see code that someone has put into a governed repository and pipeline.

## A practical process

### 1. Find them

Start with the signals you already have. Single sign-on and OAuth grant logs show which AI builders people have connected to company accounts. Expense and card data shows who is paying for them. DNS and certificate records show new subdomains. Your source control admin console shows repositories created outside the main organisation, and network logs show traffic to AI coding services. Several application security vendors now offer discovery of AI assets as well, which helps with code that is already in a repository.

### 2. Give each app an owner and a tier

For every app you find, record who uses it, what data it touches and who can reach it. Then place it in a tier, such as prototype, internal tool or business-critical. The tier decides how much scrutiny it gets. A prototype that only its builder uses needs a quick scan and a reminder. An app that holds customer records needs the same review as anything else that holds customer records.

### 3. Scan it like any other code

Move the code into a repository your scanners cover and run the same static analysis, dependency checks and secrets scanning you run everywhere else. For anything above prototype, also check that login actually works the way the owner thinks it does, and run a dynamic scan against the deployed app. Gartner recommends keeping traditional SAST and SCA tools alongside AI code assistants, and we agree. Some newer tools, such as [Semgrep Guardian](https://semgrep.dev/products/semgrep-guardian/) and OX Security's [VibeSec](https://www.ox.security/vibesec/), check code while an AI agent is writing it, which helps for builders whose tools support them.

### 4. Explain the findings in plain language

A finding like "SQL injection in search.py, line 42" means nothing to most app builders. "Anyone who types this into the search box can read every customer record" does. For each finding, explain what an attacker could do, and give the owner a fix they can apply. Often the most useful fix is a prompt they can paste back into the AI tool that wrote the code, followed by a rescan to confirm it worked.

### 5. Make the safe route the easy one

Gartner's advice for secure development generally is to make security the path of least resistance, and it fits here. Approve a short list of AI builders behind single sign-on. Provide templates with login, secrets handling and logging already done. Give coding agents the minimum permissions they need, which Gartner calls "least agency", and require a human review before anything high-risk goes live.

## Why a ban rarely works

Banning AI app builders is the obvious response, and it usually backfires. The people building these apps are solving real problems, and a ban moves their work onto personal accounts and credit cards where you have even less visibility. A short approved list with good templates gets you more control.

## Where an agent helps

Most of this process is repetitive coordination. Someone has to watch the discovery signals, open a record for each new app, ask the builder a few questions, run the scans, translate the results and chase the fix. We think an intake agent can do most of that. It would pick up a new app from the logs, message the builder in Slack or Teams to confirm ownership and purpose, run the scans, and write up each finding in plain language with a suggested fix. A person on the security team would still approve any move to the business-critical tier.

This is one of the agents we described in our [application security research](insight-more-than-one-application-security-testing-tool.html). As far as we can see, no vendor covers it end to end yet. Several discover AI assets, but finding an app is only the first step.

To find the apps and AI tools nobody told IT about in the first place, see shadow app discovery in [Arithim Estate](product-estate.html).
