+++
kind = "keynote"
minutes = 25
speaker = "Tarun Bulchandani"
+++

--- title
kicker: Keynote · AI governance
# From pilot to production in ==regulated industries==
notes: This talk is about why working AI pilots get stuck before go-live in banks, insurers, energy companies and other regulated firms, and what to put in place so they don't.

--- statement
kicker: The hook
## Most enterprise AI pilots ==work==.
Few reach production in regulated firms.
notes: Pilots run on clean data with their builders watching, and nobody is asked to sign anything. Production means someone in risk, compliance or audit has to be satisfied the system is controlled.

--- cards
kicker: Why they stall
## The blockers have little to do with the model.
- Ownership | Nobody is named.
- Evidence | Nothing an auditor can read.
- Control | No clear way to limit it or stop it.
notes: A better model would stall in exactly the same place. Each of these gaps is an organisational one, and each can be closed before the go-live review.

--- list numbered
kicker: Production readiness
## Four questions an auditor asks ==before go-live==.
- Who owns it?
- What may it do?
- How is it logged?
- Who can switch it off?
notes: The wording varies from firm to firm, but the questions come down to these four. Answer them in writing before the review and the meeting can spend its time checking your answers.

--- statement
kicker: Question 1
## Who owns the agent?
A named person, not a team. Not whoever built it.
notes: The builder moves on to the next project. The owner answers for what the agent does in production, approves changes to its scope, and decides when it is re-checked or retired.

--- cards
kicker: Questions 2 and 3
## What may it do, and how is it ==logged==?
- What it may do | Written down, including what it must never do.
- How it is logged | Actions recorded as evidence an auditor can ask for.
notes: The "must never do" line is often the one the risk team cares about most. Logs should show what came in, what the agent decided, what it did and who approved it. For high-risk systems, Article 12 of the EU AI Act requires automatic recording of events over the system's lifetime.

--- quote
> Interrupt the system through a 'stop' button or a similar procedure that allows the system to come to a halt in a safe state.
cite: EU AI Act, Article 14(4)(e)
notes: This is from the Act's human oversight article for high-risk AI systems. Even where the Act doesn't apply, it is a fair test for any AI system you put live: who can stop it, and how.

--- statement
kicker: Question 4
## Who can switch it off?
Autonomy is earned. A model upgrade means a re-check. Old agents get retired.
notes: An agent starts with a narrow scope and gets more only when the evidence supports it. After a model upgrade the system you approved is no longer the system you're running, so it goes back through review. Retirement is a decision the owner makes on purpose.

--- stats
kicker: Governance you may already have
## Owner. Decision record. ==Review.==
- 100+ | applications under one architecture governance board
notes: At Sonnedix, a global renewable energy producer, I built the architecture function from scratch between 2023 and 2026, with a governance board and decision records. An AI management system such as ISO/IEC 42001 asks for the same structure.

--- list
kicker: ISO/IEC 42001, as artefacts
## What a team actually produces.
- AI inventory | Every AI system in use, and its owner
- Risk classification
- Named owners
- Approval gates | Before go-live and before any change in scope
- Evidence capture and review cadence
notes: ISO/IEC 42001 specifies requirements for an AI management system. It describes outcomes, so teams that read it often stall. These are the documents most teams end up producing to meet it, and an existing architecture or change board already covers much of the ground.

--- list numbered
kicker: The business case
## Four things I ==would trust==.
- A measured baseline
- A named owner for the number
- A cost line that includes review and governance
- A stop rule
notes: Someone has to read the logs, re-check the system after model upgrades and sit on the board, so that cost belongs in the case. The stop rule, agreed up front, says when you will roll it back, and it is the item most often missing.

--- list numbered
kicker: On Monday
## Take one pilot ==through the gate==.
- Pick your most advanced pilot
- Answer the four auditor questions in writing
- Write its stop rule
notes: If you can do this in an afternoon, the pilot is closer to production than you thought. If you can't, you now know what the risk team will ask for.

--- statement
kicker: One question to take away
## What is the stop rule on your ==largest AI project==?
notes: A stop rule is a condition, agreed before the project starts, under which you stop or roll it back. If nobody can tell you what it is for your largest project, start there.
