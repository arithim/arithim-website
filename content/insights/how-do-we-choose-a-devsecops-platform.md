+++
title = "How Do We Choose a DevSecOps Platform?"
slug = "how-do-we-choose-a-devsecops-platform"
date = 2026-11-20
category = "APPSEC · RESEARCH"
card_label = "APPSEC · RESEARCH"
breadcrumb = "Application security"
description = "How to choose a DevSecOps platform in 2026. Gartner's June 2026 Magic Quadrant for DevSecOps Platforms names Atlassian, GitLab, Harness and Microsoft as Leaders out of 13 vendors, and the shortlist usually turns on data residency, deployment model, pricing and how much of the toolchain you want one vendor to own."
summary = "What Gartner's June 2026 Magic Quadrant for DevSecOps Platforms says about the four Leaders and nine other vendors, the checks that narrow a shortlist, and how AI coding agents are changing what buyers need."
lede = "Start with the constraints that rule vendors out, then compare the rest on how much of your delivery toolchain they replace. Gartner's June 2026 Magic Quadrant for DevSecOps Platforms rates 13 vendors and names Atlassian, GitLab, Harness and Microsoft as Leaders. Data residency, self-hosted versus SaaS, the pricing model and whether security tools must be native will usually cut that list to two or three before any feature comparison."
author = "Tarun Bulchandani"
research = true
cta = "Want to know how much of your current toolchain a DevSecOps platform would actually replace?"
keywords = [
  "how to choose a DevSecOps platform",
  "Gartner Magic Quadrant DevSecOps platforms 2026",
  "GitLab vs GitHub vs Harness vs Atlassian",
  "DevSecOps platform comparison",
  "DevSecOps platform data residency",
  "reduce CI/CD toolchain sprawl",
  "self-hosted DevSecOps platform",
  "DevSecOps platform pricing",
]
about = ["DevSecOps", "CI/CD", "Software delivery platforms"]
footnote = "Gartner does not endorse any vendor, product or service depicted in its research publications, and does not advise technology users to select only those vendors with the highest ratings or other designation. Gartner research publications consist of the opinions of Gartner's research organisation and should not be construed as statements of fact. GARTNER and MAGIC QUADRANT are registered trademarks of Gartner, Inc. and/or its affiliates."

[citation]
name = "Magic Quadrant for DevSecOps Platforms"
publisher = "Gartner, Inc."
date = 2026-06-15
identifier = "G00841436"
url = "https://www.gartner.com/doc/reprints?id=1-2NFWLO83&ct=260529&st=sb"

[[mentions]]
name = "Gartner"
url = "https://www.gartner.com/"

[[mentions]]
name = "Atlassian"
url = "https://www.atlassian.com/devops"

[[mentions]]
name = "GitLab"
url = "https://about.gitlab.com/"

[[mentions]]
name = "Harness"
url = "https://www.harness.io/"

[[mentions]]
name = "GitHub"
url = "https://github.com/"

[[mentions]]
name = "Azure DevOps"
url = "https://azure.microsoft.com/en-us/products/devops"

[[mentions]]
name = "HCLSoftware DevOps Loop"
url = "https://help.hcl-software.com/devops/loop/2.0.1/docs/topics/c_overview.html"

[[mentions]]
name = "IBM DevOps Loop"
url = "https://www.ibm.com/products/devops-loop"

[[mentions]]
name = "Buildkite"
url = "https://buildkite.com/"

[[mentions]]
name = "CircleCI"
url = "https://circleci.com/"

[[mentions]]
name = "CloudBees"
url = "https://www.cloudbees.com/"

[[mentions]]
name = "Google Cloud DevOps"
url = "https://cloud.google.com/devops"

[[mentions]]
name = "JetBrains TeamCity"
url = "https://www.jetbrains.com/teamcity/"

[[mentions]]
name = "Octopus Deploy"
url = "https://octopus.com/"

[[mentions]]
name = "OpenText DevOps Cloud"
url = "https://www.opentext.com/products/devops-cloud"

[[faq]]
q = "What is a DevSecOps platform?"
a = "Gartner defines a DevSecOps platform as an integrated product for continuous, secure software delivery, built around the CI/CD pipeline and covering everything from planning to monitoring, with security checks at each stage. Most are sold as cloud services and some can be run on premises. The aim is shared workflows, policies and data across teams, so delivery is easier to see, audit and trace."

[[faq]]
q = "Which vendors are Leaders in Gartner's 2026 Magic Quadrant for DevSecOps Platforms?"
a = "Gartner's June 2026 report names Atlassian, GitLab, Harness and Microsoft as the four Leaders out of 13 vendors. HCLSoftware and IBM are Visionaries. Buildkite, CircleCI, CloudBees, Google, JetBrains, Octopus and OpenText are Niche Players, and there are no Challengers."

