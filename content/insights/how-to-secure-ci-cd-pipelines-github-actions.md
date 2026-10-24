+++
title = "How Do I Secure Our CI/CD Pipelines and GitHub Actions?"
slug = "how-to-secure-ci-cd-pipelines-github-actions"
date = 2026-10-24
category = "APPSEC · RESEARCH"
card_label = "APPSEC · RESEARCH"
breadcrumb = "Application security"
description = "Pipeline security is the weakest area of most application security programmes. A practical checklist for GitHub Actions and other CI/CD systems, the 2025 attacks that showed why it matters, and where Gartner says the tools still fall short."
summary = "Why pipelines are now a favourite target, a practical hardening checklist for GitHub Actions and other CI/CD systems, and where the tools still leave gaps."
lede = "Start by taking an inventory: every pipeline, every runner, every secret it can reach and every third-party action or plugin it pulls in. Then pin third-party actions to exact commits, cut each workflow's token permissions to the minimum, replace stored cloud keys with short-lived credentials, and sign what you build. Most organisations have never done the inventory, which is why pipelines have become an easy way in."
author = "Tarun Bulchandani"
research = true
cta = "Do you know every secret your pipelines can reach?"
keywords = [
  "how to secure CI/CD pipelines",
  "GitHub Actions security",
  "secure GitHub Actions workflows",
  "pipeline security",
  "software supply chain security",
  "pin GitHub Actions to commit SHA",
  "OIDC GitHub Actions",
  "SLSA provenance",
]
about = ["CI/CD security", "GitHub Actions", "Software supply chain security"]
footnote = "Gartner does not endorse any vendor, product or service depicted in its research publications. Gartner research publications consist of the opinions of Gartner's research organisation and should not be construed as statements of fact. GARTNER, MAGIC QUADRANT and HYPE CYCLE are registered trademarks of Gartner, Inc. and/or its affiliates."

[citation]
name = "Magic Quadrant for Software Supply Chain Security"
publisher = "Gartner, Inc."
date = 2026-06-17
identifier = "G00843814"
url = "https://www.gartner.com/doc/reprints?id=1-2NK0VAB8&ct=260617&st=sb"

[[mentions]]
name = "Gartner"
url = "https://www.gartner.com/"

[[mentions]]
name = "CISA"
url = "https://www.cisa.gov/"

[[mentions]]
name = "GitHub"
url = "https://github.com/"

[[mentions]]
name = "OX Security"
url = "https://www.ox.security/"

[[mentions]]
name = "Cycode"
url = "https://cycode.com/"

[[faq]]
q = "What is CI/CD pipeline security?"
a = "It is the protection of the systems that build, test and deploy your software: the pipeline definitions, the runners that execute them, the secrets they use, and the third-party actions, plugins and packages they pull in. Attackers target pipelines because one compromised step can steal credentials or insert malicious code into everything the pipeline ships."

[[faq]]
q = "Why should we pin GitHub Actions to a commit SHA?"
a = "A version tag such as v4 can be moved to point at different code, which is what happened when the tj-actions/changed-files action was compromised in March 2025. GitHub's security guidance recommends pinning third-party actions to a full-length commit SHA, so a workflow only runs the exact code you reviewed."

[[faq]]
q = "How do we stop pipelines leaking cloud credentials?"
a = "Stop storing long-lived cloud keys as pipeline secrets. GitHub Actions and most CI systems support OpenID Connect, which lets a workflow request a short-lived credential from AWS, Azure or Google Cloud for a single job. Combine that with minimal token permissions per workflow and secret scanning on every repository."

[[faq]]
q = "Do application security tools cover pipeline security?"
a = "Mostly not yet. In Gartner's 2025 Critical Capabilities for Application Security Testing, pipeline security was the weakest capability across 16 vendors, and Gartner's 2026 Magic Quadrant for Software Supply Chain Security lists several vendors with no pipeline posture checks at all. A few vendors, including OX Security and Cycode, focus on it."

[[faq]]
q = "What is SLSA, and do we need it?"
a = "SLSA (Supply-chain Levels for Software Artifacts) is an open framework that defines levels of build integrity, such as recording signed provenance for every artifact. It is a useful target for any organisation that ships software to customers, and regulations such as the EU Cyber Resilience Act are pushing in the same direction."

[[sources]]
text = "Gartner, [Magic Quadrant for Software Supply Chain Security](https://www.gartner.com/doc/reprints?id=1-2NK0VAB8&ct=260617&st=sb), Aaron Lord, Johnny Walters et al., 17 June 2026, ID G00843814; Gartner, [Hype Cycle for Secure Software Engineering, 2026](https://www.gartner.com/doc/reprints?id=1-2NII8O1Z&ct=260610&st=sb), ID G00847347; Gartner, [Critical Capabilities for Application Security Testing](https://www.gartner.com/doc/reprints?id=1-2M5Q4EI5&ct=251024&st=sb), ID G00795985. Complimentary reprints; links may expire."

[[sources]]
text = "CISA, [Supply Chain Compromise of Third-Party tj-actions/changed-files (CVE-2025-30066) and reviewdog/action-setup (CVE-2025-30154)](https://www.cisa.gov/news-events/alerts/2025/03/18/supply-chain-compromise-third-party-tj-actionschanged-files-cve-2025-30066-and-reviewdogaction), 18 March 2025; CISA, [Widespread Supply Chain Compromise Impacting npm Ecosystem](https://www.cisa.gov/news-events/alerts/2025/09/23/widespread-supply-chain-compromise-impacting-npm-ecosystem), 23 September 2025."

