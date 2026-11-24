# Project log

**Name:** Nate
**Startup name:** JobRoute
**Live site link:** https://nate-mann.github.io/jobroute/

AI tool used to build the site: Claude Code (an AI coding assistant), running on my Mac. I described what I wanted and checked the results; it wrote the HTML, CSS and JavaScript. I used GitHub Desktop to push commits to GitHub.

On Nov 24 I emailed my professor to ask if using Claude Code instead of Copilot was okay. He said yes, as long as the site wasn't made in one shot and had several commits from iterating, and that he'd expect it to be nicer given what Claude can do.

---

## Work sessions

### Session 1 — Nov 23 — driver: Nate

- **Goal for this session:** Pick the idea, set up the repo from the class template, and build the first working part of the site: a home page that explains JobRoute, a way to pick a role (owner or technician), and the owner dashboard.
- **Key prompts I gave the AI** (the important ones):
  1. Describing the idea: "JobRoute is a web/app that allows small service business owners to have one platform where it's able to track all sales/revenue, track routes and make them as efficient as possible. Also technicians can log in and see what their day looks like, what routes they will take and a start/stop time." I also gave it my pitch deck from last winter.
  2. Explaining the problem from my own business: "Right now as a business owner I track all my revenue and expenses on an Excel sheet, which is time consuming and doesn't help business operations. It just lets me track stuff. It doesn't add value to my workers or let me see important stuff on my phone."
  3. Choosing the network effect: I picked the "overflow network" idea: "if my business can't take a job they've been asked to do, they can offer it to another business." This will be its own page later.
  4. "Build this app in the software they want it built in": plain HTML/CSS/JavaScript inside the instructor's template, published with GitHub Pages.
- **What worked:**
  - Home page with the problem (before vs. after JobRoute), how it works in 3 steps, and a role picker. I made the role picker plain links, not a login form, so it can't look like a real sign-in.
  - Owner dashboard using fake data for a made-up crew, "Harbourview Exterior Co." (Moncton area, July demo month). It shows revenue earned, labour payout, profit after labour, money still booked and overdue jobs. It also has revenue-by-service bars and a revenue vs. labour split per technician.
  - Labour is calculated two ways, because that's how small crews really pay people: Jordan is on 35% commission, Riley is paid $22/hour from logged start/stop times.
  - Jobs table with filters (All / Done / Scheduled / Overdue) and a "Mark done" button that updates all the numbers right away.
  - "Book a job" form: picking a property and service fills in the price that property usually pays. That's the "stores pricing for every property" feature from my pitch.
  - On a phone, the jobs table turns into stacked cards so nothing scrolls sideways.
- **What broke, and how we fixed it:**
  - My Chrome was signed into my business GitHub account, not my class account, so the AI couldn't find my repo at first. I switched to my class account.
  - Connecting the command-line GitHub tool failed twice: my keypresses weren't reaching the terminal panel, then the sign-in dropped its connection. I installed GitHub Desktop instead and push from there.
  - The first preview showed one giant logo because the page was opened without its stylesheet. Serving the folder with a small local web server fixed it.
  - Opening the Owner page directly hid its heading under the sticky header. The AI added a scroll offset in the CSS.
- **Committed?** yes — "Session 1: JobRoute home page, role picker and owner dashboard"

### Session 2 — Nov 23 (second sitting, same afternoon) — driver: Nate

- **Goal for this session:** Build the two features that make JobRoute more than a spreadsheet: a route planner that shows how much driving the shortest order saves, and the technician's day with a start/stop timer and pay for each job.
- **Key prompts I gave the AI:**
  1. "No, let's keep this going." I asked to start session 2 right after session 1 went live.
  2. From my pitch deck: "Daily route optimization for service crews", "Logs start and end times for each job" and "Automatically calculates labour payout". I asked for these to work on the site, not just be described.
- **What worked:**
  - **Routes page:** a drawn map of Moncton/Dieppe/Riverview with today's stops for each crew. "Booking order" shows the stops in the order customers booked, which is how I plan days now. It zig-zags across the river. "⚡ Optimize route" tests every possible order and draws the shortest loop. For Jordan's crew that's 68.6 km down to 44.4 km (24 km and 36 minutes saved, back at the shop at 3:37 pm instead of 4:13 pm). It also works out the season total: about 2,650 km and roughly $1,600 in truck costs over 110 working days.
  - **Technician page:** Jordan's or Riley's stops in the shortest order, with estimated arrival times, job length, distance and what they'll earn. "Start job" starts a timer (the demo clock runs 60× faster). "Finish job" logs the start/end times and pay, and the rest of the day's arrival times update.
  - Finishing a job on the technician page updates the owner dashboard right away. That's the core idea of JobRoute: the worker's day feeds the owner's numbers with no spreadsheet.
  - Pay matches how each person is paid: Jordan sees 35% of each job's price, Riley sees hours × $22.