[[faq]]
q = "Does a DevSecOps platform need its own built-in security scanners?"
a = "No. Gartner's inclusion criteria require native CI and CD, but security functions such as SAST, DAST, SCA, supply chain security and runtime protection only have to be orchestrated by the platform, and they can come from third parties. Many organisations keep the scanners they already own and let the platform run them."

[[faq]]
q = "Which DevSecOps platforms can be self-hosted?"
a = "Gartner lists HCLSoftware DevOps Loop and IBM DevOps Loop as self-hosted only, both running on Kubernetes. Google offers multitenant SaaS or self-hosted. GitLab offers multitenant SaaS, single-tenant SaaS through GitLab Dedicated, and on premises. Atlassian is retiring its Data Center products by 2029, except Bitbucket and Align, so new buyers should not plan on running Atlassian on premises."

[[faq]]
q = "Is GitHub or Azure DevOps the better choice from Microsoft?"
a = "Gartner rates Microsoft as a Leader but notes that buyers have to choose between two products, GitHub and Azure DevOps. It also says Microsoft's focus on AI has slowed GitHub's response to core DevSecOps needs, and that the move from per-seat to consumption pricing is complex to manage. Model the consumption costs before you commit to either."

[[sources]]
text = "Gartner, [Magic Quadrant for DevSecOps Platforms](https://www.gartner.com/doc/reprints?id=1-2NFWLO83&ct=260529&st=sb), Keith Mann, Thomas Murphy et al., 15 June 2026, ID G00841436. Complimentary reprint; the link may expire."

[[sources]]
text = "Vendor product pages for Atlassian, GitLab, Harness, GitHub, Azure DevOps, HCLSoftware DevOps Loop, IBM DevOps Loop, Buildkite, CircleCI, CloudBees, Google Cloud, JetBrains TeamCity, Octopus Deploy and OpenText DevOps Cloud. Accessed 21 November 2026."
+++
Many engineering teams assembled their delivery toolchain one tool at a time and are now weighing whether a single platform should replace it. This article answers the selection question from Gartner's [Magic Quadrant for DevSecOps Platforms](https://www.gartner.com/doc/reprints?id=1-2NFWLO83&ct=260529&st=sb), published in June 2026, and from each vendor's own product pages.

## What Gartner counts as a DevSecOps platform

Gartner describes DevSecOps platforms as integrated products for continuous, secure delivery. They are built around the CI/CD pipeline and run from planning through to monitoring, with security checks at every stage. Most are sold as cloud services, and some can still be installed on premises. Their purpose is to give development, security and operations teams shared workflows, policies and data, which makes delivery easier to see, audit and trace from idea to production.

To be included, a vendor had to offer native CI and CD, including gated and ungated release orchestration, by 1 January 2026. Security functions had to be orchestrated by the platform but did not have to be native. Threat modelling, supply chain security, SAST, DAST, SCA, web and API protection and runtime security can all come from third parties. Gartner left out vendors whose main use case is mobile, low-code or customising packaged business applications, and platforms sold only through custom development or professional services.

In practice you are choosing the system that runs your delivery process, and the scanners you already own can usually stay.

## Why buyers are looking now

Gartner's case for these platforms rests on cost and friction. A fragmented toolchain brings redundant tools, wasted spend and a clumsy developer experience, and Gartner says teams are working to pay down this toolchain technical debt. A platform replaces many specialised tools, cuts the time spent integrating and maintaining them, and reduces manual hand-offs between stages.

AI is the newer pressure. Gartner says AI coding agents now write code faster than it can be reviewed and deployed, which pushes platform vendors to add AI to review, testing and release as well. It also expects demand to rise as organisations adopt MLOps practices to ship AI-enabled applications. If your team is weighing [which AI coding agent to use](insight-which-ai-coding-agent-should-our-engineering-team-use.html), the delivery platform is where its output has to be checked.

Gartner estimates the application development and IT operations software market at $25.6 billion in 2024, with DevSecOps platforms a significant share.

## The four Leaders

Gartner says its Leaders are defined by breadth. They offer strong capabilities across the whole delivery life cycle, serve development, operations and SRE teams, and sell widely.

