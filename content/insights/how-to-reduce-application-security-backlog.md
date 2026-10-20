+++
title = "How Do We Reduce Our Application Security Backlog?"
slug = "how-to-reduce-application-security-backlog"
date = 2026-10-20
category = "APPSEC · RESEARCH"
card_label = "APPSEC · RESEARCH"
breadcrumb = "Application security"
description = "Cut the noise first, route every finding to an owner, fix dependencies in bulk and automate the loop around each fix. A practical plan for shrinking an AppSec backlog, based on Gartner's 2025 and 2026 research."
summary = "A practical plan for shrinking a security findings backlog: measure it properly, cut the noise, route to owners, fix in batches and stop it refilling."
lede = "Most application security backlogs shrink fastest when you cut the noise before anyone writes a fix, send every remaining finding to a named owner, and fix vulnerable dependencies in bulk. Generating patches is now the easy part, since most scanners can suggest one. What keeps backlogs large is the coordination around each fix, and that is where automation pays off."
author = "Tarun Bulchandani"
research = true
cta = "Want to see how much of your backlog is noise?"
keywords = [
  "how to reduce application security backlog",
  "vulnerability backlog",
  "security findings backlog",
  "mean time to remediate vulnerabilities",
  "AppSec remediation",
  "vulnerability prioritization reachability",
  "AI autofix vulnerabilities",
  "Gartner Magic Quadrant application security testing",
]
about = ["Application security", "Vulnerability management", "Remediation", "AI agents"]
footnote = "Gartner does not endorse any vendor, product or service depicted in its research publications. Gartner research publications consist of the opinions of Gartner's research organization and should not be construed as statements of fact. GARTNER and MAGIC QUADRANT are registered trademarks of Gartner, Inc. and/or its affiliates."

[citation]
name = "Magic Quadrant for Application Security Testing"
publisher = "Gartner, Inc."
date = 2025-10-06
identifier = "G00795930"
url = "https://www.gartner.com/doc/reprints?id=1-2M3L9X6H&ct=251014&st=sb"

[[mentions]]
name = "Gartner"
url = "https://www.gartner.com/"

[[mentions]]
name = "CISA"
url = "https://www.cisa.gov/"

[[mentions]]
name = "FIRST"
url = "https://www.first.org/"

[[mentions]]
name = "GitHub"
url = "https://github.com/"

[[mentions]]
name = "Veracode"
url = "https://www.veracode.com/"

[[mentions]]
name = "Mend.io"
url = "https://www.mend.io/"

[[faq]]
q = "Why does our security backlog keep growing even though we scan everything?"
a = "Scanning finds problems faster than most teams can fix them, and AI coding tools have widened that gap by producing more code. Gartner's 2025 Magic Quadrant for Application Security Testing says the hard part of the market has moved from finding issues to managing alert volume and remediation. If findings aren't deduplicated, routed to an owner and tracked to a merged fix, the backlog grows by default."

[[faq]]
q = "Should we close findings in code that isn't reachable?"
a = "Don't delete them, but take them out of the queue people work from. Record why each one was set aside and when it should be looked at again, so an auditor can follow the decision and the finding comes back if the code path changes."

[[faq]]
q = "Can AI fix our security backlog automatically?"
a = "It can write many of the fixes. GitHub Copilot Autofix, Veracode Fix, Snyk and Checkmarx all generate patches, and tools like Renovate and Dependabot automate dependency upgrades. A person still needs to review and merge each change, and someone has to route the work, chase reviews and confirm the rescan is clean. That coordination is where most of the time goes."

[[faq]]
q = "What should we measure to know the backlog is improving?"
a = "Track open findings that are both reachable and likely to be exploited, their age, and the median time from detection to merged fix for each team. Total finding count is a poor measure, because it rises every time you add a scanner."

[[faq]]
q = "What is a reasonable fix deadline for a critical vulnerability?"
a = "It depends on whether the vulnerability is known to be exploited and whether the affected code is exposed. Many organizations use days for critical issues that appear in CISA's Known Exploited Vulnerabilities catalog on internet-facing systems, and weeks or months for issues with no known exploit in internal code. Set the deadlines by risk tier and allow time-limited exceptions with a named approver."

[[sources]]
text = "Gartner, [Magic Quadrant for Application Security Testing](https://www.gartner.com/doc/reprints?id=1-2M3L9X6H&ct=251014&st=sb), Jason Gross, Mark Horvath et al., 6 October 2025, ID G00795930. Complimentary reprint; the link may expire."

[[sources]]
text = "Gartner, [Magic Quadrant for Software Supply Chain Security](https://www.gartner.com/doc/reprints?id=1-2NK0VAB8&ct=260617&st=sb), Aaron Lord, Johnny Walters et al., 17 June 2026, ID G00843814. Complimentary reprint; the link may expire."

