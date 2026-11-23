// ============================================================
// app.js — what JobRoute DOES.
// Plain JavaScript, no libraries, no installs.
// It uses STARTUP, DEMO, SERVICES, TECHS, PROPERTIES and JOBS
// from data.js (loaded first).
// ============================================================

(function () {
  "use strict";

  // ----------------------------------------------------------
  // 1. Saving things in the browser (localStorage).
  //    This only remembers things on THIS browser on THIS device.
  //    A real product would need a server and a shared database.
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

  const JOBS_KEY = "jobroute.jobs.v1";

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
  function shortDate(iso) {
    const parts = iso.split("-");
    return MONTHS[Number(parts[1]) - 1] + " " + Number(parts[2]);
  }

  function minutesBetween(start, end) {
    const a = start.split(":").map(Number);
    const b = end.split(":").map(Number);
    return (b[0] * 60 + b[1]) - (a[0] * 60 + a[1]);
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
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

  function jobHours(job) {
    if (job.start && job.end) return minutesBetween(job.start, job.end) / 60;
    const service = byId(SERVICES, job.service);
    return service ? service.minutes / 60 : 0;
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
  // 4. Put the startup's name and pitch on the page.
  // ----------------------------------------------------------
  document.title = STARTUP.name + " — smart routing & job management";
  document.getElementById("brand-name").textContent = STARTUP.name;
  document.getElementById("tagline").textContent = STARTUP.tagline;
  document.getElementById("pitch").textContent = STARTUP.pitch;

  // ----------------------------------------------------------
  // 5. Views: show one section at a time, based on the #link.
  // ----------------------------------------------------------
  function showView() {
    const requested = (window.location.hash || "#home").slice(1);
    const views = document.querySelectorAll("[data-view]");
    const exists = Array.prototype.some.call(views, function (view) {
      return view.id === requested;
    });
    const current = exists ? requested : "home";

    // "#roles" is a spot on the home page, not a separate view
    if (!exists && requested === "roles") {
      views.forEach(function (view) { view.hidden = view.id !== "home"; });
      document.getElementById("roles").scrollIntoView();
      return;
    }

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

    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", showView);

  // ----------------------------------------------------------
  // 6. Owner dashboard.
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

    const cards = [
      { label: "Revenue earned", value: money(revenue), note: done.length + " jobs completed" },
      { label: "Labour payout", value: money(labour), note: "Commission + hourly pay" },
      { label: "Profit after labour", value: money(profit), note: margin + "% margin · " + money(hours ? profit / hours : 0) + " per crew hour" },
      {
        label: "Still booked",
        value: money(booked),
        note: open.length + " jobs ahead" + (overdue.length ? " · " + overdue.length + " overdue" : ""),
        bad: overdue.length > 0
      }
    ];

    const box = document.getElementById("kpis");
    box.replaceChildren.apply(box, cards.map(function (card) {
      const node = el("div", "card kpi");
      node.append(
        el("p", "kpi-label", card.label),
        el("p", "kpi-value", card.value),
        el("p", "kpi-note" + (card.bad ? " bad" : ""), card.note)
      );
      return node;
    }));
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
      const status = el("span", "status " + state, STATE_LABEL[state]);

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

  // Filter chips
  document.querySelectorAll(".chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      filter = chip.getAttribute("data-filter");
      document.querySelectorAll(".chip").forEach(function (c) {
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

  // ----------------------------------------------------------
  // 7. "Book a job" form. Nothing is sent anywhere: the job is
  //    added to the list and saved in this browser only.
  // ----------------------------------------------------------
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
    document.querySelectorAll(".chip").forEach(function (c) {
      c.setAttribute("aria-pressed", c.getAttribute("data-filter") === "all" ? "true" : "false");
    });
    renderOwner();

    const property = byId(PROPERTIES, job.property);
    showFormMessage("Booked: " + byId(SERVICES, job.service).name + " at " + property.address +
      " on " + shortDate(job.date) + " for " + money(price) + ".");
  });

  // ----------------------------------------------------------
  // 8. Start up.
  // ----------------------------------------------------------
  renderOwner();
  showView();
})();
