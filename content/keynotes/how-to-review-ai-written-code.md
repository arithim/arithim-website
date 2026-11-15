+++
kind = "keynote"
minutes = 20
speaker = "Tarun Bulchandani"
+++

--- title
kicker: Keynote · AI engineering
# Don't ship ==slop==
notes: A talk about reviewing code that AI assistants write, built on one mistake in a product I built myself. It ends with three questions to ask before you merge, and what to change in your team on Monday.

--- statement
kicker: The hook
## I reviewed the design and skipped the ==code review==.
notes: The design looked fine, so I didn't read the code that implemented it. Everything in this talk follows from that one skipped step.

--- statement
kicker: The product
## Find Me A Job.
A product I built myself. An AI assistant wrote part of the code.
notes: Find Me A Job matches job adverts to the people using it. Part of its code was written by an AI assistant, and that part is the subject of this talk.

--- statement
kicker: What it did
## It copied the whole job advert into ==every user's row==.
notes: Instead of keeping one copy of each advert and pointing users to it, the code stored a full copy of the advert for every user who saw it.

--- cards
kicker: One job advert
## Stored once per user.
- User A | The whole job advert
- User B | The whole job advert
- User C | The whole job advert
- User D | The whole job advert
notes: And so on, for every user. One advert shown to many people took up the space of many adverts.

--- list
kicker: The problem with slop
## ==Nothing broke==.
- The page loaded
- The tests passed
notes: Each user's page read from that user's own row and showed the right jobs, so neither the tests nor the page could show the duplicated data. Slop is code that works well enough that nobody looks at it.

--- stats
kicker: The fix
## I read the code, then I ==fixed it==.
- 76% | smaller table
- 38% | smaller database
notes: Once I read the code the problem was easy to see. I changed it to store each advert once, and that table shrank by 76% and the whole database by 38%.

--- cards
kicker: Two reviews
## A design review and a code review answer ==different questions==.
- Design review | I did it. It looked fine.
- Code review | I skipped it. That is where the cost came from.
notes: A design review asks whether the plan is sound. A code review asks whether the code does what the plan says, and whether it does anything the plan didn't mention.

--- statement
kicker: Where the cost lands
## AI makes writing code ==cheap==.
Reviewing it is still work, and that is where the cost shows up.
notes: When an assistant can write a large pull request in minutes, it is tempting to read its summary, run the tests and merge. Skipping the review moves the cost to later, as storage, slow queries or bugs in code nobody on the team has read.

--- list numbered
kicker: The review standard
## Before you merge ==AI-written code==.
- Read the diff, not just the summary | The summary comes from the same tool that wrote the code
- Check what it stores, not only what it shows | Tables, columns, caches, files and logs
- Ask what happens when this is multiplied by every user | Record size, times records per user, times users
notes: These are the three questions I now ask of every change an assistant writes for me. They are short so that people actually answer them.

--- statement
kicker: Over to you
## What is your review rule for ==AI-written code==?
notes: A question for the room. If your team has a rule for reviewing code written by people, does it also cover code written by an assistant?

--- list
kicker: On Monday
## Adopt the ==standard==.
- Put the three questions in your pull request template
- Make someone read the diff before merge | Preferably not the person who prompted the assistant
- Look at what the code stores | Start with your largest tables
notes: None of this needs a new tool. If a large table's size doesn't make sense for the number of users you have, read the code that writes to it.
