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

  // People who turn on "reduce motion" on their device get the
  // same information without the moving parts.
  function reduceMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

    if (current !== "route") stopDrive();
    if (current !== "network") stopNetLoop();

    if (current === "owner") renderOwner();
    if (current === "route") renderRoute(true);
    if (current === "tech") renderTech();
    if (current === "network") renderNetwork();
    if (current === "pricing") renderPricing();

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
      // Overflow jobs claimed from other crews carry their own address
      const property = byId(PROPERTIES, job.property) || { address: job.address || "Unknown", town: job.town || "" };
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
      svg("text", { x: 36, y: 95, class: "map-label", "text-anchor": "middle" }, "RIVERVIEW"),
      svg("text", { x: 76, y: 75, class: "map-river-label", "text-anchor": "middle" }, "river")
    );
  }

  function renderRoute(animate) {
    stopDrive();
    document.getElementById("map-clock").hidden = true;
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

    // After the line has drawn itself, send the truck around the loop
    lastDrive = { order: order, plan: plan };
    if (animate && order.length && !reduceMotion()) {
      driveDelay = setTimeout(function () { driveRoute(order, plan); }, 1500);
    }
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

  // --- The truck: drives the route on the map, stop by stop, with a
  //     clock showing the time of day. Driving and jobs are sped up
  //     (a job takes well under a second), so the whole day plays in
  //     about 8 seconds.
  let lastDrive = null;
  let driveDelay = null;
  let driveFrame = null;

  function stopDrive() {
    clearTimeout(driveDelay);
    cancelAnimationFrame(driveFrame);
    const old = document.querySelector("#route-map .truck");
    if (old) old.remove();
  }

  function makeTruck() {
    const truck = svg("g", { class: "truck" });
    const body = svg("g", { class: "truck-body" });
    body.append(
      svg("rect", { x: -3.4, y: -3.6, width: 4.4, height: 3, rx: 0.5, class: "truck-box" }),
      svg("path", { d: "M1.2,-2.9 h1.4 l1.2,1.3 v1.3 h-2.6 z", class: "truck-cab" }),
      svg("circle", { cx: -2, cy: -0.4, r: 0.75, class: "truck-wheel" }),
      svg("circle", { cx: 2.3, cy: -0.4, r: 0.75, class: "truck-wheel" })
    );
    truck.append(body);
    return truck;
  }

  function driveRoute(order, plan) {
    stopDrive();
    const map = document.getElementById("route-map");
    const pins = map.querySelectorAll(".map-pin");
    const items = document.getElementById("route-stops").children;
    const clock = document.getElementById("map-clock");
    const clockTime = document.getElementById("map-clock-time");
    const clockWhat = document.getElementById("map-clock-what");
    const truck = makeTruck();
    const body = truck.firstChild;
    map.append(truck);

    // Build the day as a list of phases: drive, job, drive, job ... drive home
    const points = [BASE].concat(order.map(spot)).concat([BASE]);
    const phases = [];
    let t = 0;
    let dayClock = toMin(ROUTING.dayStart);
    for (let i = 0; i < points.length - 1; i++) {
      const km = legKm(points[i], points[i + 1]);
      const atStop = i < order.length;
      const arrive = atStop ? plan.stops[i].arrive : plan.finish;
      const driveMs = 450 + km * 75;
      phases.push({ kind: "drive", from: points[i], to: points[i + 1], start: t, ms: driveMs,
        clockFrom: dayClock, clockTo: arrive, stop: i });
      t += driveMs;
      if (atStop) {
        const jobMs = 700;
        const leave = arrive + plan.stops[i].length;
        phases.push({ kind: "job", from: points[i + 1], to: points[i + 1], start: t, ms: jobMs,
          clockFrom: arrive, clockTo: leave, stop: i });
        t += jobMs;
        dayClock = leave;
      }
    }
    const total = t;

    function place(x, y, facingLeft) {
      truck.setAttribute("transform", "translate(" + x.toFixed(2) + "," + y.toFixed(2) + ")");
      body.setAttribute("transform", facingLeft ? "scale(-1,1)" : "");
    }

    clock.hidden = false;
    let begin = null;
    let reached = -1;
    let facingLeft = false;

    function frame(now) {
      if (begin === null) begin = now;
      const elapsed = now - begin;
      const phase = phases.find(function (p) { return elapsed < p.start + p.ms; }) || phases[phases.length - 1];
      const k = Math.min(1, Math.max(0, (elapsed - phase.start) / phase.ms));
      const eased = phase.kind === "drive" ? k * k * (3 - 2 * k) : k; // speed up, then slow down
      if (phase.to.x !== phase.from.x) facingLeft = phase.to.x < phase.from.x;
      place(phase.from.x + (phase.to.x - phase.from.x) * eased, phase.from.y + (phase.to.y - phase.from.y) * eased, facingLeft);
      clockTime.textContent = niceTime(phase.clockFrom + (phase.clockTo - phase.clockFrom) * k);

      const stopCount = order.length;
      if (phase.kind === "job") {
        clockWhat.textContent = "Stop " + (phase.stop + 1) + " of " + stopCount + " · " +
          byId(SERVICES, order[phase.stop].service).name;
        if (reached < phase.stop) {
          reached = phase.stop;
          if (pins[phase.stop]) pins[phase.stop].classList.add("visited");
          if (items[phase.stop]) items[phase.stop].classList.add("reached");
        }
      } else if (phase.stop < stopCount) {
        clockWhat.textContent = "Driving to stop " + (phase.stop + 1) + " of " + stopCount;
      } else {
        clockWhat.textContent = "Driving back to the shop";
      }

      if (elapsed < total) {
        driveFrame = requestAnimationFrame(frame);
      } else {
        clockTime.textContent = niceTime(plan.finish);
        clockWhat.textContent = "Back at the shop · " + plan.km.toFixed(1) + " km driven";
      }
    }
    driveFrame = requestAnimationFrame(frame);
  }

  document.getElementById("drive-btn").addEventListener("click", function () {
    if (!lastDrive || !lastDrive.order.length) return;
    // clear the ticks from the last drive, then go again
    document.querySelectorAll("#route-map .map-pin.visited").forEach(function (pin) { pin.classList.remove("visited"); });
    Array.prototype.forEach.call(document.getElementById("route-stops").children, function (li) { li.classList.remove("reached"); });
    driveRoute(lastDrive.order, lastDrive.plan);
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
  // 10. Overflow Network: the network-effect simulation.
  //     A simple model: each other operator nearby has a small chance
  //     of being able to take any given job. More operators = a much
  //     better chance that SOMEONE can, plus more jobs to pick up.
  // ----------------------------------------------------------
  const CLAIMED_KEY = "jobroute.claimed.v1";
  let operators = NETWORK.startOperators;
  let claimed = storage.get(CLAIMED_KEY, []);
  let postTimer = null;

  function networkNumbers(n) {
    const others = Math.max(0, n - 1);
    const claimChance = 1 - Math.pow(1 - NETWORK.chanceEachCanTake, others);
    const hoursToClaim = others > 0 ? NETWORK.hoursToClaimBase / others : Infinity;
    const canPickUp = others * NETWORK.postsPerMonth * NETWORK.matchRate;
    const turnedAway = NETWORK.postsPerMonth * NETWORK.seasonMonths;
    const covered = turnedAway * claimChance;
    const referral = covered * NETWORK.avgJobPrice * NETWORK.split.sender;
    return {
      others: others,
      claimChance: claimChance,
      hoursToClaim: hoursToClaim,
      canPickUp: canPickUp,
      turnedAway: turnedAway,
      covered: covered,
      referral: referral
    };
  }

  function waitText(hours) {
    if (!isFinite(hours)) return "Never";
    if (hours >= 24) return (hours / 24).toFixed(1).replace(".0", "") + " days";
    if (hours >= 1) return Math.round(hours) + " h";
    return Math.round(hours * 60) + " min";
  }

  function verdictText(n, nums) {
    if (n === 1) {
      return "With only you on the network, there's no one to pass a job to and nothing to pick up. That's the cold-start problem, and it's why JobRoute launches one area at a time.";
    }
    if (n <= 5) {
      return "A few operators help a little, but most posted jobs still go unclaimed (" + Math.round((1 - nums.claimChance) * 100) +
        "% don't get picked up). The network isn't worth much yet.";
    }
    if (n <= 15) {
      return "Now most posted jobs get claimed within hours, and there's steady extra work to pick up. Every new operator still makes a big difference.";
    }
    return "Almost every job gets covered, usually within an hour or two. Each new operator adds less now, but an operator who leaves loses all of this. That makes JobRoute hard to switch away from.";
  }

  function drawNetworkChart(n) {
    const chart = document.getElementById("net-chart");
    chart.replaceChildren();
    const x = function (ops) { return 24 + ((ops - 1) / (NETWORK.maxOperators - 1)) * 186; };
    const y = function (share) { return 92 - share * 80; };

    [0, 0.5, 1].forEach(function (share) {
      chart.append(
        svg("line", { x1: 24, x2: 210, y1: y(share), y2: y(share), class: "chart-grid" }),
        svg("text", { x: 20, y: y(share) + 1.5, class: "chart-axis", "text-anchor": "end" }, Math.round(share * 100) + "%")
      );
    });
    [1, 10, 20, 30, 40].forEach(function (ops) {
      chart.append(svg("text", { x: x(ops), y: 104, class: "chart-axis", "text-anchor": "middle" }, String(ops)));
    });

    let d = "";
    for (let ops = 1; ops <= NETWORK.maxOperators; ops++) {
      d += (ops === 1 ? "M" : "L") + x(ops).toFixed(1) + "," + y(networkNumbers(ops).claimChance).toFixed(1) + " ";
    }
    chart.append(svg("path", { d: d, class: "chart-line" }));

    const share = networkNumbers(n).claimChance;
    chart.append(
      svg("line", { x1: x(n), x2: x(n), y1: 92, y2: y(share), class: "chart-marker-line" }),
      svg("circle", { cx: x(n), cy: y(share), r: 3.2, class: "chart-marker" }),
      svg("text", {
        x: Math.min(Math.max(x(n), 40), 196), y: Math.max(y(share) - 6, 8),
        class: "chart-marker-label", "text-anchor": "middle"
      }, Math.round(share * 100) + "%")
    );
  }

  function renderFeed(n) {
    const others = n - 1;
    const visible = Math.min(OVERFLOW_FEED.length, Math.round(others * 0.35));
    document.getElementById("feed-sub").textContent = others === 0
      ? "No other operators nearby yet, so there's nothing to pick up."
      : visible + " open job" + (visible === 1 ? "" : "s") + " from " + others + " other crew" +
        (others === 1 ? "" : "s") + " nearby, matching your services and area.";

    const feed = document.getElementById("feed");
    if (visible === 0) {
      const empty = el("li", "feed-empty", "Move the slider up to add operators to the area.");
      feed.replaceChildren(empty);
      return;
    }

    feed.replaceChildren.apply(feed, OVERFLOW_FEED.slice(0, visible).map(function (post) {
      const service = byId(SERVICES, post.service);
      const keep = post.price * (1 - NETWORK.split.sender - NETWORK.split.jobroute);
      const li = el("li", "feed-item");

      const top = el("div", "feed-top");
      top.append(
        el("strong", "", service.name + " · " + post.town),
        el("span", "feed-price", money(post.price))
      );
      const meta = el("p", "feed-meta",
        post.address + " · " + dayName(post.date) + " " + shortDate(post.date) + " · " + post.km.toFixed(1) + " km from your shop");
      const from = el("p", "feed-from", "Posted by " + post.from + ": " + post.reason.toLowerCase());

      const bottom = el("div", "feed-bottom");
      bottom.append(el("span", "stop-pay", "You'd keep " + money(keep) + " (85%)"));
      if (claimed.indexOf(post.id) !== -1) {
        bottom.append(el("span", "status done", "Claimed ✓ on Jordan's schedule"));
      } else {
        const btn = el("button", "button small", "Claim job");
        btn.type = "button";
        btn.addEventListener("click", function () { claimPost(post); });
        bottom.append(btn);
      }

      li.append(top, meta, from, bottom);
      return li;
    }));
  }

  // Claiming adds the job to Harbourview's own schedule (and the owner
  // dashboard), at the 85% the claiming crew keeps.
  function claimPost(post) {
    if (claimed.indexOf(post.id) !== -1) return;
    const nextId = jobs.reduce(function (max, job) { return Math.max(max, job.id); }, 0) + 1;
    jobs.push({
      id: nextId,
      date: post.date,
      address: post.address,
      town: post.town,
      service: post.service,
      tech: "jordan",
      status: "scheduled",
      price: Math.round(post.price * (1 - NETWORK.split.sender - NETWORK.split.jobroute)),
      note: "Overflow from " + post.from
    });
    claimed.push(post.id);
    passJob(crewIndex(post.from), 0);
    saveJobs();
    storage.set(CLAIMED_KEY, claimed);
    renderFeed(operators);
  }

  function fillPostSelect() {
    const select = document.getElementById("post-job");
    const upcoming = jobs
      .filter(function (job) { return job.status !== "done" && job.date > DEMO.today && byId(PROPERTIES, job.property); })
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    const previous = select.value;
    select.replaceChildren.apply(select, upcoming.map(function (job) {
      const property = byId(PROPERTIES, job.property);
      const option = el("option", "", shortDate(job.date) + " · " + byId(SERVICES, job.service).name + " · " +
        property.address + " (" + money(jobPrice(job)) + ")");
      option.value = String(job.id);
      return option;
    }));
    if (previous) select.value = previous;
  }

  // Crews that could claim YOUR job: exterior cleaning companies only
  // (the lawn crew in the feed has no ladders, so it can't).
  const FICTIONAL_CREWS = ["Saltmarsh Exterior", "Crestline Wash Co.", "Fundy Clear Windows", "Tideline Property Care"];

  document.getElementById("post-form").addEventListener("submit", function (event) {
    event.preventDefault();
    const job = jobs.find(function (j) { return String(j.id) === document.getElementById("post-job").value; });
    if (!job) return;
    const result = document.getElementById("post-result");
    const nums = networkNumbers(operators);
    const fee = jobPrice(job) * NETWORK.split.sender;

    result.className = "post-result waiting";
    result.textContent = "Posted to " + nums.others + " nearby operator" + (nums.others === 1 ? "" : "s") + "… waiting for a claim.";
    clearTimeout(postTimer);

    postTimer = setTimeout(function () {
      if (nums.others === 0) {
        result.className = "post-result bad";
        result.textContent = "✕ There's no one else on the network yet, so nobody can take it. The customer finds someone else. Move the slider up and try again.";
        loseJob(0);
        return;
      }
      if (Math.random() < nums.claimChance) {
        const crew = FICTIONAL_CREWS[Math.floor(Math.random() * Math.min(FICTIONAL_CREWS.length, nums.others))];
        const hours = nums.hoursToClaim * (0.5 + Math.random());
        passJob(0, crewIndex(crew));
        result.className = "post-result good";
        result.textContent = "✓ Claimed by " + crew + " in about " + waitText(hours) +
          ". Your customer still gets served, and you earn " + money(fee) + " (10%) without lifting a ladder.";
      } else {
        result.className = "post-result bad";
        result.textContent = "✕ Nobody claimed it in 48 hours. With only " + nums.others + " other operator" +
          (nums.others === 1 ? "" : "s") + " nearby, the customer goes elsewhere. Try again with more operators.";
        loseJob(0);
      }
    }, 1200);
  });

  // --- Live network map -------------------------------------
  // Operator 0 is you (Harbourview's shop). The others are spread
  // around town in a fixed "random" pattern, so the map looks the
  // same every visit. Moving the slider switches crews on or off.
  // The first five have names so jobs on the page match the map.
  const NAMED_CREWS = FICTIONAL_CREWS.concat(["Northgate Lawn Crew"]);

  function riverY(x) {
    // rough height of the river at a point across the map
    const pts = [[0, 60], [25, 60], [55, 62], [80, 65], [100, 72]];
    for (let i = 1; i < pts.length; i++) {
      if (x <= pts[i][0]) {
        const a = pts[i - 1], b = pts[i];
        return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
      }
    }
    return 72;
  }

  // keep crews off the town names on the map: [left, top, right, bottom]
  const NAME_BOXES = [[0, 24, 30, 34], [80, 34, 100, 44], [22, 88, 50, 100], [66, 70, 86, 79]];

  const OPERATOR_SPOTS = (function () {
    let seed = 11;
    function rand() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    const spots = [{ x: BASE.x, y: BASE.y }];
    for (let tries = 0; spots.length < NETWORK.maxOperators && tries < 6000; tries++) {
      const p = { x: 6 + rand() * 88, y: 6 + rand() * 84 };
      if (Math.abs(p.y - riverY(p.x)) < 6) continue;
      if (NAME_BOXES.some(function (r) { return p.x > r[0] && p.x < r[2] && p.y > r[1] && p.y < r[3]; })) continue;
      if (spots.some(function (q) { return Math.hypot(p.x - q.x, p.y - q.y) < 8.5; })) continue;
      spots.push(p);
    }
    return spots;
  })();

  let netNodes = [];
  let netLinks = null;
  let netFlows = null;
  let netNeighbours = [];
  let netLoop = null;
  let netCount = { covered: 0, lost: 0 };

  function crewName(i) {
    if (i === 0) return "You: " + DEMO.business;
    return NAMED_CREWS[i - 1] || "JobRoute crew #" + (i + 1);
  }

  function buildNetMap() {
    const map = document.getElementById("net-map");
    map.replaceChildren();
    drawBaseMap(map);
    netLinks = svg("g", {});
    const nodes = svg("g", {});
    netFlows = svg("g", {});
    netNodes = OPERATOR_SPOTS.map(function (p, i) {
      const node = svg("g", { class: "net-op" + (i === 0 ? " you" : "") });
      node.append(
        svg("title", {}, crewName(i)),
        svg("circle", { cx: p.x, cy: p.y, r: i === 0 ? 3 : 2 })
      );
      if (i === 0) node.append(svg("text", { x: p.x, y: p.y - 4.4, "text-anchor": "middle", class: "net-you-label" }, "You"));
      nodes.append(node);
      return node;
    });
    map.append(netLinks, nodes, netFlows);
  }

  // Each crew is joined to its 2 closest crews on the network:
  // close enough to cover each other's jobs.
  function updateNetMap(n) {
    if (!netNodes.length) buildNetMap();
    netNodes.forEach(function (node, i) { node.classList.toggle("on", i < n); });
    netNeighbours = [];
    const lines = [];
    const seen = {};
    for (let i = 0; i < n; i++) {
      const near = [];
      for (let j = 0; j < n; j++) if (j !== i) near.push(j);
      near.sort(function (a, b) { return dist(i, a) - dist(i, b); });
      netNeighbours[i] = near.slice(0, 3);
      near.slice(0, 2).forEach(function (j) {
        const key = Math.min(i, j) + "-" + Math.max(i, j);
        if (seen[key]) return;
        seen[key] = true;
        const a = OPERATOR_SPOTS[i], b = OPERATOR_SPOTS[j];
        lines.push(svg("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: "net-link" }));
      });
    }
    netLinks.replaceChildren.apply(netLinks, lines);
    netCount = { covered: 0, lost: 0 };
    updateNetNote(n);
  }

  function dist(i, j) {
    const a = OPERATOR_SPOTS[i], b = OPERATOR_SPOTS[j];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function updateNetNote(n) {
    const note = document.getElementById("net-map-note");
    if (n === 1) {
      note.textContent = "Only you on the map: no one to pass a job to, and no one passing jobs to you.";
      return;
    }
    const watched = netCount.covered + netCount.lost;
    note.textContent = n + " crews connected. " + (watched
      ? "While you watched: " + netCount.covered + " job" + (netCount.covered === 1 ? "" : "s") + " covered, " +
        netCount.lost + " customer" + (netCount.lost === 1 ? "" : "s") + " lost."
      : "Watch the amber dots: each one is a job a crew couldn't take.");
  }

  // A small ring that flashes at a crew's spot
  function pingAt(i, kind) {
    const p = OPERATOR_SPOTS[i];
    const ring = svg("circle", { cx: p.x, cy: p.y, r: 2, class: "net-ping " + kind });
    netFlows.append(ring);
    setTimeout(function () { ring.remove(); }, 900);
  }

  // Animate one job travelling from crew i to crew j
  function passJob(i, j) {
    if (!netFlows) return;
    const a = OPERATOR_SPOTS[i], b = OPERATOR_SPOTS[j];
    const dot = svg("circle", { cx: a.x, cy: a.y, r: 1.4, class: "net-job" });
    netFlows.append(dot);
    const ms = 700 + dist(i, j) * 14;
    let begin = null;
    function step(now) {
      if (begin === null) begin = now;
      const k = Math.min(1, (now - begin) / ms);
      const e = k * k * (3 - 2 * k);
      dot.setAttribute("cx", (a.x + (b.x - a.x) * e).toFixed(2));
      dot.setAttribute("cy", (a.y + (b.y - a.y) * e).toFixed(2));
      if (k < 1) {
        requestAnimationFrame(step);
      } else {
        dot.remove();
        pingAt(j, "good");
      }
    }
    requestAnimationFrame(step);
  }

  // A job that nobody could take: it fades out where it was posted
  function loseJob(i) {
    if (!netFlows) return;
    pingAt(i, "bad");
  }

  // Background activity: crews post jobs now and then. Whether one gets
  // covered uses the same claim chance as the numbers above.
  function randomPost() {
    const n = operators;
    if (n < 2 || !netNodes.length) return;
    const from = Math.floor(Math.random() * n);
    if (Math.random() < networkNumbers(n).claimChance) {
      const options = netNeighbours[from] || [];
      const to = options[Math.floor(Math.random() * options.length)];
      if (to === undefined) return;
      passJob(from, to);
      netCount.covered++;
    } else {
      loseJob(from);
      netCount.lost++;
    }
    updateNetNote(n);
  }

  function stopNetLoop() {
    clearInterval(netLoop);
    netLoop = null;
  }

  function startNetLoop() {
    stopNetLoop();
    if (operators < 2 || reduceMotion()) return;
    // more crews = more jobs flying around
    netLoop = setInterval(randomPost, Math.max(320, 2200 - operators * 50));
  }

  // The map spot of a named crew (or a random crew nearby if that
  // crew hasn't joined at the current slider setting)
  function crewIndex(name) {
    const i = NAMED_CREWS.indexOf(name) + 1;
    if (i > 0 && i < operators) return i;
    return operators > 1 ? 1 + Math.floor(Math.random() * (operators - 1)) : 0;
  }

  function renderNetwork() {
    const n = operators;
    const nums = networkNumbers(n);
    document.getElementById("net-slider").value = String(n);
    document.getElementById("net-count").textContent = String(n);

    const kpis = document.getElementById("net-kpis");
    kpis.replaceChildren(
      kpiCard("Your overflow gets claimed", Math.round(nums.claimChance * 100) + "%", "Chance someone can take a posted job", n === 1),
      kpiCard("Typical wait for a claim", waitText(nums.hoursToClaim), nums.others + " other operator" + (nums.others === 1 ? "" : "s") + " nearby"),
      kpiCard("Jobs you could pick up", nums.canPickUp.toFixed(1) + " / month", "Other crews' overflow that suits you"),
      kpiCard("Customers kept per season", Math.round(nums.covered) + " of " + nums.turnedAway,
        money(nums.referral) + " in referral fees")
    );

    document.getElementById("net-verdict").textContent = verdictText(n, nums);
    updateNetMap(n);
    if (currentView() === "network") startNetLoop();
    drawNetworkChart(n);
    renderFeed(n);
    fillPostSelect();
  }

  document.getElementById("net-slider").addEventListener("input", function (event) {
    operators = Number(event.target.value);
    renderNetwork();
  });

  // ----------------------------------------------------------
  // 11. Pricing calculator.
  // ----------------------------------------------------------
  function renderPricing() {
    const slider = document.getElementById("price-slider");
    const techs = Number(slider.value);
    const crews = Math.max(1, Math.ceil((techs + 1) / 2)); // people usually work in pairs
    const cost = PRICING.base + PRICING.perTech * techs;
    const adminSaving = PRICING.adminHoursSaved * PRICING.ownerHourValue * 4.33;
    const routeSaving = PRICING.routeKmSavedPerCrewDay * PRICING.workDaysPerMonth * ROUTING.costPerKm * crews;
    const net = adminSaving + routeSaving - cost;

    document.getElementById("price-techs").textContent = String(techs);

    const lines = [
      ["JobRoute plan (owner included)", money(PRICING.base)],
      [techs + " technician" + (techs === 1 ? "" : "s") + " × " + money(PRICING.perTech), money(PRICING.perTech * techs)],
      ["Total per month", money(cost), "total"],
      ["Owner time saved (~" + PRICING.adminHoursSaved + " h/week of spreadsheets)", "+" + money(adminSaving), "save"],
      ["Less driving (" + crews + " crew" + (crews === 1 ? "" : "s") + ", ~" + PRICING.routeKmSavedPerCrewDay + " km/day each)", "+" + money(routeSaving), "save"],
      ["Estimated benefit after paying for JobRoute", money(net) + " / month", "net"]
    ];
    const box = document.getElementById("price-lines");
    box.replaceChildren.apply(box, lines.map(function (line) {
      const row = el("div", "price-line" + (line[2] ? " " + line[2] : ""));
      row.append(el("span", "", line[0]), el("strong", "", line[1]));
      return row;
    }));

    document.getElementById("price-note").textContent =
      "Savings are rough estimates: owner time valued at " + money(PRICING.ownerHourValue) + "/hour, driving at " +
      money(ROUTING.costPerKm * 100) + " per 100 km. A crew of " + (techs + 1) + " pays " +
      money(cost * 12) + " a year.";
  }

  document.getElementById("price-slider").addEventListener("input", renderPricing);

  // Reset also clears claimed overflow jobs
  document.getElementById("reset-demo").addEventListener("click", function () {
    claimed = [];
    storage.remove(CLAIMED_KEY);
  });

  // ----------------------------------------------------------
  // 12. Guided tour: a 9-step walk through the demo. Each step opens
  //     a view, sets it up, and outlines the part being explained.
  // ----------------------------------------------------------
  function tourRouteSaving() {
    const booked = todaysJobs("jordan");
    const saved = routeKm(booked) - routeKm(bestOrder(booked));
    return saved.toFixed(0) + " km and " + Math.round(driveMinutes(saved)) + " minutes";
  }

  const TOUR = [
    {
      view: "home", target: "#home .hero",
      title: "JobRoute in 60 seconds",
      text: function () {
        return "One app for a small exterior-cleaning crew: the owner's jobs and revenue, the best route for each day, " +
          "a timer and pay for every technician, and a network for passing on jobs. Everything uses a made-up crew and fake data.";
      }
    },
    {
      view: "owner", target: "#kpis",
      title: "The owner's numbers, no spreadsheet",
      text: function () {
        return "Sam, the owner, sees what the month earned, what labour cost and the profit left over. " +
          "Jordan is paid 35% commission and Riley $22 an hour, and JobRoute works out both.";
      }
    },
    {
      view: "owner", target: "#owner .table-wrap",
      title: "Every job in one list",
      text: function () {
        return "Filter by done, scheduled or overdue. Press “Mark done” on a job and the numbers above update straight away.";
      }
    },
    {
      view: "route", target: "#route .map-frame", self: true,
      enter: function () { routeTech = "jordan"; routeMode = "booked"; },
      title: "The day as it's planned now",
      text: function () {
        return "Jordan's crew, driving today's stops in the order customers booked them. Watch the truck zig-zag back and forth across the river.";
      }
    },
    {
      view: "route", target: "#route .map-frame", self: true,
      enter: function () { routeTech = "jordan"; routeMode = "optimized"; },
      title: "⚡ The shortest route",
      text: function () {
        return "JobRoute tests every possible order of the stops and picks the shortest loop. For Jordan's crew that saves " +
          tourRouteSaving() + " today, and the crew is home earlier.";
      }
    },
    {
      view: "tech", target: "#tech-stops",
      title: "The technician's day",
      text: function () {
        return "Each technician sees their stops in route order with arrival times. “Start job” runs a timer, " +
          "“Finish job” logs the time and pay, and the owner's dashboard updates by itself.";
      }
    },
    {
      view: "network", target: ".net-map-wrap", self: true,
      enter: function () { operators = NETWORK.startOperators; },
      after: function () { growNetwork(20); },
      title: "The network effect: Overflow Network",
      text: function () {
        return "Crews pass on jobs they can't take. Watch the map fill up: with " + NETWORK.startOperators + " crews, " +
          Math.round(networkNumbers(NETWORK.startOperators).claimChance * 100) + "% of passed jobs get covered. With 20 crews it's " +
          Math.round(networkNumbers(20).claimChance * 100) + "%. Every crew that joins makes it worth more to all the others.";
      }
    },
    {
      view: "network", target: "#feed",
      title: "Pick up other crews' jobs",
      text: function () {
        return "Claim a job another crew can't take and it lands on Jordan's schedule. The crew doing the work keeps 85%, " +
          "the crew that passed it on earns 10%, and JobRoute takes 5%.";
      }
    },
    {
      view: "pricing", target: ".plan",
      title: "How JobRoute makes money",
      text: function () {
        return money(PRICING.base) + " a month including the owner, plus " + money(PRICING.perTech) +
          " for each technician, and 5% of every overflow job. That's the tour. Everything on the site is clickable, so try it yourself.";
      }
    }
  ];

  const tourBox = document.getElementById("tour");
  let tourStep = -1;
  let tourTimer = null;
  let tourHighlight = null;

  // Tour step 7: slide the network from a few crews up to 20
  function growNetwork(target) {
    clearInterval(tourTimer);
    if (reduceMotion()) { operators = target; renderNetwork(); return; }
    tourTimer = setInterval(function () {
      if (operators >= target) { clearInterval(tourTimer); return; }
      operators++;
      renderNetwork();
    }, 160);
  }

  function clearHighlight() {
    if (tourHighlight) tourHighlight.classList.remove("tour-target");
    tourHighlight = null;
  }

  function showTourStep(index) {
    clearInterval(tourTimer);
    clearHighlight();
    tourStep = index;
    const step = TOUR[index];
    if (step.enter) step.enter();

    // Open the view (or redraw it if we're already there)
    if (window.location.hash !== "#" + step.view) {
      window.location.hash = step.view;
    } else {
      showView();
    }

    document.getElementById("tour-step").textContent = "Step " + (index + 1) + " of " + TOUR.length;
    document.getElementById("tour-bar").style.width = ((index + 1) / TOUR.length * 100) + "%";
    document.getElementById("tour-title").textContent = step.title;
    document.getElementById("tour-text").textContent = step.text();
    document.getElementById("tour-back").disabled = index === 0;
    document.getElementById("tour-next").textContent = index === TOUR.length - 1 ? "Finish" : "Next";

    // Wait a moment for the view to draw, then outline the part we're talking about
    setTimeout(function () {
      if (tourStep !== index) return;
      const found = document.querySelector(step.target);
      if (!found) return;
      tourHighlight = step.self ? found : (found.closest(".card") || found);
      tourHighlight.classList.add("tour-target");
      const header = document.querySelector(".site-header").offsetHeight;
      const top = tourHighlight.getBoundingClientRect().top + window.scrollY - header - 12;
      window.scrollTo({ top: Math.max(0, top), behavior: reduceMotion() ? "auto" : "smooth" });
      if (step.after) step.after();
    }, 120);
  }

  function startTour() {
    tourBox.hidden = false;
    document.body.classList.add("touring");
    showTourStep(0);
    document.getElementById("tour-next").focus();
  }

  function endTour() {
    clearInterval(tourTimer);
    clearHighlight();
    tourStep = -1;
    tourBox.hidden = true;
    document.body.classList.remove("touring");
  }

  document.querySelectorAll("[data-tour-start]").forEach(function (btn) {
    btn.addEventListener("click", startTour);
  });
  document.getElementById("tour-next").addEventListener("click", function () {
    if (tourStep >= TOUR.length - 1) endTour();
    else showTourStep(tourStep + 1);
  });
  document.getElementById("tour-back").addEventListener("click", function () {
    if (tourStep > 0) showTourStep(tourStep - 1);
  });
  document.getElementById("tour-close").addEventListener("click", endTour);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && tourStep !== -1) endTour();
  });

  // ----------------------------------------------------------
  // 13. Start up.
  // ----------------------------------------------------------
  showView();
})();
