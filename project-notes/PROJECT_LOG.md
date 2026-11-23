# Project log

**Name:** Nate
**Startup name:** JobRoute
**Live site link:** https://nate-mann.github.io/jobroute/

AI tool used to build the site: Claude Code (an AI coding assistant), running on my Mac. I described what I wanted and checked the results; it wrote the HTML, CSS and JavaScript. I used GitHub Desktop to push commits to GitHub.

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

---

## Things that broke (running list)

| Date | What went wrong | What we tried | What finally fixed it |
|---|---|---|---|
| Nov 23 | Couldn't find my class repo | Looked in the GitHub account signed into Chrome | It was my business account; signed into my class account (nate-mann) |
| Nov 23 | Command-line GitHub sign-in wouldn't finish | Pressing Enter in the terminal panel, then a one-time code | Installed GitHub Desktop and pushed from there |
| Nov 23 | Preview showed only a giant logo, no styling | Opening index.html directly | Ran a local web server so styles.css loads |
| Nov 23 | Owner page heading hidden under the header | — | Added a scroll offset in styles.css |
| Nov 23 | "Optimize route" button wouldn't hide after optimizing | Checked that the code set it to hidden | Button CSS overrode "hidden"; added a rule so hidden always wins |

## What a real version would need

| Feature we faked or skipped | Why a real company would need it | How hard / expensive? |
|---|---|---|
| Shared database | Right now jobs only save in one browser. The owner and every technician need to see the same jobs live | Medium: a hosted database (PaaS) plus a developer to build it |
| Real logins and roles | Technicians should only see their own jobs and pay; only the owner should see the business's revenue | Medium: a login service (SaaS), roughly a few hundred dollars a month at scale |
| Real maps and routing | The demo map is drawn by hand and uses straight lines. Real routes need actual roads, bridges, traffic and turn-by-turn directions | Medium: a mapping/routing service (SaaS) that charges per request, so cost grows with every crew and every day |
| Real job timer on a phone app | Technicians need it on their phone in the truck, working even with bad signal, with times saved to the shared database | Hard: a mobile app (or offline-capable web app) plus testing on many phones |

## Reflection (fill in at the end)

1. What surprised you most about building software with AI?
2. Which parts were easy, and which were hard? Why do you think that is?
3. If a competitor had the same AI tool, how long would it take them to copy your site?