[[sources]]
text = "GitHub Docs, [Secure use reference for GitHub Actions](https://docs.github.com/en/actions/reference/security/secure-use), [OpenID Connect](https://docs.github.com/en/actions/concepts/security/openid-connect) and [artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations); [SLSA](https://slsa.dev/); [Sigstore](https://www.sigstore.dev/); [OpenSSF Scorecard](https://scorecard.dev/). Accessed 20 October 2026."
+++
This is part of our application security series, alongside [whether you need more than one AST tool](insight-more-than-one-application-security-testing-tool.html) and [how to reduce your security backlog](insight-how-to-reduce-application-security-backlog.html).

## Why pipelines became a target

Two incidents in 2025 showed how much damage a pipeline compromise can do. In March, the widely used GitHub Action tj-actions/changed-files was compromised, and, according to [CISA's alert](https://www.cisa.gov/news-events/alerts/2025/03/18/supply-chain-compromise-third-party-tj-actionschanged-files-cve-2025-30066-and-reviewdogaction), the malicious code exposed secrets from the workflows that used it, including cloud access keys, GitHub personal access tokens, npm tokens and private keys. In September, a self-spreading worm called Shai-Hulud compromised more than 500 npm packages. [CISA reported](https://www.cisa.gov/news-events/alerts/2025/09/23/widespread-supply-chain-compromise-impacting-npm-ecosystem) that it stole GitHub tokens and cloud API keys from developers and used their npm access to publish infected versions of other packages.

Both attacks worked because build systems hold powerful credentials and run third-party code that few people review.

## What the research says about the tools

Pipeline security is the weakest area in most application security tooling. In Gartner's 2025 Critical Capabilities for Application Security Testing, it had the lowest median score of the 15 capabilities rated across 16 vendors. Gartner's 2026 Magic Quadrant for Software Supply Chain Security lists several vendors with no pipeline posture checks at all. A few focus on the problem: Gartner credits [OX Security](https://www.ox.security/) with pipeline posture management through its Pipeline Bill of Materials, and notes that [Cycode](https://cycode.com/) released runtime pipeline protection after the Shai-Hulud attack. GitHub is credited with attestations and branch protections in Actions.

Gartner's 2026 Hype Cycle for Secure Software Engineering adds two practical observations. Many organisations collect software bills of materials without having decided how to evaluate, store or use them, and signing and verifying artifacts in CI/CD is still awkward for developers.

## A hardening checklist

These steps apply to GitHub Actions specifically, and most have direct equivalents in GitLab CI, Azure DevOps and Jenkins.

### Take an inventory

List every repository with a pipeline, every runner (hosted and self-hosted), every secret each workflow can read, and every third-party action, plugin or container image it uses. Tools such as [OpenSSF Scorecard](https://scorecard.dev/) can check many of these settings across repositories automatically. Without this list, the rest of the checklist can't be applied consistently.

### Pin third-party actions to commits

A version tag like `v4` can be moved to different code, which is how the tj-actions compromise reached so many workflows. [GitHub's guidance](https://docs.github.com/en/actions/reference/security/secure-use) recommends pinning third-party actions to a full-length commit SHA. Use a dependency bot to propose updates, so pinning doesn't leave you stuck on old versions.

### Cut token permissions to the minimum

Set the default `GITHUB_TOKEN` permission to read-only at the organisation level, and grant write access only in the workflows and jobs that need it. Be careful with triggers that run untrusted code with elevated permissions, such as `pull_request_target` on public repositories.

### Replace stored cloud keys with short-lived credentials

Use [OpenID Connect](https://docs.github.com/en/actions/concepts/security/openid-connect) so each job requests a short-lived credential from AWS, Azure or Google Cloud, scoped to that repository and environment. A stolen short-lived token is worth far less than a cloud key that never expires.

### Protect runners and deployments

Use ephemeral runners that are destroyed after each job, and never run self-hosted runners for public repositories. Put production deployments behind environments that require a named reviewer, and protect workflow files with code ownership so changes to them get a security review.

### Sign what you build

Generate provenance for every artifact you ship. GitHub's [artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations) and the open-source [Sigstore](https://www.sigstore.dev/) project make this much easier than it used to be, and the [SLSA](https://slsa.dev/) framework gives you levels to aim for. Verify signatures at deployment, otherwise signing proves little.

### Scan for secrets and keep scanning

Turn on secret scanning and push protection on every repository, and rotate any credential that has ever appeared in a log or a commit. After the 2025 incidents, CISA's advice included rotating developer credentials and requiring phishing-resistant multi-factor authentication.

## Where agents help

The checklist itself is not hard. Keeping hundreds of repositories compliant with it, as teams add workflows every week, is. That makes it a good job for an agent. A pipeline auditor agent can read every workflow across GitHub, GitLab, Jenkins and Azure DevOps, score each one against your policy and SLSA, and open pull requests with the fixes: pinning actions, trimming permissions, switching to OIDC. A person reviews and merges each change, and the agent reports drift as new workflows appear.

Because so few application security tools cover pipelines well, this is one of the clearer gaps we found in our [research on the AST market](insight-more-than-one-application-security-testing-tool.html), and one of the first agents we would build.
