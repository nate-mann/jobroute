# JobRoute Business Case

## 1. The idea

JobRoute is a scheduling, routing and pay app for small exterior cleaning companies, for owners who still work on the site with one to five technicians doing windows, gutters and pressure washing. These owners spend their days on ladders and their nights doing paperwork.

I run one of these companies, Maritime Shine. My upcoming jobs and prices are in my iPhone's Notes app, customer details and payments are in an Excel sheet on my laptop, and I work out my technician's pay on a calculator. Updating Excel takes about five hours a week and needs my computer. My crew finds out their schedule by text the night before. This summer I mixed up what I owed my technician and my salesperson, and they had to correct me after I'd sent the money.

JobRoute puts upcoming jobs in one app the owner and technicians can all see, and shows each technician what they're getting paid that day. Owners pay $29 a month plus $10 per extra technician, so they aren't locked into a plan when techs come and go. JobRoute also takes 5% of jobs passed through its Overflow Network.

I've tried Jobber. It isn't a good CRM, and it can't pass jobs to other businesses. Route optimization only starts on its US$139-a-month plan (getjobber.com, Nov 26, 2026), while JobRoute includes it for $29.

I estimate there are about 15 companies like mine in Greater Moncton. I'd start there, then grow into the rest of New Brunswick and the Maritimes.

## 2. Where IT creates value

JobRoute changes three primary activities in the value chain. In operations, scheduling moves from text messages to an app where technicians see their jobs with live updates. In outbound logistics, technicians get the most efficient route between houses. In marketing and sales, customers get an instant price from the owner's rates on the Customer page instead of waiting for a texted quote, and speed wins jobs.

It also changes two support activities. In HR, each technician's pay for the week is in the app instead of worked out on a calculator. In firm infrastructure, bookkeeping is automatic, so owners stop copying prices from texts and notes into a spreadsheet.

The most value comes from time. For an owner like me, most of five hours of admin a week goes away, and crews stop wasting time and gas. Exterior crews carry a lot of gear, so a bad route costs more than just the drive.

Over a season JobRoute also tracks price per house and real time per service, which gives revenue per hour, so owners see which services to offer more of.

JobRoute is mainly a cost advantage, through less driving and less admin. It also helps differentiation, since instant quotes and an organized crew make a small business look more professional than its competitors.

## 3. Network effects

The Overflow Network lets crews pass jobs they can't take to other local crews. The business that passes the job keeps 10%, the crew that does it keeps 85%, and JobRoute keeps 5%.

It's one-sided, with a same-side network effect. The same crews both post and claim jobs. Maritime Shine might post a job on Tuesday because we're booked solid, then pick up another crew's job on Thursday. That's different from a two-sided market like Uber, where riders and drivers are separate groups.

Each new crew makes the network worth more to every crew already in it, because there are more crews to pass work to and more jobs to pick up. On the prototype, 3 crews claim only 23% of posted jobs, and at that size I wouldn't bother posting. With 20 crews, 91% get claimed in about two hours. This summer Maritime Shine turned down about 10 jobs worth around $300 each because we were booked up. That's $3,000 of work that went nowhere, and I'd have kept about $300 of it. As a small business owner, making 10% without doing any work is an easy decision.

The network is also local, since a job only makes sense for a nearby crew, so JobRoute has to grow town by town, starting with Moncton, Dieppe and Riverview.

To get past the cold-start problem, I'd seed the network. I know three other exterior cleaning owners personally, so with Maritime Shine that's four crews on day one, on a free version. Maritime Shine would post its own overflow jobs from the start and waive its 10%, so the crew that claims the job keeps 95%. Some owners will be nervous handing a customer to a competitor, so passing is optional, crews are rated and insurance-checked, and the crew that takes a job can't market to that customer afterwards.

The prototype's Network tab shows all of this: the 1–40 crew slider, the live map of jobs covered against customers lost, the chart that flattens out, and "Pass to network" in the owner's quote inbox.

## 4. Can it be copied?

Anyone in this class could rebuild the JobRoute website in a weekend with the same AI tool, so the site itself isn't the advantage. Three things could be.

