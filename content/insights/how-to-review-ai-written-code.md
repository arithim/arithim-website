+++
title = "How Should You Review AI-Written Code Before You Merge It?"
slug = "how-to-review-ai-written-code"
date = 2026-11-13
category = "AI ENGINEERING"
card_label = "AI ENGINEERING"
breadcrumb = "AI engineering"
description = "Have a person read the diff before it merges, check what the code stores as well as what it shows, and ask what happens when it runs for every user. Three review questions from a real case where AI-written code passed its tests and copied a whole job advert into every user's row."
summary = "Three questions to ask of every AI-written pull request, from a product where code that passed its tests copied a whole job advert into every user's row."
lede = "Have a person read the diff before you merge it, the way you would read a pull request from a junior developer, and ask three questions of it: what did it actually change, what does it store as well as what it shows, and what happens when it runs for every user. AI assistants are good at writing code that works. Tests and a working page only tell you that much, and I learnt what they miss on my own product."
author = "Tarun Bulchandani"
cta = "Want a review standard your team can use for AI-written code?"
keywords = [
  "how to review AI-generated code",
  "AI code review checklist",
  "reviewing AI-written pull requests",
  "code review for AI coding assistants",
  "AI slop in code",
  "pull request template for AI-generated code",
  "AI-generated code database bloat",
]
about = ["Code review", "AI-assisted software development", "Software quality"]

[[faq]]
q = "Is it safe to merge AI-generated code without reviewing it?"
a = "No. AI-written code usually runs and often passes its tests, but that tells you nothing about what it stores, how it grows or whether it matches the design. Give it the same review you would give a pull request from a junior developer, with a person reading the diff before it merges."

[[faq]]
q = "Why didn't the tests catch the problem?"
a = "Because nothing the tests checked was wrong. Each user's page read from that user's own row and showed the right jobs. The waste was in how much data each row held, and a test that checks what the page shows will pass whether the advert is stored once or once per user."

[[faq]]
q = "What should go in a pull request template for AI-written code?"
a = "We suggest three questions, each needing an answer before the pull request merges. Has someone read the diff, beyond the summary? What does this code store, as well as what it shows? What happens when this is multiplied by every user? Short questions are more likely to be answered than a long checklist."

[[faq]]
q = "Who should review code that an AI assistant wrote?"
a = "Ideally someone other than the person who prompted the assistant, because the person who asked for the change already believes it does what they asked. The reviewer needs to read the diff itself and be able to say what the code writes to the database."

[[faq]]
q = "How much difference did fixing the Find Me A Job code make?"
a = "Once I read the code and changed it to store each advert once, that table shrank by 76% and the whole database by 38%."
+++
## What happened in Find Me A Job

[Find Me A Job](case-find-me-a-job.html) is a product I built myself, and an AI assistant wrote part of its code. Part of that code handled the job adverts each user sees. Instead of keeping one copy of an advert and pointing each user to it, the code copied the whole advert into every user's row. One advert, shown to many people, was stored once per person.

Nothing broke. The page loaded and the tests passed, so from the outside the feature did what it was meant to do.

I had reviewed the design and it looked fine. I skipped the code review.

When I did read the code, the problem was easy to see. I changed it to store each advert once. That table shrank by 76%, and the whole database by 38%.

## Why passing tests and a working page did not catch it

Tests check the cases someone thought to write down, and a working page shows you what the code displays. Neither tells you what the code keeps.

I don't think the assistant was careless. Copying everything in case it is needed later is a cautious choice, and people make it too. The cost only appears when the copy is multiplied across every user, and by then it is sitting in your database and in everything that reads or backs it up.

## A design review and a code review answer different questions

A design review asks whether the plan is sound. A code review asks whether the code does what the plan says, and whether it does anything the plan didn't mention. I did the first and assumed it covered the second.

With code written by people, the two reviews often blur together because the author explains their choices as they go. With an assistant, you get a tidy summary of what it set out to do. The summary describes the intent. The diff shows what was written, and that is where my problem was.

## Where the cost of AI-written code lands

AI makes writing code cheap. Reviewing it is still work, and that is where the cost shows up. When an assistant can produce a large pull request in a few minutes, the temptation is to read its summary, run the tests and merge. Each of those steps feels like a review and none of them is one.

If the review is skipped, the cost doesn't disappear. It turns up later as storage, slower queries, or a bug someone has to trace through code nobody on the team has read.

## Three questions to ask before you merge AI-written code

These are the questions I now ask of every change an assistant writes for me. They are short on purpose, so people actually answer them.

### Read the diff, not just the summary

Open the changed files and read them. The assistant's summary is a description of the code, written by the same tool that wrote the code, so it will not point out its own odd choices. Look at every file the change touches, including the ones the summary doesn't mention. If a pull request is too large to read in one sitting, ask for it to be split.

### Check what it stores, not only what it shows

Find every place the code writes something: new tables or columns, inserts and updates, caches, files, logs. For each one, ask whether that data needs to be there and whether it already exists somewhere else. A screen that looks right only tells you about what the code reads. Mine looked right for every user while each of their rows carried a full copy of the advert.

### Ask what happens when this is multiplied by every user

A copy of one job advert costs nothing. The same copy for every user is a different matter. Do the rough arithmetic before you merge: how big is each record, how many does each user get, and how many users will there be? The same question catches a database call inside a loop, a log line on every request and a file saved per user per day. An assistant writes one function at a time and has no view of how many users will run it, so someone on the team has to ask.

## What to change in your team on Monday

None of this needs a new tool. Put the three questions in your pull request template, so every AI-written change has to answer them before it merges. Make someone read the diff before merge, preferably not the person who prompted the assistant. And look at what your code already stores: list your largest tables and ask whether their size makes sense for the number of users you have. If it doesn't, read the code that writes to them.

This all assumes the code reaches a pull request in the first place. When people outside engineering build apps with AI tools, a lot of that code never goes near one, which needs a process of its own. We cover that in [How Do I Secure Vibe-Coded Apps Built by People Who Aren't Developers?](insight-how-to-secure-vibe-coded-apps.html)

## How Arithim helps

We build software with AI assistants ourselves, including Find Me A Job, so we have made this mistake and fixed it. We can help your team agree a review standard for AI-written code, add it to your pull request process, and look through code you have already shipped for the same kind of storage problem. If that would be useful, [get in touch](contact.html).
