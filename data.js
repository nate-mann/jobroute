// ============================================================
// data.js — ALL the fake data for the JobRoute prototype.
//
// There is no database. Everything below is made up: the business
// (Harbourview Exterior Co.), the people (first names only), the
// addresses and the prices. No real customers appear anywhere.
// ============================================================

const STARTUP = {
  name: "JobRoute",
  tagline: "Every job, route and dollar for your service business, in one place.",
  pitch: "JobRoute replaces the spreadsheet, the group chat and the paper notes for owner-operators of window cleaning, lawn care and exterior service crews. Owners see revenue and labour cost for every job on their phone. Technicians see their day, their route and their pay."
};

// The made-up demo business and the "today" the demo pretends it is.
// (Peak season for exterior services, so the numbers look realistic.)
const DEMO = {
  business: "Harbourview Exterior Co.",
  owner: "Sam",
  area: "Moncton, Dieppe & Riverview, NB",
  today: "2026-07-15",
  monthLabel: "July 2026"
};

// Services the demo business sells. "minutes" is the typical job length,
// used when a job is marked done without timer data.
const SERVICES = [
  { id: "windows", name: "Window cleaning", minutes: 75,  color: "#0f766e" },
  { id: "gutters", name: "Gutter cleaning", minutes: 55,  color: "#2563eb" },
  { id: "wash",    name: "House wash",      minutes: 120, color: "#d97706" },
  { id: "deck",    name: "Deck & driveway", minutes: 100, color: "#7c3aed" }
];

// Settings for the route planner (all made-up but realistic).
const ROUTING = {
  kmPerMapUnit: 0.2,   // the 100-unit demo map is about 20 km across
  roadFactor: 1.3,     // roads are longer than a straight line
  speedKmh: 40,        // average city driving speed with stops
  costPerKm: 0.6,      // fuel + wear on the truck, dollars per km
  dayStart: "08:30",   // crews leave the shop at 8:30
  seasonDays: 110      // working days in one May–October season
};

// Technicians and how they are paid.
// commission: share of the job price. hourly: dollars per hour worked.
const TECHS = [
  { id: "jordan", name: "Jordan", pay: { type: "commission", rate: 0.35 }, payLabel: "35% commission" },
  { id: "riley",  name: "Riley",  pay: { type: "hourly", rate: 22 },       payLabel: "$22 / hour" }
];

// Customer properties with the price the business charges for each service.
// x / y place the property on the demo route map (0–100 grid; base = 50, 50).
const BASE = { name: "Shop", x: 50, y: 52 };

const PROPERTIES = [
  { id: "p1",  address: "27 Birchmount Dr",     town: "Moncton",   type: "2-storey", x: 34, y: 22, prices: { windows: 210, gutters: 150, wash: 340, deck: 180 } },
  { id: "p2",  address: "118 Saltmarsh Rd",     town: "Dieppe",    type: "2-storey", x: 82, y: 30, prices: { windows: 235, gutters: 165, wash: 360, deck: 195 } },
  { id: "p3",  address: "9 Heron Way",          town: "Riverview", type: "Bungalow", x: 22, y: 84, prices: { windows: 160, gutters: 120, wash: 280, deck: 170 } },
  { id: "p4",  address: "42 Old Mill Ln",       town: "Moncton",   type: "2-storey", x: 18, y: 38, prices: { windows: 225, gutters: 155, wash: 350, deck: 210 } },
  { id: "p5",  address: "305 Tidewater Ave",    town: "Moncton",   type: "Split-level", x: 56, y: 18, prices: { windows: 195, gutters: 140, wash: 320, deck: 185 } },
  { id: "p6",  address: "16 Cedar Hollow Crt",  town: "Riverview", type: "2-storey", x: 40, y: 78, prices: { windows: 240, gutters: 170, wash: 375, deck: 220 } },
  { id: "p7",  address: "88 Lakeview Terr",     town: "Dieppe",    type: "Bungalow", x: 90, y: 54, prices: { windows: 170, gutters: 125, wash: 290, deck: 165 } },
  { id: "p8",  address: "51 Granite Ridge",     town: "Moncton",   type: "2-storey", x: 28, y: 10, prices: { windows: 255, gutters: 175, wash: 390, deck: 230 } },
  { id: "p9",  address: "7 Foxglove St",        town: "Riverview", type: "Bungalow", x: 12, y: 70, prices: { windows: 150, gutters: 115, wash: 270, deck: 160 } },
  { id: "p10", address: "230 Bayberry Blvd",    town: "Dieppe",    type: "Split-level", x: 74, y: 14, prices: { windows: 200, gutters: 145, wash: 330, deck: 190 } },
  { id: "p11", address: "63 Kingfisher Dr",     town: "Moncton",   type: "2-storey", x: 64, y: 40, prices: { windows: 215, gutters: 150, wash: 345, deck: 200 } },
  { id: "p12", address: "14 Maplecrest Ave",    town: "Moncton",   type: "Bungalow", x: 46, y: 32, prices: { windows: 165, gutters: 120, wash: 285, deck: 175 } }
];

