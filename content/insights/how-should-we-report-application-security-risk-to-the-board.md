+++
title = "How Should We Report Application Security Risk to the Board?"
slug = "how-should-we-report-application-security-risk-to-the-board"
date = 2026-11-21
category = "APPSEC · RESEARCH"
card_label = "APPSEC · RESEARCH"
breadcrumb = "Application security"
description = "How to report application security risk to the board. Gartner says more teams now report overall application risk, risk reduction per development cycle and supply chain risk as primary KPIs instead of finding counts alone. What to measure, what has to be in place first and which tools produce the numbers."
summary = "What Gartner's 2025 research on application security testing says about risk becoming the primary KPI, why counts of findings mislead non-security readers, a short board report built on Gartner's examples and the groundwork it needs."
lede = "Give the board a few risk measures by application and business service, show whether each one is falling, and keep counts of findings by severity in the appendix. Gartner's 2025 Critical Capabilities for Application Security Testing reports that more security and development teams now use overall application risk, risk reduction per development cycle and software supply chain risk as primary KPIs, because those figures make sense to people outside security. The numbers only hold up under questioning once findings from different tools are correlated and every application has an owner."
author = "Tarun Bulchandani"
research = true
cta = "Building the board pack from several AppSec consoles every quarter?"
keywords = [
  "how to report application security risk to the board",
  "application security metrics for the board",
  "AppSec KPIs",
  "application security risk reporting",
  "security metrics for non-security stakeholders",
  "ASPM reporting",
  "Gartner Critical Capabilities application security testing",
  "software supply chain security KPIs",
]
about = ["Application security", "Security metrics", "Board reporting"]
footnote = "Gartner does not endorse any vendor, product or service depicted in its research publications, and does not advise technology users to select only those vendors with the highest ratings or other designation. Gartner research publications consist of the opinions of Gartner's research organisation and should not be construed as statements of fact. GARTNER, HYPE CYCLE and MAGIC QUADRANT are registered trademarks of Gartner, Inc. and/or its affiliates."

[citation]
name = "Critical Capabilities for Application Security Testing"
publisher = "Gartner, Inc."
date = 2025-10-13
identifier = "G00795985"
url = "https://www.gartner.com/doc/reprints?id=1-2M5Q4EI5&ct=251024&st=sb"

[[mentions]]
name = "Gartner"
url = "https://www.gartner.com/"

[[mentions]]
name = "Black Duck Software Risk Manager"
url = "https://www.blackduck.com/software-risk-manager.html"

[[mentions]]
name = "Checkmarx ASPM"
url = "https://checkmarx.com/product/aspm/"

[[mentions]]
name = "Veracode Risk Manager"
url = "https://www.veracode.com/risk-manager/"

[[mentions]]
name = "HCLSoftware AppScan"
url = "https://www.hcl-software.com/appscan"

[[mentions]]
name = "Cycode"
url = "https://cycode.com/"

[[mentions]]
name = "Apiiro"
url = "https://apiiro.com/"

[[mentions]]
name = "Snyk"
url = "https://snyk.io/"

[[mentions]]
name = "GitLab"
url = "https://about.gitlab.com/"

[[mentions]]
name = "Contrast Security"
url = "https://www.contrastsecurity.com/"

[[faq]]
q = "What application security metrics should we report to the board?"
a = "Gartner's 2025 Critical Capabilities for Application Security Testing gives three examples that teams now treat as primary KPIs: overall application risk, risk reduction per development cycle and software supply chain risk. Report those by application or business service, with the trend since the last meeting. Keep counts of findings by severity as supporting detail."

[[faq]]
q = "Why are vulnerability counts a poor board metric?"
a = "Several testing tools often report the same flaw, and Gartner's 2026 Hype Cycle for Secure Software Engineering says duplicate or overlapping findings inflate perceived risk and that inconsistent reporting erodes trust with senior leadership. Counts also rise when the amount of code rises, so a growing number can hide a falling risk, or the reverse."

[[faq]]
q = "Do we need ASPM to report application security risk?"
a = "You need the work ASPM does, which is pulling findings from every tool, removing duplicates and adding business context. Gartner recommends deploying ASPM to establish control and visibility over application security testing tools. A small estate with one vendor's suite may get enough from that suite's own reporting."

[[faq]]
q = "How often should application security risk go to the board?"
a = "Gartner does not set a frequency. One of its example KPIs is risk reduction per development cycle, which suggests tracking it per release or sprint and summarising the trend for each board meeting. Agree the cadence with the audit or risk committee."