- **What broke, and how we fixed it:**
  - After optimizing, the "Optimize route" button stayed on screen even though the code told it to hide. The button's CSS was overriding the "hidden" setting. The AI added one CSS rule so hidden things always stay hidden.
  - The first wording for the savings said the crew would have time for "a longer lunch", which sounded silly when it came up in testing. The AI changed it to say the crew finishes earlier, or can fit in another job when the saving is big enough.
- **Committed?** yes — "Session 2: route planner with optimizer and technician day with job timers"

### Session 3 — Nov 24 — driver: Nate

- **Goal for this session:** Show the network effect on the site instead of just describing it (the Overflow Network page), add a pricing page with my revenue model, and fix the live site showing an old stylesheet after updates.
- **Key prompts / decisions I gave the AI:**
  1. "Let's start session 3."
  2. My pricing decision: the AI asked what JobRoute should charge and offered four options (two flat plans, a free tier plus a paid plan, one flat price, or a base price plus a per-technician fee). I chose **$29/month, which includes the owner, plus $10/month per extra technician.** My reasoning is in the business case.
  3. My overflow fee decision: from three options, I chose **10% to the business that passes the job on and 5% to JobRoute**, so the crew that does the job keeps 85%.
  4. The network effect idea from session 1: if my business can't take a job, it can offer it to another business.
- **What worked:**
  - **Network page:** explains the Overflow Network in 4 steps with the 85/10/5 split. A slider changes the number of JobRoute operators in the Moncton area from 1 to 40. With 1 operator nothing works (0% of posted jobs get claimed: the cold-start problem). With 3 it's 23%, with 10 it's about 68%, and with 20 it's 91%, claimed in about 2 hours. A chart shows the curve flattening out, so each new operator adds less once the network is big.
  - The "Overflow jobs near you" feed grows as the slider goes up: more operators means more jobs to pick up. **Claiming a job adds it to Jordan's schedule and the owner dashboard** at the 85% the crew keeps.
  - "Pass on one of your jobs" lets you post a real upcoming Harbourview job. Whether it gets claimed depends on the slider, so at 2 operators it usually fails and at 30 it almost always works. This shows the network effect from the side of the person posting.
  - **Pricing page:** the plan card, a calculator (technicians 0–10) that compares the monthly cost with estimated savings (owner spreadsheet time plus less driving), and an example of the overflow fee split on a $200 job. There's no payment form, on purpose.
  - Home page now has an Overflow Network teaser card, so a visitor sees the network idea in the first 30 seconds.
  - Added "?v=3" to the CSS/JS links, so browsers download the newest files after each update.
- **What broke, and how we fixed it:**
  - Last night, after pushing session 2, the live Routes page looked broken for a few minutes. The browser was using the old saved stylesheet with the new page. Hard-refreshing fixed it for me, and the "?v=3" version tags fix it for everyone.
  - While testing, a gutter job I posted was "claimed by Northgate Lawn Crew", but the feed says that company has no ladders. The AI changed it so only the exterior-cleaning companies can claim jobs.
  - On a phone, the menu now had 7 links and only the first 4 fit. Network, Pricing and About were hidden off the side of the screen. The AI made the menu wrap onto two rows on small screens.
- **Committed?** yes — "Session 3: Overflow Network simulation, pricing page and cache fix"

### Session 4 — Nov 24 (second sitting, evening) — driver: Nate

- **Goal for this session:** My professor said he'd expect a nicer site since I'm using Claude, so make the demo more impressive and easier to follow: show the network effect happening on a map, show the route being driven, and add a guided tour so a visitor sees every feature.
- **Key prompts / decisions I gave the AI:**
  1. "So what else should we do today? I have a lot of time today." The AI suggested five upgrades and I went with its top three: a live network map, a truck that drives the route, and a 60-second tour.
  2. "Yes, start session 4."