// Jobs for the demo month. status: "done" or "scheduled".
// A scheduled job dated before DEMO.today shows as overdue.
// Done jobs have start/end times logged by the technician.
const JOBS = [
  { id: 1,  date: "2026-07-01", property: "p1",  service: "windows", tech: "jordan", status: "done", start: "09:00", end: "10:30" },
  { id: 2,  date: "2026-07-01", property: "p5",  service: "gutters", tech: "riley",  status: "done", start: "11:00", end: "12:15" },
  { id: 3,  date: "2026-07-02", property: "p2",  service: "wash",    tech: "jordan", status: "done", start: "08:30", end: "11:05" },
  { id: 4,  date: "2026-07-03", property: "p3",  service: "windows", tech: "riley",  status: "done", start: "09:00", end: "10:40" },
  { id: 5,  date: "2026-07-03", property: "p9",  service: "windows", tech: "riley",  status: "done", start: "11:00", end: "12:20" },
  { id: 6,  date: "2026-07-06", property: "p4",  service: "deck",    tech: "jordan", status: "done", start: "09:00", end: "11:30" },
  { id: 7,  date: "2026-07-07", property: "p7",  service: "windows", tech: "jordan", status: "done", start: "08:30", end: "10:15" },
  { id: 8,  date: "2026-07-07", property: "p10", service: "gutters", tech: "jordan", status: "done", start: "10:45", end: "12:00" },
  { id: 9,  date: "2026-07-08", property: "p6",  service: "wash",    tech: "riley",  status: "done", start: "09:00", end: "11:45" },
  { id: 10, date: "2026-07-09", property: "p8",  service: "windows", tech: "jordan", status: "done", start: "09:00", end: "10:50" },
  { id: 11, date: "2026-07-09", property: "p12", service: "windows", tech: "riley",  status: "done", start: "09:30", end: "11:00" },
  { id: 12, date: "2026-07-10", property: "p11", service: "gutters", tech: "riley",  status: "done", start: "13:00", end: "14:10" },
  { id: 13, date: "2026-07-10", property: "p1",  service: "gutters", tech: "jordan", status: "done", start: "13:00", end: "14:00" },
  { id: 14, date: "2026-07-13", property: "p5",  service: "windows", tech: "jordan", status: "done", start: "08:30", end: "10:30" },
  { id: 15, date: "2026-07-13", property: "p3",  service: "deck",    tech: "riley",  status: "done", start: "09:00", end: "11:15" },
  { id: 16, date: "2026-07-14", property: "p2",  service: "windows", tech: "riley",  status: "scheduled", note: "Rain delay" },
  { id: 17, date: "2026-07-14", property: "p7",  service: "wash",    tech: "jordan", status: "scheduled", note: "Rain delay" },
  // Today (Jul 15). Listed in the order the customers booked, which is
  // how most small crews end up driving them without a route planner.
  { id: 18, date: "2026-07-15", property: "p4",  service: "windows", tech: "jordan", status: "scheduled" },
  { id: 19, date: "2026-07-15", property: "p9",  service: "gutters", tech: "jordan", status: "scheduled" },
  { id: 20, date: "2026-07-15", property: "p12", service: "deck",    tech: "jordan", status: "scheduled" },
  { id: 21, date: "2026-07-15", property: "p11", service: "windows", tech: "riley",  status: "scheduled" },
  { id: 22, date: "2026-07-15", property: "p6",  service: "windows", tech: "riley",  status: "scheduled" },
  { id: 27, date: "2026-07-15", property: "p8",  service: "windows", tech: "jordan", status: "scheduled" },
  { id: 28, date: "2026-07-15", property: "p3",  service: "gutters", tech: "jordan", status: "scheduled" },
  { id: 29, date: "2026-07-15", property: "p10", service: "gutters", tech: "riley",  status: "scheduled" },
  { id: 30, date: "2026-07-15", property: "p5",  service: "wash",    tech: "riley",  status: "scheduled" },
  // Later this month
  { id: 23, date: "2026-07-16", property: "p8",  service: "gutters", tech: "riley",  status: "scheduled" },
  { id: 24, date: "2026-07-16", property: "p10", service: "windows", tech: "jordan", status: "scheduled" },
  { id: 25, date: "2026-07-17", property: "p1",  service: "wash",    tech: "riley",  status: "scheduled" },
  { id: 26, date: "2026-07-20", property: "p5",  service: "deck",    tech: "jordan", status: "scheduled" }
];