[[faq]]
q = "Which tools produce portfolio-level application security reports?"
a = "Gartner's 2025 Magic Quadrant for Application Security Testing describes posture reporting in Black Duck Software Risk Manager, Checkmarx ASPM, Veracode Risk Manager, HCLSoftware AppScan, Cycode and Apiiro, among others. It also notes limits, such as Snyk's reporting customisation and Contrast Security's posture features, which do not take in other vendors' findings."

[[sources]]
text = "Gartner, [Critical Capabilities for Application Security Testing](https://www.gartner.com/doc/reprints?id=1-2M5Q4EI5&ct=251024&st=sb), Mark Horvath, Jason Gross et al., 13 October 2025, ID G00795985. Complimentary reprint; the link may expire."

[[sources]]
text = "Gartner, [Magic Quadrant for Application Security Testing](https://www.gartner.com/doc/reprints?id=1-2M3L9X6H&ct=251014&st=sb), Jason Gross, Mark Horvath et al., 6 October 2025, ID G00795930. Complimentary reprint; the link may expire."

[[sources]]
text = "Gartner, [Hype Cycle for Secure Software Engineering, 2026](https://www.gartner.com/doc/reprints?id=1-2NII8O1Z&ct=260610&st=sb), Aaron Harrison, 2 June 2026, ID G00847347. Complimentary reprint; the link may expire."

