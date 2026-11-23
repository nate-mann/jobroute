// ============================================================
// app.js — what JobRoute DOES.
// Plain JavaScript, no libraries, no installs.
// It uses STARTUP, DEMO, SERVICES, ROUTING, TECHS, BASE,
// PROPERTIES and JOBS from data.js (loaded first).
// ============================================================

(function () {
  "use strict";

  // ----------------------------------------------------------
  // 1. Saving things in the browser (localStorage).
  //    This only remembers things on THIS browser on THIS device.
  //    A real product would need a server and a shared database
  //    so the owner and every technician see the same jobs.
  // ----------------------------------------------------------
  const storage = {
    get: function (key, fallback) {
      try {
        const saved = localStorage.getItem(key);
        return saved === null ? fallback : JSON.parse(saved);
      } catch (error) {
        return fallback; // storage blocked or broken: just carry on
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        // storage blocked (e.g. private window): ignore
      }
    },
    remove: function (key) {
      try { localStorage.removeItem(key); } catch (error) { /* ignore */ }
    }
  };

  const JOBS_KEY = "jobroute.jobs.v2";
  const TECH_KEY = "jobroute.techView";

  function freshJobs() {
    return JSON.parse(JSON.stringify(JOBS));
  }

  let jobs = storage.get(JOBS_KEY, null) || freshJobs();

  function saveJobs() {
    storage.set(JOBS_KEY, jobs);
  }

  // ----------------------------------------------------------
  // 2. Small helpers: look-ups, money, dates, times.
  // ----------------------------------------------------------
  function byId(list, id) {
    return list.find(function (item) { return item.id === id; });
  }

  function money(amount) {
    const rounded = Math.round(amount);
    return (rounded < 0 ? "−$" : "$") + Math.abs(rounded).toLocaleString("en-CA");
  }

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function shortDate(iso) {
    const parts = iso.split("-");
    return MONTHS[Number(parts[1]) - 1] + " " + Number(parts[2]);
  }

  function dayName(iso) {
    const parts = iso.split("-").map(Number);
    return DAYS[new Date(parts[0], parts[1] - 1, parts[2]).getDay()];
  }

  // "09:05" -> 545 (minutes after midnight)
  function toMin(clock) {
    const parts = clock.split(":").map(Number);
    return parts[0] * 60 + parts[1];
  }

  // 545 -> "09:05" (for storing)
  function toClock(minutes) {
    const m = Math.round(minutes);
    const h = Math.floor(m / 60) % 24;
    const mm = m % 60;
    return (h < 10 ? "0" : "") + h + ":" + (mm < 10 ? "0" : "") + mm;
  }

  // 545 -> "9:05 am" (for showing)
  function niceTime(minutes) {
    const m = Math.round(minutes);
    const h24 = Math.floor(m / 60) % 24;
    const mm = m % 60;
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return h12 + ":" + (mm < 10 ? "0" : "") + mm + (h24 < 12 ? " am" : " pm");
  }

  // 75 -> "1 h 15 min"
  function duration(minutes) {
    const m = Math.round(minutes);
    if (m < 60) return m + " min";
    return Math.floor(m / 60) + " h" + (m % 60 ? " " + (m % 60) + " min" : "");
  }

  function minutesBetween(start, end) {
    return toMin(end) - toMin(start);
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function kpiCard(label, value, note, bad) {
    const node = el("div", "card kpi");
    node.append(
      el("p", "kpi-label", label),
      el("p", "kpi-value", value),
      el("p", "kpi-note" + (bad ? " bad" : ""), note)
    );
    return node;
  }

  function setChips(container, items, selectedId, onPick) {
    container.replaceChildren.apply(container, items.map(function (item) {
      const chip = el("button", "chip", item.name);
      chip.type = "button";
      chip.setAttribute("aria-pressed", item.id === selectedId ? "true" : "false");
      chip.addEventListener("click", function () { onPick(item.id); });
      return chip;
    }));
  }

  // ----------------------------------------------------------
  // 3. The business maths for one job.
  //    price  — what the customer pays (from the property's price list)
  //    hours  — logged start/stop time, or the typical length if missing
  //    labour — commission share, or hours × hourly rate
  // ----------------------------------------------------------
  function jobPrice(job) {
    if (typeof job.price === "number") return job.price;
    const property = byId(PROPERTIES, job.property);
    return property ? property.prices[job.service] : 0;
  }

  function plannedMinutes(job) {
    const service = byId(SERVICES, job.service);
    return service ? service.minutes : 60;
  }

  function jobHours(job) {
    if (job.start && job.end) return minutesBetween(job.start, job.end) / 60;
    return plannedMinutes(job) / 60;
  }

  function jobLabour(job) {
    const tech = byId(TECHS, job.tech);
    if (!tech) return 0;
    if (tech.pay.type === "commission") return jobPrice(job) * tech.pay.rate;
    return jobHours(job) * tech.pay.rate;
  }

  function jobState(job) {
    if (job.status === "done") return "done";
    return job.date < DEMO.today ? "overdue" : "scheduled";
  }

  const STATE_LABEL = { done: "Done", scheduled: "Scheduled", overdue: "Overdue" };

  // ----------------------------------------------------------
  // 4. Routing maths.
  //    Distance is measured on the demo map, then turned into km,
  //    driving minutes and truck cost using the ROUTING settings.
  // ----------------------------------------------------------
  function spot(job) {
    const property = byId(PROPERTIES, job.property);
    return property ? { x: property.x, y: property.y } : { x: BASE.x, y: BASE.y };
  }

  function legKm(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y) * ROUTING.kmPerMapUnit * ROUTING.roadFactor;
  }

  function driveMinutes(km) {
    return (km / ROUTING.speedKmh) * 60;
  }

  // Total km for a loop: shop -> every stop in order -> back to shop
  function routeKm(list) {
    let km = 0;
    let previous = BASE;
    list.forEach(function (job) {
      const here = spot(job);
      km += legKm(previous, here);
      previous = here;
    });
    return list.length ? km + legKm(previous, BASE) : 0;
  }

  function permutations(list) {
    if (list.length <= 1) return [list.slice()];
    const out = [];
    list.forEach(function (item, i) {
      const rest = list.slice(0, i).concat(list.slice(i + 1));
      permutations(rest).forEach(function (p) { out.push([item].concat(p)); });
    });
    return out;
  }

  // The shortest order. With a normal day (up to 8 stops) we can simply
  // test every possible order. Bigger days fall back to "nearest stop next".
  function bestOrder(list) {
    if (list.length <= 1) return list.slice();
    if (list.length <= 8) {
      let best = list.slice();
      let bestKm = routeKm(best);
      permutations(list).forEach(function (order) {
        const km = routeKm(order);
        if (km < bestKm - 1e-9) { best = order; bestKm = km; }
      });
      return best;
    }
    const left = list.slice();
    const order = [];
    let here = BASE;
    while (left.length) {
      left.sort(function (a, b) { return legKm(here, spot(a)) - legKm(here, spot(b)); });
      const next = left.shift();
      order.push(next);
      here = spot(next);
    }
    return order;
  }

  // A crew's jobs for today, in the order the customers booked them.
  function todaysJobs(techId) {
    return jobs
      .filter(function (job) { return job.date === DEMO.today && job.tech === techId; })
      .sort(function (a, b) { return a.id - b.id; });
  }

  // Arrival time and length for each stop. Finished jobs use their real
  // logged times, so the rest of the day's estimates move with them.
  function planDay(order) {
    let clock = toMin(ROUTING.dayStart);
    let previous = BASE;
    const stops = order.map(function (job) {
      const here = spot(job);
      const km = legKm(previous, here);
      let arrive = clock + driveMinutes(km);
      let length = plannedMinutes(job);
      if (job.status === "done" && job.start && job.end) {
        arrive = toMin(job.start);
        length = minutesBetween(job.start, job.end);
      } else if (job.running) {
        arrive = toMin(job.running.start);
        length = Math.max(length, runningMinutes(job));
      }
      clock = arrive + length;
      previous = here;
      return { job: job, arrive: arrive, length: length, km: km };
    });
    const homeKm = order.length ? legKm(previous, BASE) : 0;
    return { stops: stops, finish: clock + driveMinutes(homeKm), km: routeKm(order) };
  }

  // Demo clock: 1 real second = 1 job minute.
  function runningMinutes(job) {
    if (!job.running) return 0;
    return Math.max(0, (Date.now() - job.running.realStart) / 1000);
  }

  // ----------------------------------------------------------
  // 5. Put the startup's name and pitch on the page.
  // ----------------------------------------------------------
  document.title = STARTUP.name + " — smart routing & job management";
  document.getElementById("brand-name").textContent = STARTUP.name;
  document.getElementById("tagline").textContent = STARTUP.tagline;
  document.getElementById("pitch").textContent = STARTUP.pitch;

  // ----------------------------------------------------------
  // 6. Views: show one section at a time, based on the #link.
  // ----------------------------------------------------------
  function currentView() {
    const requested = (window.location.hash || "#home").slice(1);
    return document.getElementById(requested) && document.getElementById(requested).hasAttribute("data-view")
      ? requested
      : "home";
  }

  function showView() {
    const requested = (window.location.hash || "#home").slice(1);
    const views = document.querySelectorAll("[data-view]");

    // "#roles" is a spot on the home page, not a separate view
    if (requested === "roles") {
      views.forEach(function (view) { view.hidden = view.id !== "home"; });
      document.getElementById("roles").scrollIntoView();
      return;
    }

    const current = currentView();
    views.forEach(function (view) {
      view.hidden = view.id !== current;
    });

    document.querySelectorAll("nav a").forEach(function (link) {
      if (link.getAttribute("href") === "#" + current) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    if (current === "owner") renderOwner();
    if (current === "route") renderRoute(true);
    if (current === "tech") renderTech();

    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", showView);

  // ----------------------------------------------------------
  // 7. Owner dashboard.
  // ----------------------------------------------------------
  let filter = "all";

  function renderKpis() {
    const done = jobs.filter(function (job) { return job.status === "done"; });
    const open = jobs.filter(function (job) { return job.status !== "done"; });
    const overdue = open.filter(function (job) { return jobState(job) === "overdue"; });

    const revenue = done.reduce(function (sum, job) { return sum + jobPrice(job); }, 0);
    const labour = done.reduce(function (sum, job) { return sum + jobLabour(job); }, 0);
    const hours = done.reduce(function (sum, job) { return sum + jobHours(job); }, 0);
    const profit = revenue - labour;
    const booked = open.reduce(function (sum, job) { return sum + jobPrice(job); }, 0);
    const margin = revenue ? Math.round((profit / revenue) * 100) : 0;

    const box = document.getElementById("kpis");
    box.replaceChildren(
      kpiCard("Revenue earned", money(revenue), done.length + " jobs completed"),
      kpiCard("Labour payout", money(labour), "Commission + hourly pay"),
      kpiCard("Profit after labour", money(profit), margin + "% margin · " + money(hours ? profit / hours : 0) + " per crew hour"),
      kpiCard("Still booked", money(booked),
        open.length + " jobs ahead" + (overdue.length ? " · " + overdue.length + " overdue" : ""),
        overdue.length > 0)
    );
  }

  function renderServiceBars() {
    const totals = SERVICES.map(function (service) {
      const total = jobs
        .filter(function (job) { return job.status === "done" && job.service === service.id; })
        .reduce(function (sum, job) { return sum + jobPrice(job); }, 0);
      return { service: service, total: total };
    }).sort(function (a, b) { return b.total - a.total; });

    const max = Math.max.apply(null, totals.map(function (t) { return t.total; }).concat([1]));
    const box = document.getElementById("service-bars");
    box.replaceChildren.apply(box, totals.map(function (row) {
      const wrap = el("div", "bar-row");
      const label = el("div", "bar-label");
      label.append(el("span", "", row.service.name), el("span", "", money(row.total)));
      const track = el("div", "bar-track");
      const fill = el("div", "bar-fill");
      fill.style.width = (row.total / max) * 100 + "%";
      fill.style.background = row.service.color;
      track.append(fill);
      wrap.append(label, track);
      return wrap;
    }));
  }

  function renderTechSplit() {
    const box = document.getElementById("tech-split");
    box.replaceChildren.apply(box, TECHS.map(function (tech) {
      const done = jobs.filter(function (job) { return job.status === "done" && job.tech === tech.id; });
      const revenue = done.reduce(function (sum, job) { return sum + jobPrice(job); }, 0);
      const labour = done.reduce(function (sum, job) { return sum + jobLabour(job); }, 0);
      const hours = done.reduce(function (sum, job) { return sum + jobHours(job); }, 0);
      const labourShare = revenue ? (labour / revenue) * 100 : 0;

      const row = el("div", "split-row");
      const name = el("div", "split-name");
      const who = el("span");
      who.append(el("strong", "", tech.name), document.createTextNode(" · " + tech.payLabel));
      name.append(who, el("span", "muted", money(revenue)));

      const track = el("div", "split-track");
      const lab = el("div", "split-labour");
      lab.style.width = labourShare + "%";
      const prof = el("div", "split-profit");
      prof.style.width = (100 - labourShare) + "%";
      track.append(lab, prof);

      const legend = el("div", "split-legend");
      const l1 = el("span");
      const d1 = el("span", "dot"); d1.style.background = "var(--accent)";
      l1.append(d1, document.createTextNode("Labour " + money(labour)));
      const l2 = el("span");
      const d2 = el("span", "dot"); d2.style.background = "var(--brand)";
      l2.append(d2, document.createTextNode("Profit " + money(revenue - labour)));
      legend.append(l1, l2, el("span", "", done.length + " jobs · " + hours.toFixed(1) + " h"));

      row.append(name, track, legend);
      return row;
    }));
  }

  function cell(label, className, content) {
    const td = el("td", className);
    if (label) td.setAttribute("data-label", label);
    if (content instanceof Node) td.append(content);
    else if (content !== undefined) td.textContent = content;
    return td;
  }

  function renderJobs() {
    const rows = jobs
      .slice()
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id; })
      .filter(function (job) { return filter === "all" || jobState(job) === filter; });

    const body = document.getElementById("job-rows");
    body.replaceChildren.apply(body, rows.map(function (job) {
      const property = byId(PROPERTIES, job.property) || { address: "Unknown", town: "" };
      const service = byId(SERVICES, job.service) || { name: job.service };
      const tech = byId(TECHS, job.tech) || { name: "—" };
      const state = jobState(job);
      const price = jobPrice(job);
      const labour = jobLabour(job);

      const tr = el("tr");

      const prop = el("span");
      prop.append(el("span", "addr", property.address), el("span", "town", property.town + (job.note ? " · " + job.note : "")));

      const profitCell = cell("Profit", "num" + (price - labour < 0 ? " neg" : ""), money(price - labour));
      const status = el("span", "status " + state, job.running ? "In progress" : STATE_LABEL[state]);

      const action = cell("", "cell-action");
      if (job.status !== "done") {
        const btn = el("button", "row-btn", "Mark done");
        btn.type = "button";
        btn.addEventListener("click", function () { markDone(job.id); });
        action.append(btn);
      }

      tr.append(
        cell("Date", "cell-date", shortDate(job.date)),
        cell("Property", "cell-prop", prop),
        cell("Service", "", service.name),
        cell("Tech", "", tech.name),
        cell("Price", "num", money(price)),
        cell("Labour", "num", (job.status === "done" ? "" : "~") + money(labour)),
        profitCell,
        cell("Status", "", status),
        action
      );
      return tr;
    }));

    document.getElementById("jobs-empty").hidden = rows.length > 0;
  }

  function markDone(id) {
    const job = jobs.find(function (j) { return j.id === id; });
    if (!job) return;
    job.status = "done";
    delete job.note;
    delete job.running;
    saveJobs();
    renderOwner();
  }

  function renderOwner() {
    document.getElementById("owner-sub").textContent =
      DEMO.business + " · " + DEMO.monthLabel + " · demo day " + shortDate(DEMO.today);
    renderKpis();
    renderServiceBars();
    renderTechSplit();
    renderJobs();
  }

  // Filter chips on the jobs table
  document.querySelectorAll("#owner .chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      filter = chip.getAttribute("data-filter");
      document.querySelectorAll("#owner .chip").forEach(function (c) {
        c.setAttribute("aria-pressed", c === chip ? "true" : "false");
      });
      renderJobs();
    });
  });

  // Reset button
  document.getElementById("reset-demo").addEventListener("click", function () {
    jobs = freshJobs();
    storage.remove(JOBS_KEY);
    renderOwner();
    showFormMessage("Demo data reset.");
  });

  // "Book a job" form. Nothing is sent anywhere: the job is added to
  // the list and saved in this browser only.
  const form = document.getElementById("job-form");
  const fProperty = document.getElementById("f-property");
  const fService = document.getElementById("f-service");
  const fDate = document.getElementById("f-date");
  const fTech = document.getElementById("f-tech");
  const fPrice = document.getElementById("f-price");
  const formMsg = document.getElementById("form-msg");
  let msgTimer = null;

  function fillSelect(select, items, labelFn) {
    select.replaceChildren.apply(select, items.map(function (item) {
      const option = el("option", "", labelFn(item));
      option.value = item.id;
      return option;
    }));
  }

  fillSelect(fProperty, PROPERTIES, function (p) { return p.address + ", " + p.town; });
  fillSelect(fService, SERVICES, function (s) { return s.name; });
  fillSelect(fTech, TECHS, function (t) { return t.name + " (" + t.payLabel + ")"; });
  fDate.value = DEMO.today;

  function suggestPrice() {
    const property = byId(PROPERTIES, fProperty.value);
    if (property) fPrice.value = property.prices[fService.value];
  }
  fProperty.addEventListener("change", suggestPrice);
  fService.addEventListener("change", suggestPrice);
  suggestPrice();

  function showFormMessage(text) {
    formMsg.textContent = text;
    formMsg.hidden = false;
    clearTimeout(msgTimer);
    msgTimer = setTimeout(function () { formMsg.hidden = true; }, 4000);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const price = Number(fPrice.value);
    if (!fDate.value || !(price >= 0)) return;

    const nextId = jobs.reduce(function (max, job) { return Math.max(max, job.id); }, 0) + 1;
    const job = {
      id: nextId,
      date: fDate.value,
      property: fProperty.value,
      service: fService.value,
      tech: fTech.value,
      status: "scheduled"
    };
    const listPrice = byId(PROPERTIES, job.property).prices[job.service];
    if (price !== listPrice) job.price = price;

    jobs.push(job);
    saveJobs();
    filter = "all";
    document.querySelectorAll("#owner .chip").forEach(function (c) {
      c.setAttribute("aria-pressed", c.getAttribute("data-filter") === "all" ? "true" : "false");
    });
    renderOwner();

    const property = byId(PROPERTIES, job.property);
    showFormMessage("Booked: " + byId(SERVICES, job.service).name + " at " + property.address +
      " on " + shortDate(job.date) + " for " + money(price) + ".");
  });

  // ----------------------------------------------------------
  // 8. Route planner.
  // ----------------------------------------------------------
  const SVG_NS = "http://www.w3.org/2000/svg"; // a label for SVG drawing, not a web address that gets loaded
  let routeTech = "jordan";
  let routeMode = "booked";

  function svg(tag, attrs, text) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // The background: land, river, a few main roads and town names.
  function drawBaseMap(map) {
    map.append(
      svg("rect", { x: 0, y: 0, width: 100, height: 100, class: "map-land" }),
      svg("path", { d: "M0,46 C30,43 62,50 100,44", class: "map-road major" }),
      svg("path", { d: "M0,24 C35,22 65,20 100,24", class: "map-road" }),
      svg("path", { d: "M49,0 C50,30 48,70 51,100", class: "map-road major" }),
      svg("path", { d: "M22,0 C24,40 16,70 26,100", class: "map-road" }),
      svg("path", { d: "M80,0 C78,30 84,60 92,100", class: "map-road" }),
      svg("path", { d: "M0,88 C30,84 60,90 100,86", class: "map-road" }),
      svg("path", { d: "M0,60 C20,56 38,66 55,62 S80,64 100,72", class: "map-water" }),
      svg("text", { x: 3, y: 30, class: "map-label" }, "MONCTON"),
      svg("text", { x: 92, y: 40, class: "map-label", "text-anchor": "middle" }, "DIEPPE"),
      svg("text", { x: 70, y: 95, class: "map-label", "text-anchor": "middle" }, "RIVERVIEW"),
      svg("text", { x: 76, y: 75, class: "map-river-label", "text-anchor": "middle" }, "river")
    );
  }

  function renderRoute(animate) {
    const tech = byId(TECHS, routeTech);
    const booked = todaysJobs(routeTech);
    const optimized = bestOrder(booked);
    const order = routeMode === "optimized" ? optimized : booked;
    const plan = planDay(order);
    const bookedKm = routeKm(booked);
    const bestKm = routeKm(optimized);

    document.getElementById("route-sub").textContent =
      DEMO.business + " · " + dayName(DEMO.today) + ", " + shortDate(DEMO.today) + " · " +
      tech.name + "'s crew · " + booked.length + " stops";

    setChips(document.getElementById("route-crews"), TECHS, routeTech, function (id) {
      routeTech = id;
      routeMode = "booked";
      renderRoute(true);
    });

    document.querySelectorAll("#route .segmented button").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-mode") === routeMode ? "true" : "false");
    });
    document.getElementById("optimize-btn").hidden = routeMode === "optimized";

    // --- The map ---
    const map = document.getElementById("route-map");
    map.replaceChildren();
    drawBaseMap(map);

    // Other crews' stops today, faded, for context
    TECHS.forEach(function (other) {
      if (other.id === routeTech) return;
      todaysJobs(other.id).forEach(function (job) {
        const p = spot(job);
        map.append(svg("circle", { cx: p.x, cy: p.y, r: 1.6, class: "map-other" }));
      });
    });

    const points = [BASE].concat(order.map(spot)).concat([BASE]);
    const d = points.map(function (p, i) { return (i ? "L" : "M") + p.x + "," + p.y; }).join(" ");
    map.append(svg("path", { d: d, class: "map-route-shadow" }));
    const line = svg("path", { d: d, class: "map-route " + routeMode, pathLength: 1 });
    map.append(line);

    // The shop
    map.append(
      svg("rect", { x: BASE.x - 3, y: BASE.y - 3, width: 6, height: 6, rx: 1.2, class: "map-base" }),
      svg("text", { x: BASE.x, y: BASE.y + 7.5, class: "map-base-label", "text-anchor": "middle" }, "Shop")
    );

    // Numbered pins in the current order
    order.forEach(function (job, i) {
      const p = spot(job);
      const property = byId(PROPERTIES, job.property);
      const group = svg("g", { class: "map-pin" + (job.status === "done" ? " done" : "") });
      group.append(
        svg("title", {}, (i + 1) + ". " + property.address + ", " + property.town),
        svg("circle", { cx: p.x, cy: p.y, r: 3.4 }),
        svg("text", { x: p.x, y: p.y + 1.25, "text-anchor": "middle" }, String(i + 1))
      );
      map.append(group);
    });

    if (animate) {
      line.style.transition = "none";
      line.style.strokeDashoffset = "1";
      line.getBoundingClientRect(); // make the browser notice the start position
      line.style.transition = "stroke-dashoffset 1.4s ease";
      line.style.strokeDashoffset = "0";
    }

    // --- Side panel ---
    document.getElementById("route-mode-title").textContent =
      routeMode === "optimized" ? "Optimized by JobRoute" : "Booking order";
    document.getElementById("route-mode-desc").textContent = routeMode === "optimized"
      ? "JobRoute tested every possible order of today's stops and picked the shortest loop from the shop and back."
      : "Stops in the order customers booked them. This is how a day ends up when it's planned in your head or a spreadsheet.";

    const stats = document.getElementById("route-stats");
    stats.replaceChildren.apply(stats, [
      ["Driving", plan.km.toFixed(1) + " km"],
      ["Time in the truck", duration(driveMinutes(plan.km))],
      ["Truck cost", money(plan.km * ROUTING.costPerKm)],
      ["Back at the shop", niceTime(plan.finish)]
    ].map(function (pair) {
      const box = el("div", "route-stat");
      box.append(el("span", "muted small", pair[0]), el("strong", "", pair[1]));
      return box;
    }));

    const savedKm = bookedKm - bestKm;
    const savings = document.getElementById("route-savings");
    savings.classList.toggle("is-active", routeMode === "optimized");
    savings.replaceChildren();
    if (savedKm < 0.05) {
      savings.append(el("h2", "", "Already the shortest route"),
        el("p", "muted small", "The booking order happens to be the best order today."));
    } else if (routeMode === "optimized") {
      const seasonKm = savedKm * ROUTING.seasonDays;
      savings.append(
        el("p", "eyebrow", "Saved today"),
        el("p", "savings-big", savedKm.toFixed(1) + " km · " + duration(driveMinutes(savedKm))),
        el("p", "", "That's " + money(savedKm * ROUTING.costPerKm) + " less in truck costs, and " +
          (driveMinutes(savedKm) >= 45 ? "enough time to fit in one more job" : "the crew finishes earlier") + "."),
        el("p", "muted small", "If every day looked like this, " + tech.name + "'s crew would drive about " +
          Math.round(seasonKm).toLocaleString("en-CA") + " fewer km over a " + ROUTING.seasonDays +
          "-day season, worth roughly " + money(seasonKm * ROUTING.costPerKm) + ".")
      );
    } else {
      savings.append(
        el("p", "eyebrow", "Possible savings"),
        el("p", "savings-big muted-big", savedKm.toFixed(1) + " km wasted"),
        el("p", "muted small", "Tap ⚡ Optimize route to see the shortest order.")
      );
    }

    const list = document.getElementById("route-stops");
    list.replaceChildren.apply(list, plan.stops.map(function (stop) {
      const property = byId(PROPERTIES, stop.job.property);
      const service = byId(SERVICES, stop.job.service);
      const li = el("li");
      const text = el("span");
      text.append(el("strong", "", property.address), el("span", "muted small", " · " + property.town + " · " + service.name));
      li.append(text, el("span", "stop-time", niceTime(stop.arrive)));
      return li;
    }));
  }

  document.querySelectorAll("#route .segmented button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      routeMode = btn.getAttribute("data-mode");
      renderRoute(true);
    });
  });
  document.getElementById("optimize-btn").addEventListener("click", function () {
    routeMode = "optimized";
    renderRoute(true);
  });

  // ----------------------------------------------------------
  // 9. Technician view: today's stops in the best order,
  //    a start/stop timer for each job, and pay earned.
  // ----------------------------------------------------------
  let techId = storage.get(TECH_KEY, "jordan");
  if (!byId(TECHS, techId)) techId = TECHS[0].id;

  function payText(job, tech) {
    if (tech.pay.type === "commission") {
      return (job.status === "done" ? "You earned " : "You earn ") + money(jobLabour(job)) +
        " (" + Math.round(tech.pay.rate * 100) + "% of " + money(jobPrice(job)) + ")";
    }
    if (job.status === "done") {
      return "You earned " + money(jobLabour(job)) + " (" + jobHours(job).toFixed(1) + " h × $" + tech.pay.rate + ")";
    }
    return "About " + money(jobLabour(job)) + " (~" + jobHours(job).toFixed(1) + " h × $" + tech.pay.rate + ")";
  }

  function renderTech() {
    const tech = byId(TECHS, techId);
    const order = bestOrder(todaysJobs(techId));
    const plan = planDay(order);
    const done = order.filter(function (job) { return job.status === "done"; });
    const earned = done.reduce(function (sum, job) { return sum + jobLabour(job); }, 0);
    const toEarn = order
      .filter(function (job) { return job.status !== "done"; })
      .reduce(function (sum, job) { return sum + jobLabour(job); }, 0);
    const running = order.find(function (job) { return job.running; });

    document.getElementById("tech-title").textContent = tech.name + "'s day";
    document.getElementById("tech-sub").textContent =
      dayName(DEMO.today) + ", " + shortDate(DEMO.today) + " · " + order.length + " stops · " +
      "leave the shop at " + niceTime(toMin(ROUTING.dayStart)) + " · " + tech.payLabel;

    setChips(document.getElementById("tech-picker"), TECHS, techId, function (id) {
      techId = id;
      storage.set(TECH_KEY, id);
      renderTech();
    });

    const kpis = document.getElementById("tech-kpis");
    kpis.replaceChildren(
      kpiCard("Jobs done", done.length + " / " + order.length, running ? "1 in progress" : (done.length === order.length && order.length ? "All done. Nice work!" : "Tap Start at each stop")),
      kpiCard("Earned today", money(earned), "From finished jobs"),
      kpiCard("Still to earn", "~" + money(toEarn), (order.length - done.length) + " jobs left"),
      kpiCard("Route", plan.km.toFixed(1) + " km", "Shortest order · back ~" + niceTime(plan.finish))
    );

    const list = document.getElementById("tech-stops");
    list.replaceChildren.apply(list, plan.stops.map(function (stop, i) {
      const job = stop.job;
      const property = byId(PROPERTIES, job.property);
      const service = byId(SERVICES, job.service);
      const state = job.status === "done" ? "done" : job.running ? "running" : "todo";

      const li = el("li", "card tech-stop " + state);

      const badge = el("span", "stop-badge", state === "done" ? "✓" : String(i + 1));

      const body = el("div", "stop-body");
      const head = el("div", "stop-head");
      head.append(el("strong", "", property.address), el("span", "muted small", property.town + " · " + property.type));
      const meta = el("p", "stop-meta");
      meta.textContent = service.name + " · " +
        (state === "done"
          ? niceTime(toMin(job.start)) + "–" + niceTime(toMin(job.end)) + " (" + duration(stop.length) + ")"
          : "arrive ~" + niceTime(stop.arrive) + " · about " + duration(plannedMinutes(job)) +
            " · " + stop.km.toFixed(1) + " km drive");
      body.append(head, meta, el("p", "stop-pay", payText(job, tech)));

      const side = el("div", "stop-side");
      if (state === "done") {
        side.append(el("span", "status done", "Done"));
      } else if (state === "running") {
        const timer = el("span", "timer", "0:00");
        timer.setAttribute("data-timer", String(job.id));
        const started = el("span", "muted small", "Started " + niceTime(toMin(job.running.start)));
        const btn = el("button", "button small finish", "Finish job");
        btn.type = "button";
        btn.addEventListener("click", function () { finishJob(job.id); });
        side.append(timer, started, btn);
      } else {
        const btn = el("button", "button small", "Start job");
        btn.type = "button";
        if (running) {
          btn.disabled = true;
          btn.title = "Finish the job in progress first";
        }
        btn.addEventListener("click", function () { startJob(job.id, stop.arrive); });
        side.append(btn);
      }

      li.append(badge, body, side);
      return li;
    }));

    tickTimers();
  }

  function startJob(id, plannedArrive) {
    const job = jobs.find(function (j) { return j.id === id; });
    if (!job || job.status === "done") return;
    job.running = { realStart: Date.now(), start: toClock(plannedArrive) };
    saveJobs();
    renderTech();
  }

  function finishJob(id) {
    const job = jobs.find(function (j) { return j.id === id; });
    if (!job || !job.running) return;
    const minutes = Math.max(1, Math.round(runningMinutes(job)));
    job.start = job.running.start;
    job.end = toClock(toMin(job.start) + minutes);
    job.status = "done";
    delete job.running;
    delete job.note;
    saveJobs();
    renderTech();
  }

  // Update any running timer once a second (demo clock: 1 s = 1 min)
  function tickTimers() {
    document.querySelectorAll("[data-timer]").forEach(function (node) {
      const job = jobs.find(function (j) { return String(j.id) === node.getAttribute("data-timer"); });
      if (!job || !job.running) return;
      const m = Math.floor(runningMinutes(job));
      node.textContent = Math.floor(m / 60) + ":" + (m % 60 < 10 ? "0" : "") + (m % 60);
    });
  }
  setInterval(tickTimers, 1000);

  // The reset button also clears timers and resets every view
  document.getElementById("reset-demo").addEventListener("click", function () {
    routeMode = "booked";
  });

  // ----------------------------------------------------------
  // 10. Start up.
  // ----------------------------------------------------------
  showView();
})();