The network of local crews. It's valuable because it's what moves claimed jobs from 23% to 91%. It's rare because owners in Moncton currently pass overflow work by text to people they know, or turn it down like we did. It's hard to imitate because a competitor can copy the Network page but not the crews on it, and since the network is local, they'd have to sign up enough crews in every town. It's only partly substitutable: texting a friend works for one or two contacts, not twenty crews with guaranteed payment. This is the strongest resource.

A founder who runs the business. JobRoute competes on specialization, not number of features. Jobber is built for every trade, so it misses what shapes our days: rain delays that push back a whole schedule, a short season, every house priced differently, and techs paid on commission rather than hourly. I'm willing to change the app often to fit these businesses. Few software founders have done this work themselves, so it's valuable and rare, and it helps me earn other owners' trust. But a big company could hire an operator as an adviser, so it's a head start more than a moat.

Local price and job-time data. Across many businesses, JobRoute would know what a typical house in Dieppe costs and how long gutters really take, which no single owner knows, and could use that to help new users price jobs. A newcomer can't buy a season of local history, so it's hard to imitate. It only builds up as crews use the app, so it depends on the network.

Switching costs add to all three. An owner who leaves gives up a season of customer and price history, techs trained on the app, and their place in the Overflow Network.

JobRoute is also organized to use these advantages. It focuses on one niche, it's run by someone who works in that niche every day, and it grows town by town so each network fills up before the next one starts.

What would a well-funded competitor need? The real threat is Jobber or another scheduling company adding job-passing as a feature. Building it would be quick for them. The slow part is signing up enough exterior crews in each town. Because our work runs spring to fall, I think that takes at least one season per town, and they'd be selling to owners who already know me. So the moat is strong against another small startup but weak against a big company that goes after this niche. The network and the data both get stronger over time, so my priority is filling Greater Moncton first.

## 5. Cloud and operations

To run JobRoute for real, I'd buy the parts every company needs and only build what makes JobRoute different: scheduling for exterior crews and the Overflow Network. A small startup shouldn't build its own maps or payments when good ones already exist. The full list is in the "What a real version would need" table in my log. In short:

- PaaS: app hosting and a shared database (Firebase or Supabase), so the owner and techs see the same jobs
- SaaS: logins (Firebase Authentication), maps and routing (Google Maps Platform), payments and the 85/10/5 split (Stripe Connect, about 3% per payment), and texts (Twilio)
- IaaS: not needed until JobRoute is much bigger

Relying on these providers has risks. Maps charge per request, so the bill grows with every crew, which means checking costs monthly. Customer data would sit on another company's servers, but Canada's privacy law (PIPEDA) still makes JobRoute responsible for it, so I'd pick Canadian data centres and keep backups. The biggest long-term risk is lock-in: once JobRoute is built on Firebase and Stripe, switching would be slow and expensive, so I'd keep the scheduling and network logic separate from any one provider.

If the app went down on a busy Monday morning, the day wouldn't stop. Schedules are set in advance and saved on each technician's phone, so crews could still open their jobs in offline mode, and their timers would sync once the app is back.

## 6. Risks and ethics

Right now my customers' phone numbers and addresses sit in one Excel file on one laptop. JobRoute would hold more than that, so it needs clear rules.

- Homeowners: schedules show when a house is being serviced or the owners are away, and some jobs include gate codes. Only the assigned technician sees those notes, on the day of the job.
- Passed jobs: passing a job gives a customer's address to another company. The claiming crew only sees it after claiming and can't market to that customer.
- Technicians: pay is private. Payments run through Stripe, so JobRoute doesn't store bank details, and each tech sees only their own pay.
- Other owners: since I own Maritime Shine too, competitors might worry I'd see their prices or keep the best jobs. Maritime Shine gets no access to other crews' data, and jobs go to whoever claims first.
- Society: the network lets small local crews take on more work together without hiring, which helps them compete with bigger companies and means fewer customers get turned away.

---

**Ai use**

I used Claude Code (an AI coding assistant) to build the prototype website, and it explained the cloud service options in section 5 to me. The business idea, decisions and reasoning in this business case are my own, based on running Maritime Shine.