[[sources]]
text = "[CISA Known Exploited Vulnerabilities catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog); [FIRST Exploit Prediction Scoring System (EPSS)](https://www.first.org/epss/); [Renovate](https://docs.renovatebot.com/); [GitHub supply chain security and Dependabot](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain); [Veracode Fix](https://www.veracode.com/products/fix/); [Backstage](https://backstage.io/). Accessed 20 October 2026."
+++
This is the third piece in our application security series, after [whether you need more than one AST tool](insight-more-than-one-application-security-testing-tool.html) and [how to secure vibe-coded apps](insight-how-to-secure-vibe-coded-apps.html). It draws on Gartner's 2025 [Magic Quadrant for Application Security Testing](https://www.gartner.com/doc/reprints?id=1-2M3L9X6H&ct=251014&st=sb) and its 2026 [Magic Quadrant for Software Supply Chain Security](https://www.gartner.com/doc/reprints?id=1-2NK0VAB8&ct=260617&st=sb).

## Why backlogs keep growing

Gartner's 2025 assessment of the AST market says that moving testing earlier in development, the long-running "shift left" effort, has largely been achieved, and that what now separates products is how they handle alert volume and remediation. Gartner also notes that AI coding assistants produce vulnerable code faster than developers can fix it, and it cites its own survey finding that 66% of organizations using AI in software development saw little or no improvement in code security.

The vendor profiles in Gartner's 2026 supply chain security report show the same pressure from the other side. Customers of several vendors reported large alert volumes and scan results that needed a lot of manual effort to work through, and some products need careful, ongoing policy tuning before their output is usable.

So the backlog is rarely caused by a lack of scanning. It grows because findings arrive from several tools, overlap, sit with no clear owner, and wait for someone to coordinate a fix.

## 1. Measure what matters

Before changing anything, break the backlog down by application, owning team, age, severity and source tool. Then add two questions for each finding. Is the vulnerable code reachable in the running application? Is the vulnerability being exploited, or likely to be? CISA's [Known Exploited Vulnerabilities catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) answers the first part of that for public CVEs, and FIRST's [Exploit Prediction Scoring System](https://www.first.org/epss/) estimates the likelihood for the rest.

The number worth tracking is the count of reachable, likely-exploited findings, along with how long they've been open. Total finding count goes up every time you add a scanner, so it tells you very little.

## 2. Cut the noise before anyone writes a fix

Deduplicate findings that two or three tools report under different names. Set aside findings in code that never runs, in test fixtures, or in dependencies that are present but never called, and record the reason and a review date for each. Tune the rules that produce the most false positives. We would expect this step alone to remove a large share of most queues without any code changing.

## 3. Give every finding an owner

Findings without an owner tend to sit untouched. Map each repository and service to a team using code ownership files and a service catalog such as [Backstage](https://backstage.io/) or your CMDB, and route findings to that team's normal work queue. Findings that can't be matched to an owner go to a short weekly review, where someone assigns them or decides the code should be retired.

## 4. Fix dependencies in bulk

In many backlogs, a large share of findings come from open-source dependencies, and one upgrade can close dozens of them. Tools like [Renovate](https://docs.renovatebot.com/) and GitHub's [Dependabot](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain) raise upgrade pull requests automatically. Some vendors go further; Gartner's 2026 report notes Mend.io's prediction of which version bumps will break a build and Sonatype's AI-assisted dependency upgrades. Grouping upgrades by application and merging them in regular batches gets through this part of the backlog much faster than handling findings one at a time.

## 5. Use autofix for code findings, with review

For findings in your own code, most leading scanners now generate a suggested patch. Gartner names Copilot Autofix, [Veracode Fix](https://www.veracode.com/products/fix/), Snyk's fix automation, Checkmarx's assistant and Black Duck Assist among them. Treat these as drafts. A developer who knows the code should review each one, and the rescan should confirm the finding is gone before the ticket closes.

## 6. Set deadlines by risk, and stop the backlog refilling

Set fix deadlines by risk tier, shortest for exploited vulnerabilities in internet-facing systems. Allow exceptions, but give each one a named approver and an expiry date. Then make sure new code doesn't add to the pile. A pipeline check that blocks new critical findings, while leaving existing ones to the backlog process, keeps the queue from growing back while you work it down.

## Where agents help

Steps three to six are mostly coordination. Someone has to find the owner, open the ticket, nudge the reviewer, re-run the scan, close the ticket and report progress, for every finding, across every tool. That work suits an agent well.

Gartner's 2026 supply chain report says GitHub has not yet shipped fully autonomous agentic workflows for security backlogs and pull requests, while some competitors already offer them. Those vendor agents work inside each vendor's own product. Most organizations run several scanners, so the coordination across them, together with the ticketing system and the people involved, is still left to someone on the security team.

The agent we would build for this picks up prioritized findings from every scanner, routes each to its owner, drafts or requests the fix, opens the pull request, follows up with reviewers, confirms the rescan and closes the ticket. A person approves every merge, and every decision the agent makes is logged with its reasoning. We describe it alongside the other agents in our [application security research](insight-more-than-one-application-security-testing-tool.html).