[Atlassian](https://www.atlassian.com/devops) has a clear AI plan covering the whole delivery life cycle and a unified platform for many roles, with strong SaaS service levels and growing data residency options. Gartner's cautions are that it is sold as a single SKU only to enterprises, that it has fewer native security capabilities than the other Leaders, and that its Data Center products are being retired by 2029 except Bitbucket and Align.

[GitLab](https://about.gitlab.com/) covers most DevSecOps capabilities natively and keeps feature parity between SaaS and on premises, AI included. It is the only vendor in the report offering multitenant SaaS, single-tenant SaaS (GitLab Dedicated) and on-premises deployment. Gartner flags limited success with sales partners in Asia/Pacific, little support for parts of the enterprise outside software engineering, and issues with employee sentiment and retention.

[Harness](https://www.harness.io/) is credited with strong agentic AI, security and MLOps features, and buyers can take the whole platform or single components. It has 13 system agents and an AI Agent Marketplace for deploying custom agents. Gartner notes that its partner network is not yet producing partner-led sales, its marketing does not reach senior executives, and its SLAs sit below competitors'.

Microsoft brings global research, sales and cloud capacity, a large ecosystem through GitHub Marketplace and deep expertise in AI agents, including the Copilot Code Review Agent. The difficulty is that buyers must choose between [GitHub](https://github.com/) and [Azure DevOps](https://azure.microsoft.com/en-us/products/devops). Gartner also says Microsoft's focus on AI has slowed GitHub's response to core DevSecOps needs, and that its move from per-seat to consumption pricing is complex to manage.

## The other nine vendors

Gartner names two Visionaries, [HCLSoftware DevOps Loop](https://help.hcl-software.com/devops/loop/2.0.1/docs/topics/c_overview.html) and [IBM DevOps Loop](https://www.ibm.com/products/devops-loop). Both are broad, composable platforms that run self-hosted only on Kubernetes. Both have among the most expensive per-user licences in the report and need the top licence tier for every feature. Gartner adds that much of each is built on established DevSecOps practices that modern teams may find hard to adopt. IBM's AI component is the exception.

The seven Niche Players each suit a narrower need. [Buildkite](https://buildkite.com/) has a scalable build-agent design suited to large AI model work, but its control plane is hosted only in the US and the EU, and Gartner raises viability concerns because it is not profitable and has new management. [CircleCI](https://circleci.com/) is fast and well documented, with cloud data centres in the US only and a shift towards smaller deals. [CloudBees](https://www.cloudbees.com/) has many regulated enterprise customers, but Gartner reports a shrinking customer list and sales revenue, higher prices, and the need to buy other tools to complete a platform.

[Google](https://cloud.google.com/devops) has a global cloud footprint for data residency and a strong AI plan. Gartner calls its offering a collection of tools not built specifically for DevSecOps, with much of the promised functionality depending on products that are not yet generally available. JetBrains, maker of [TeamCity](https://www.jetbrains.com/teamcity/), has been profitable for ten years and has strong developer tools, but its offering is narrower and developer-centred, with SaaS in three regions and data residency only in the EU. [Octopus](https://octopus.com/) is strong on continuous delivery and customer satisfaction, though narrow in scope, and Codefresh, which it bought in 2024, is not yet part of its overall strategy. [OpenText](https://www.opentext.com/products/devops-cloud) offers an end-to-end suite with governance, AI-assisted testing and application security, but runs SaaS in three regions and Gartner sees little innovation from it outside testing.

Google, HCLSoftware, IBM and OpenText are new to the report this year, and Huawei was dropped. Gartner says a vendor's arrival or departure may reflect changed criteria or the vendor's changed focus, so it should not be read as a change of opinion.

## Questions that narrow the shortlist

Settle these before anyone books a demo. Each one comes from Gartner's findings, and each can take vendors off the list.

1. Where must your data live? Gartner tells buyers to check data residency early. Buildkite, CircleCI, JetBrains and OpenText all have restricted SaaS regions.
2. Do you need to run it yourself? HCLSoftware and IBM are self-hosted only, and Atlassian will have no on-premises option for new buyers once Data Center retires.
3. How do you want to pay? Vendors charge per seat or by consumption, and Harness also sells single components. Ask each one to model your own usage under its scheme.
4. Will the platform run your existing scanners, or do you want native security? Atlassian has fewer native security features than the other Leaders, and Gartner's criteria accept third-party scanners. Our guide to [whether you need more than one application security testing tool](insight-more-than-one-application-security-testing-tool.html) covers that side.
5. How much of the toolchain should one vendor own? CloudBees, Octopus and JetBrains cover part of the life cycle and expect you to buy elsewhere for the rest.
6. Who will look after the pipeline itself? Whichever platform you choose, the hardening steps in [how to secure CI/CD pipelines and GitHub Actions](insight-how-to-secure-ci-cd-pipelines-github-actions.html) still apply.

Gartner also recommends pairing a platform decision with value stream management, so you can see from idea to production whether manual hand-offs fall after the move.

## Where agents help

A platform migration starts with an inventory most teams do not have. We build an agent that reads the tools a customer already runs, from CI servers and pipeline definitions to scanners, artefact stores and deployment tools, and maps which jobs, secrets and integrations each one holds. It produces a list of what a candidate platform would replace natively, what it would orchestrate from a third party, and what would need rebuilding, with the licence cost attached to each line.

During the move, the same agent compares each migrated pipeline with the original, checking that every security scan, approval step and deployment target survived, and it raises any gap as a pull request. A named platform engineer approves each change before it merges, and the agent keeps a record of what moved and when, which gives the security team an audit trail for the migration.