- **What worked:**
  - **Live network map (Network page):** a map of Moncton/Dieppe/Riverview with a dot for every JobRoute crew. Moving the slider adds or removes crews, and each crew is joined to its closest neighbours. Amber dots show jobs being passed between crews. Whether a job gets covered uses the same claim chance as the numbers on the page, so with 3 crews you see lots of red "customer lost" flashes, and with 25 crews almost every job gets picked up. A counter keeps score: jobs covered vs. customers lost.
  - Posting one of my jobs or claiming one from the feed now also shows the job moving on the map, to or from the crew that took it.
  - **Truck on the Routes page:** after the route line draws, a truck drives it stop by stop. A clock shows the time of day (8:30 am leaving the shop, back at 3:37 pm on the optimized route) and each stop gets a check mark when it's reached. You can watch the booking order zig-zag and then the optimized loop. "Replay drive" runs it again.
  - **60-second guided tour:** a "Take the 60-second tour" button on the home page walks through 9 steps: owner numbers, the jobs list, booking order vs. optimized route, the technician's day, the network map filling up from 3 to 20 crews, claiming overflow jobs, and pricing. Each step opens the right page and outlines the part it's talking about. The numbers in the tour come from the demo itself, so they stay correct.
  - People who turn on "reduce motion" on their device get the same information without the animations.
  - Changed "?v=3" to "?v=4" so browsers load the new files.
- **What broke, and how we fixed it:**
  - The truck's clock box sat in the top corner of the map and covered stop 2. The AI moved it to the empty bottom corner and moved the "Riverview" label so they don't overlap.
  - Some crew dots on the network map landed on top of the town names. The AI made the dots avoid the labels.
  - On a phone, the tour card covered the bottom half of the map it was talking about. The tour now outlines just the map on those steps, so it fits above the card.
- **Committed?** yes — "Session 4: live network map, truck route animation and guided tour"

---

## Things that broke (running list)

| Date | What went wrong | What we tried | What finally fixed it |
|---|---|---|---|
| Nov 23 | Couldn't find my class repo | Looked in the GitHub account signed into Chrome | It was my business account; signed into my class account (nate-mann) |
| Nov 23 | Command-line GitHub sign-in wouldn't finish | Pressing Enter in the terminal panel, then a one-time code | Installed GitHub Desktop and pushed from there |
| Nov 23 | Preview showed only a giant logo, no styling | Opening index.html directly | Ran a local web server so styles.css loads |
| Nov 23 | Owner page heading hidden under the header | — | Added a scroll offset in styles.css |
| Nov 23 | "Optimize route" button wouldn't hide after optimizing | Checked that the code set it to hidden | Button CSS overrode "hidden"; added a rule so hidden always wins |
| Nov 23 | Live Routes page looked broken right after pushing session 2 | Checked GitHub had the new file (it did) | Browser was using its old saved stylesheet; hard refresh, then added "?v=3" to the file links (Nov 24) |
| Nov 24 | A lawn company "claimed" a gutter job it couldn't do | — | Only exterior-cleaning companies can claim posted jobs now |
| Nov 24 | Network, Pricing and About links hidden on phones | — | Menu wraps onto two rows on small screens |
| Nov 24 | Truck's clock box covered a stop on the map | — | Moved the clock to an empty corner and moved the Riverview label |
| Nov 24 | Network map dots on top of town names | — | Dots now avoid the labels |
| Nov 24 | Tour card covered the map on phones | Scrolling the page | Tour outlines just the map on those steps so both fit on screen |

## What a real version would need

| Feature we faked or skipped | Why a real company would need it | How hard / expensive? |
|---|---|---|
| Shared database | Right now jobs only save in one browser. The owner and every technician need to see the same jobs live | Medium: a hosted database (PaaS) plus a developer to build it |
| Real logins and roles | Technicians should only see their own jobs and pay; only the owner should see the business's revenue | Medium: a login service (SaaS), roughly a few hundred dollars a month at scale |
| Real maps and routing | The demo map is drawn by hand and uses straight lines. Real routes need actual roads, bridges, traffic and turn-by-turn directions | Medium: a mapping/routing service (SaaS) that charges per request, so cost grows with every crew and every day |
| Real job timer on a phone app | Technicians need it on their phone in the truck, working even with bad signal, with times saved to the shared database | Hard: a mobile app (or offline-capable web app) plus testing on many phones |
| Payments and the automatic 85/10/5 split | Overflow jobs only work if money moves automatically: the customer pays, then the crew, the referring business and JobRoute each get their share | Medium: a payment processor (SaaS) with payouts to many businesses; it takes about 3% per payment, and taxes and refunds get complicated |
| Trust and safety for overflow jobs | Before handing a customer to another crew, operators need to know that crew is insured, does good work and won't steal the customer. Disputes need someone to sort them out | Hard and ongoing: insurance checks, ratings, rules about who "owns" the customer, and a support person to handle complaints (staff cost, not just software) |

## Reflection (fill in at the end)

1. What surprised you most about building software with AI?
2. Which parts were easy, and which were hard? Why do you think that is?
3. If a competitor had the same AI tool, how long would it take them to copy your site?