[[sources]]
text = "Vendor product pages for the tools named in this article. Accessed 24 November 2026."
+++
Board reports on application security often show charts of open vulnerabilities by severity. This article sets out what Gartner's research says should replace those charts and what has to be true before the new numbers can be trusted. It draws on Gartner's [Critical Capabilities for Application Security Testing](https://www.gartner.com/doc/reprints?id=1-2M5Q4EI5&ct=251024&st=sb) and [Magic Quadrant for Application Security Testing](https://www.gartner.com/doc/reprints?id=1-2M3L9X6H&ct=251014&st=sb), both from October 2025, and on the [Hype Cycle for Secure Software Engineering, 2026](https://www.gartner.com/doc/reprints?id=1-2NII8O1Z&ct=260610&st=sb).

## What Gartner says has changed

The Critical Capabilities report has a section on risk becoming the primary KPI. Gartner says that with application security posture management (ASPM) added to testing suites, correlating results from several testing tools has started to work. It sees more security and development teams reporting risk metrics instead of only the traditional security indicators. Its examples are overall application risk, risk reductions per development cycle and software supply chain security risk, reported as primary KPIs alongside the usual severity and criticality measures.

Gartner gives two reasons this matters. Risk measures are easier for people outside security to understand, and they fit alongside the metrics the rest of the business already uses. They also let security leaders trade off security against performance, features and business risk in a way others can follow. A board can set a risk figure beside revenue, delivery dates and its other operational risks.

The same report recommends that decisions about application security capabilities and vendors be made jointly by security, development and engineering, and operations. That matters for reporting too, because the people who own the code are the ones who will be asked why a number moved.

## Why counts of findings mislead

The Magic Quadrant describes what it calls a signal-to-noise problem. Running security tests inside source control and pipelines is now standard, and the result is a large volume of alerts. When several tools report overlapping findings, security teams struggle to measure and prioritise risk, and developers lose time on findings that cannot be exploited or are already fixed.

The Hype Cycle's ASPM profile adds that duplicate or overlapping findings from separate tools inflate perceived risk and undermine the credibility of the security programme. Inconsistent and inaccurate reporting, Gartner says, erodes trust with senior leadership and makes it harder to keep support for security work. Individual testing tools also lack the business context and threat intelligence needed to judge how likely and how damaging a flaw is.

The Hype Cycle also notes that AI coding assistants increase the amount of new and changed code, which increases the number of findings the tools produce. A team that ships more code will usually see more findings, even if each release is safer than the last. A severity chart cannot show that, and a board reading it may draw the wrong conclusion.

## What to put in front of the board

The structure below is our suggestion, built on the three KPIs Gartner names. It fits on one page and leaves the detail to an appendix.

1. Overall application risk by business service. Group applications under the services the board recognises, such as online payments or the customer portal, and show the current risk level for each with the change since the last report. A risk score that combines severity, exploitability, internet exposure and business criticality works better here than a raw count.
2. Risk reduction per development cycle. Show how much risk each release or sprint removed against how much new code it added. This is the measure that answers the volume question, because it shows whether the teams are getting ahead.
3. Software supply chain risk. The Critical Capabilities report recommends making software supply chain security a first-tier control and describes it as "a key data source" for security KPIs. Report the risk carried in open-source and third-party components, separately from flaws in your own code, because the fixes and owners differ.
4. Exceptions and accepted risk. List each risk the business has accepted, who accepted it and when it expires. Gartner's definition of policy evaluation includes criteria for how long a risk may remain, so this is a standard posture management capability in its terms.

Keep severity counts, mean time to remediate and scanner coverage in the appendix, where the audit committee or a non-executive with a technical background can check them.

## The groundwork the numbers need

Each figure on that page has to survive a follow-up question from a non-executive director.

Start with correlation. Gartner's definition of posture and performance reporting includes unified visibility, meaning findings from third-party tools are ingested, deduplicated and correlated, plus measurement at the application and portfolio level. The Critical Capabilities report recommends deploying ASPM to establish control and visibility over testing tools. If your findings live in three consoles, the risk figure will be built by hand each quarter and will not reconcile from one report to the next. Our comparison of [whether you need more than one application security testing tool](insight-more-than-one-application-security-testing-tool.html) explains why most estates end up with several.

A risk figure per business service also needs every application mapped to a service and a named team. The Hype Cycle lists the lack of a clear operating model and shared accountability as one of the main reasons ASPM projects struggle, and the same gap breaks board reporting. Our guide to [reducing an application security backlog](insight-how-to-reduce-application-security-backlog.html) covers the ownership work.

Gartner also advises defining goals and success metrics for risk reduction, process improvement and reporting before choosing an ASPM tool, so its value can be measured and executive support holds. Agree with the risk committee what "acceptable" means for each service before the first report, so the board is judging progress against a target it set.

Applications built outside the normal development process need a place in the report too. Code written by non-developers with AI tools often never reaches the scanners. Our article on [securing vibe-coded apps](insight-how-to-secure-vibe-coded-apps.html) covers how to bring it in.

## Which tools produce the numbers

Gartner's Magic Quadrant describes posture and reporting features in most of the larger testing suites. [Black Duck Software Risk Manager](https://www.blackduck.com/software-risk-manager.html) takes in results from Black Duck and third-party tools. [Checkmarx ASPM](https://checkmarx.com/product/aspm/) deduplicates findings from its own and third-party tools. [Veracode Risk Manager](https://www.veracode.com/risk-manager/) came from Veracode's 2024 acquisition of Longbow Security. The Critical Capabilities report says [HCLSoftware AppScan](https://www.hcl-software.com/appscan) has improved its posture dashboards, correlation, compliance policies and reporting. [Cycode](https://cycode.com/) offers compliance dashboards, and [Apiiro](https://apiiro.com/) ranks risk with what it calls a Risk Graph. [GitLab](https://about.gitlab.com/) offers custom compliance frameworks inside its DevSecOps platform.

The Magic Quadrant also records limits that affect board reporting. It says [Snyk](https://snyk.io/) offers limited customisation of reports, with tenant-level analytics in early access from July 2025. It says [Contrast Security](https://www.contrastsecurity.com/) does not take in findings from other vendors, which leaves risk visibility fragmented. If your estate mixes vendors, ask each one to load your own scanners' output during a trial and produce a portfolio report from it.

## Regulation the board will ask about

The Hype Cycle names the regulation and guidance shaping secure software work, including the EU Cyber Resilience Act, the NIS2 Directive and the CISA, NSA and FBI Secure by Design initiative, whose deadline for memory-safety roadmaps was January 2026. Gartner's 2026 Software Engineering Survey, cited in the same report, found that 68% of software engineering leaders call application security highly important. In our view, a board in a regulated sector will want to see which applications fall under which rules. A posture tool that tags applications by regulation, or a service catalogue that does, makes that a filter on the same data.

## Where agents help

The data for a board report usually exists already in the scanners and the posture tool. The time goes on pulling it from several consoles, matching findings to services and owners, chasing the teams whose numbers moved and writing an explanation a non-specialist can follow, and that is the work we would give an agent.

The agent we would build sits alongside the scanners, the posture platform and the service catalogue the customer already runs. Each month it gathers findings, maps them to business services and owners, and calculates the trend for each of the measures above. Where a number has moved sharply, it asks the owning team for the reason and drafts a short explanation from their answer. It then produces the one-page board summary and the appendix, with every figure linked back to the findings behind it. The head of application security reviews and edits the draft and signs it off before anything reaches the board, and nothing the agent writes changes a risk acceptance or a finding's status.