// ------------------------------------------------------------
// OVERFLOW NETWORK — made-up numbers for the network-effect demo.
// ------------------------------------------------------------
const NETWORK = {
  startOperators: 3,      // slider starting point
  maxOperators: 40,
  chanceEachCanTake: 0.12, // chance any one nearby operator has the right service AND a free slot
  postsPerMonth: 4,       // overflow jobs a typical crew turns away each peak month
  matchRate: 0.15,        // share of other operators' posts that suit YOUR services and area
  avgJobPrice: 210,
  seasonMonths: 6,
  hoursToClaimBase: 36,   // with one other operator, a post waits ~36 h
  split: { sender: 0.10, jobroute: 0.05 } // the crew doing the job keeps the rest (85%)
};

// Other (fictional) JobRoute operators and the overflow jobs they've posted.
// The slider decides how many of these are visible: more operators, more posts.
const OVERFLOW_FEED = [
  { id: "o1", from: "Northgate Lawn Crew",   service: "windows", address: "12 Juniper Crt",    town: "Moncton",   date: "2026-07-16", price: 220, km: 3.1, reason: "Lawn company: doesn't do windows" },
  { id: "o2", from: "Saltmarsh Exterior",    service: "gutters", address: "401 Pointe Rd",     town: "Dieppe",    date: "2026-07-17", price: 160, km: 5.4, reason: "Booked solid this week" },
  { id: "o3", from: "Crestline Wash Co.",    service: "deck",    address: "6 Alder Bend",      town: "Riverview", date: "2026-07-16", price: 195, km: 4.8, reason: "Pressure washer in for repair" },
  { id: "o4", from: "Fundy Clear Windows",   service: "windows", address: "77 Ridgeback Dr",   town: "Moncton",   date: "2026-07-18", price: 245, km: 2.6, reason: "Crew member off sick" },
  { id: "o5", from: "Tideline Property Care",service: "wash",    address: "18 Oakhurst Ave",   town: "Dieppe",    date: "2026-07-20", price: 330, km: 6.2, reason: "Too far from their other jobs" },
  { id: "o6", from: "Northgate Lawn Crew",   service: "gutters", address: "250 Millcreek Rd",  town: "Moncton",   date: "2026-07-21", price: 150, km: 3.9, reason: "Lawn company: no ladders" }
];

// ------------------------------------------------------------
// PRICING — the plan JobRoute sells (CAD).
// ------------------------------------------------------------
const PRICING = {
  base: 29,          // per month: owner account + everything
  perTech: 10,       // per month for each technician
  // Rough monthly savings used by the pricing calculator
  adminHoursSaved: 3, // owner hours per week no longer spent on spreadsheets
  ownerHourValue: 25,
  routeKmSavedPerCrewDay: 12,
  workDaysPerMonth: 22
};
