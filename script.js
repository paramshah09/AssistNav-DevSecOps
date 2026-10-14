"use strict";
/* =====================================================================
   AssistNav - Object-Oriented Design of an Assistive Navigation System
   Plain ES6 classes, no libraries, no backend. All data is SIMULATED.

   Classes:
     AccessibilityPreference - what a user needs (rules, alerts, speed)
     User                    - the person using the app
     Location                - a campus place with x/y coordinates
     Route                   - one simulated route between two locations
     NavigationSystem        - main controller (data, search, selection)
     AppUI                   - connects the HTML page to NavigationSystem
   ===================================================================== */

/* ---------- Shared constants ---------- */
const FEATURE = {
  RAMP: "Wheelchair ramp",
  ELEVATOR: "Elevator",
  RESTROOM: "Accessible restroom",
  TACTILE: "Tactile path",
  STAIRS: "Stairs present"
};
const RATINGS = ["Low", "Moderate", "Good", "Excellent"]; // lowest -> highest

/* =====================================================================
   CLASS: AccessibilityPreference
   Purpose: describes one kind of accessibility need. It decides whether
   a route is suitable and which alerts should be shown.
   ===================================================================== */
class AccessibilityPreference {
  constructor({ id, label, description, requiredFeatures, avoidsStairs, walkingSpeed }) {
    this.id = id;
    this.label = label;
    this.description = description;
    this.requiredFeatures = requiredFeatures; // features a route must have
    this.avoidsStairs = avoidsStairs;         // true = stairs are not acceptable
    this.walkingSpeed = walkingSpeed;         // metres per minute (used for time estimate)
  }

  /** A route is suitable if it has no forbidden stairs and all required features. */
  isSuitable(route) {
    if (this.avoidsStairs && route.hasStairs) return false;
    return this.requiredFeatures.every(f => route.features.includes(f));
  }

  /** Short human-readable reason why a route is NOT suitable ("" if suitable). */
  explainUnsuitable(route) {
    if (this.isSuitable(route)) return "";
    if (this.avoidsStairs && route.hasStairs) return "Has stairs - not step-free.";
    const missing = this.requiredFeatures.filter(f => !route.features.includes(f));
    return "Missing: " + missing.join(", ") + ".";
  }

  /** Alerts shown for the selected route. Returns [{level, text}]. */
  getAlerts(route, allRoutes) {
    const alerts = [];
    const add = (level, text) => alerts.push({ level, text });
    const has = f => route.features.includes(f);

    switch (this.id) {
      case "wheelchair":
        has(FEATURE.RAMP) ? add("info", "Ramp available") : add("warning", "No ramp on this route");
        has(FEATURE.ELEVATOR) ? add("info", "Elevator available") : add("warning", "No elevator on this route");
        break;
      case "visual":
        has(FEATURE.TACTILE) ? add("info", "Tactile pathway available")
                             : add("warning", "No tactile pathway on this route - choose a route that has one");
        add("info", "High-contrast navigation information available (use the High Contrast button)");
        break;
      case "hearing":
        add("info", "Visual notification enabled");
        add("info", "Navigation steps are shown as on-screen text instead of audio prompts");
        break;
      default: // general
        has(FEATURE.RAMP) && add("info", "Ramp available");
        has(FEATURE.ELEVATOR) && add("info", "Elevator available");
    }

    if (route.hasStairs) {
      add("warning", "Stairs detected on this route (" + route.label + ")");
    } else {
      // Warn about stairs on the other routes so the user can avoid them.
      allRoutes.filter(r => r !== route && r.hasStairs)
               .forEach(r => add("warning", "Stairs detected on the " + r.label));
    }
    return alerts;
  }
}

/* =====================================================================
   CLASS: User
   Purpose: stores the person's name and chosen accessibility preference.
   ===================================================================== */
class User {
  constructor(name) {
    this.name = name;
    this.preference = null;
  }
  setPreference(preference) { this.preference = preference; }
}

/* =====================================================================
   CLASS: Location
   Purpose: a campus place. x/y are simulated coordinates in metres.
   ===================================================================== */
class Location {
  constructor(id, name, x, y) {
    this.id = id;
    this.name = name;
    this.x = x;
    this.y = y;
  }
  /** Straight-line distance to another location, in metres. */
  distanceTo(other) {
    return Math.hypot(this.x - other.x, this.y - other.y);
  }
}

/* =====================================================================
   CLASS: Route
   Purpose: one simulated route (distance, features, rating, steps).
   ===================================================================== */
class Route {
  constructor({ id, label, start, end, distanceM, features, baseRating }) {
    this.id = id;                 // "accessible" | "fastest" | "alternative"
    this.label = label;           // text shown to the user
    this.start = start;           // Location
    this.end = end;               // Location
    this.distanceM = distanceM;   // metres
    this.features = features;     // array of FEATURE values
    this.baseRating = baseRating; // rating before applying a preference
  }

  get hasStairs() { return this.features.includes(FEATURE.STAIRS); }
  get distanceKm() { return (this.distanceM / 1000).toFixed(2); }

  /** Estimated walking time (minutes) depends on the user's walking speed. */
  timeFor(pref) { return Math.ceil(this.distanceM / pref.walkingSpeed); }

  /** Rating adjusted for the preference (unsuitable routes are rated lower). */
  ratingFor(pref) {
    if (pref.isSuitable(this)) return this.baseRating;
    if (pref.avoidsStairs && this.hasStairs) return "Low";
    return RATINGS[Math.max(0, RATINGS.indexOf(this.baseRating) - 1)];
  }

  /** Splits the total distance into 3 parts that add up exactly. */
  _splitDistance() {
    const a = Math.round(this.distanceM * 0.40 / 10) * 10;
    const b = Math.round(this.distanceM * 0.35 / 10) * 10;
    return [a, b, this.distanceM - a - b];
  }

  /** Generates simple step-by-step instructions (array of strings). */
  generateSteps() {
    const [a, b, c] = this._splitDistance();
    const S = this.start.name, E = this.end.name;
    switch (this.id) {
      case "accessible":
        return [
          "Start at " + S,
          "Move straight for " + a + " m",
          "Turn left",
          "Use the wheelchair ramp",
          "Continue for " + b + " m on the step-free path",
          "Use the elevator to reach the correct level",
          "Continue for " + c + " m towards " + E,
          "Destination reached: " + E
        ];
      case "alternative":
        return [
          "Start at " + S,
          "Move straight for " + a + " m",
          "Follow the tactile path",
          "Turn right",
          "Use the ramp and continue for " + b + " m",
          "Use the elevator to reach the correct level",
          "Continue for " + c + " m towards " + E,
          "Destination reached: " + E
        ];
      default: // fastest
        return [
          "Start at " + S,
          "Move straight for " + a + " m along the main road",
          "Take the stairs (not step-free)",
          "Turn right and continue for " + b + " m",
          "Continue for " + c + " m towards " + E,
          "Destination reached: " + E
        ];
    }
  }
}

/* =====================================================================
   CLASS: NavigationSystem
   Purpose: main controller. Stores locations, preferences and routes;
   validates input, builds/ranks routes, selects a route, steps through
   navigation, produces alerts, handles emergency, runs self-tests.
   ===================================================================== */
class NavigationSystem {
  constructor() {
    this.locations = [];
    this.preferences = [];
    this.user = new User("Demo User");
    this.routes = [];
    this.selectedRoute = null;
    this.currentStep = 0;
    this._loadDemoData();
  }

  /** Predefined SIMULATED campus data. */
  _loadDemoData() {
    this.locations = [
      new Location("gate",   "Main Gate",          0,     0),
      new Location("admin",  "Admin Building",     350,   200),
      new Location("library","Library",            600,   500),
      new Location("eng",    "Engineering Block",  900,   250),
      new Location("canteen","Canteen",            700,  -150),
      new Location("parking","Parking Area",      -250,  -300)
    ];
    this.preferences = [
      new AccessibilityPreference({ id: "wheelchair", label: "Wheelchair / Mobility assistance",
        description: "Needs ramps and elevators, avoids stairs",
        requiredFeatures: [FEATURE.RAMP, FEATURE.ELEVATOR], avoidsStairs: true, walkingSpeed: 70 }),
      new AccessibilityPreference({ id: "visual", label: "Visual assistance",
        description: "Needs tactile paths and high contrast",
        requiredFeatures: [FEATURE.TACTILE], avoidsStairs: false, walkingSpeed: 60 }),
      new AccessibilityPreference({ id: "hearing", label: "Hearing assistance",
        description: "Needs visual (on-screen) notifications",
        requiredFeatures: [], avoidsStairs: false, walkingSpeed: 80 }),
      new AccessibilityPreference({ id: "general", label: "General accessibility",
        description: "Prefers step-free routes",
        requiredFeatures: [], avoidsStairs: true, walkingSpeed: 80 })
    ];
  }

  getLocation(id) { return this.locations.find(l => l.id === id) || null; }
  getPreference(id) { return this.preferences.find(p => p.id === id) || null; }

  /** Builds the 3 simulated routes for a start/end pair. */
  _buildRoutes(start, end) {
    const straight = start.distanceTo(end);
    const dist = factor => Math.round(straight * factor / 10) * 10; // metres, nearest 10
    return [
      new Route({ id: "accessible", label: "Accessible Route", start, end, distanceM: dist(1.35),
        features: [FEATURE.RAMP, FEATURE.ELEVATOR, FEATURE.RESTROOM], baseRating: "Excellent" }),
      new Route({ id: "fastest", label: "Fastest Route", start, end, distanceM: dist(1.15),
        features: [FEATURE.STAIRS], baseRating: "Moderate" }),
      new Route({ id: "alternative", label: "Alternative Route", start, end, distanceM: dist(1.60),
        features: [FEATURE.RAMP, FEATURE.TACTILE, FEATURE.ELEVATOR], baseRating: "Excellent" })
    ];
  }

  /**
   * Validates input, builds routes and ranks them for the preference.
   * Returns { ok, errors:[{field,message}], routes }.
   */
  findRoutes(startId, destId, prefId) {
    const errors = [];
    const start = this.getLocation(startId);
    const end = this.getLocation(destId);
    const pref = this.getPreference(prefId);

    if (!start) errors.push({ field: "start", message: "Please select a starting location." });
    if (!end) errors.push({ field: "destination", message: "Please select a destination." });
    if (start && end && start.id === end.id)
      errors.push({ field: "destination", message: "Destination must be different from the starting location." });
    if (!pref) errors.push({ field: "preference", message: "Please select an accessibility preference." });
    if (errors.length) return { ok: false, errors, routes: [] };

    this.user.setPreference(pref);
    const rank = r => RATINGS.indexOf(r.ratingFor(pref));
    const routes = this._buildRoutes(start, end).sort((a, b) =>
      (pref.isSuitable(b) - pref.isSuitable(a)) ||   // suitable routes first
      (rank(b) - rank(a)) ||                          // then higher rating
      (a.timeFor(pref) - b.timeFor(pref)));           // then shorter time
    this.routes = routes;
    this.selectedRoute = null;
    this.currentStep = 0;
    return { ok: true, errors: [], routes };
  }

  /** The recommended route is the first one if it is suitable. */
  getRecommended() {
    const pref = this.user.preference;
    return this.routes.length && pref && pref.isSuitable(this.routes[0]) ? this.routes[0] : null;
  }

  selectRoute(routeId) {
    const route = this.routes.find(r => r.id === routeId) || null;
    this.selectedRoute = route;
    this.currentStep = 0;
    return route;
  }

  getSteps() { return this.selectedRoute ? this.selectedRoute.generateSteps() : []; }
  nextStep() { if (this.currentStep < this.getSteps().length - 1) this.currentStep++; }
  prevStep() { if (this.currentStep > 0) this.currentStep--; }
  restart()  { this.currentStep = 0; }

  getAlerts() {
    if (!this.selectedRoute || !this.user.preference) return [];
    return this.user.preference.getAlerts(this.selectedRoute, this.routes);
  }

  /** Simulated emergency help - NO real calling. */
  triggerEmergency() {
    return {
      message: "Emergency assistance has been requested (simulation). Stay where you are and wait for help.",
      contact: "Campus Security: +91-XXXXX-XXXXX (placeholder)",
      note: "Demonstration only. No call or message is actually sent."
    };
  }

  /** Simple automated tests. Uses a fresh NavigationSystem so app state is untouched. */
  runSelfTests() {
    const results = [];
    const test = (name, fn) => {
      try { const detail = fn(); results.push({ name, status: detail === false ? "FAIL" : "PASS", detail: detail === false ? "Assertion failed" : detail }); }
      catch (e) { results.push({ name, status: "FAIL", detail: String(e.message || e) }); }
    };
    const sys = new NavigationSystem();

    test("Valid route search", () => {
      const r = sys.findRoutes("gate", "library", "wheelchair");
      return r.ok && r.routes.length === 3 ? "3 routes returned" : false;
    });
    test("Missing destination validation", () => {
      const r = sys.findRoutes("gate", "", "wheelchair");
      return !r.ok && r.errors[0].message.includes("destination") ? r.errors[0].message : false;
    });
    test("Same start and destination rejected", () => {
      const r = sys.findRoutes("gate", "gate", "general");
      return !r.ok ? r.errors[0].message : false;
    });
    test("Wheelchair accessibility filtering", () => {
      const r = sys.findRoutes("gate", "library", "wheelchair");
      const fastest = r.routes.find(x => x.id === "fastest");
      const pref = sys.getPreference("wheelchair");
      return !pref.isSuitable(fastest) && !r.routes[0].hasStairs && r.routes[2].id === "fastest"
        ? "Stair route ranked last; top route: " + r.routes[0].label : false;
    });
    test("Visual preference picks tactile route", () => {
      sys.findRoutes("gate", "library", "visual");
      const top = sys.getRecommended();
      return top && top.features.includes(FEATURE.TACTILE) ? "Recommended: " + top.label : false;
    });
    test("Hearing preference shows visual notification", () => {
      sys.findRoutes("gate", "library", "hearing");
      sys.selectRoute("accessible");
      return sys.getAlerts().some(a => a.text === "Visual notification enabled") ? "Alert present" : false;
    });
    test("Route selection and steps", () => {
      sys.findRoutes("canteen", "admin", "general");
      const route = sys.selectRoute("accessible");
      const steps = sys.getSteps();
      return route && steps[0].startsWith("Start at") && steps[steps.length - 1].startsWith("Destination reached")
        ? steps.length + " steps generated" : false;
    });
    test("Emergency / Help function", () => {
      const e = sys.triggerEmergency();
      return e.contact.includes("placeholder") ? "Placeholder contact returned" : false;
    });
    return results;
  }
}

/* =====================================================================
   CLASS: AppUI
   Purpose: reads the form, calls NavigationSystem, and updates the page.
   ===================================================================== */
class AppUI {
  constructor(system) {
    this.sys = system;
    this.$ = id => document.getElementById(id);
    this._fillForm();
    this._bindEvents();
  }

  /** Creates a DOM element with optional class and text (safe: uses textContent). */
  _el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  _fillForm() {
    [["startSelect", "-- Select starting location --"], ["destSelect", "-- Select destination --"]].forEach(([id, ph]) => {
      const sel = this.$(id);
      sel.appendChild(new Option(ph, ""));
      this.sys.locations.forEach(l => sel.appendChild(new Option(l.name, l.id)));
    });
    const box = this.$("prefOptions");
    this.sys.preferences.forEach(p => {
      const label = this._el("label", "pref-option");
      const input = document.createElement("input");
      input.type = "radio"; input.name = "pref"; input.value = p.id;
      const text = this._el("span", "", p.label);
      text.appendChild(this._el("small", "", p.description));
      label.append(input, text);
      box.appendChild(label);
    });
  }

  _bindEvents() {
    this.$("findBtn").addEventListener("click", () => this.onFind());
    this.$("prevBtn").addEventListener("click", () => { this.sys.prevStep(); this.renderNavigation(); });
    this.$("nextBtn").addEventListener("click", () => { this.sys.nextStep(); this.renderNavigation(); });
    this.$("restartBtn").addEventListener("click", () => { this.sys.restart(); this.renderNavigation(); });
    this.$("emergencyBtn").addEventListener("click", () => this.openEmergency());
    this.$("closeEmergency").addEventListener("click", () => this.$("emergencyDialog").close());
    this.$("contrastBtn").addEventListener("click", () => this.toggleContrast());
    this.$("testBtn").addEventListener("click", () => this.runTests());
  }

  showStatus(message, type) {
    const box = this.$("statusBox");
    box.textContent = message;
    box.className = "status" + (type ? " " + type : "");
  }

  clearErrors() {
    ["start", "dest", "pref"].forEach(k => (this.$(k + "Error").textContent = ""));
    ["startSelect", "destSelect"].forEach(id => this.$(id).removeAttribute("aria-invalid"));
  }

  onFind() {
    this.clearErrors();
    const checked = document.querySelector('input[name="pref"]:checked');
    const result = this.sys.findRoutes(this.$("startSelect").value, this.$("destSelect").value, checked ? checked.value : "");

    if (!result.ok) {
      const map = { start: ["startError", "startSelect"], destination: ["destError", "destSelect"], preference: ["prefError", null] };
      result.errors.forEach(err => {
        const [errId, selId] = map[err.field];
        this.$(errId).textContent = err.message;
        if (selId) this.$(selId).setAttribute("aria-invalid", "true");
      });
      this.$("routesSection").hidden = true;
      this.$("navSection").hidden = true;
      this.$("alertsSection").hidden = true;
      this.showStatus("Cannot search: " + result.errors.map(e => e.message).join(" "), "error");
      return;
    }
    const first = this.sys.routes[0];
    this.showStatus("Found " + result.routes.length + " routes from " + first.start.name + " to " + first.end.name + ". Select a route to continue.", "success");
    this.$("navSection").hidden = true;
    this.$("alertsSection").hidden = true;
    this.renderRoutes();
    this.$("routesSection").hidden = false;
    this.$("routesHeading").focus();
  }

  renderRoutes() {
    const list = this.$("routesList");
    list.textContent = "";
    const pref = this.sys.user.preference;
    const recommended = this.sys.getRecommended();

    this.sys.routes.forEach(route => {
      const suitable = pref.isSuitable(route);
      const card = this._el("article", "route-card" + (this.sys.selectedRoute === route ? " selected" : ""));
      card.appendChild(this._el("h3", "", route.label));
      if (route === recommended) card.appendChild(this._el("span", "badge", "Recommended"));
      else if (!suitable) card.appendChild(this._el("span", "badge bad", "Not suitable"));

      const dl = this._el("dl");
      [["Distance", route.distanceKm + " km"],
       ["Time", route.timeFor(pref) + " min"],
       ["Accessibility", route.ratingFor(pref)]].forEach(([k, v]) => {
        dl.append(this._el("dt", "", k), this._el("dd", "", v));
      });
      card.appendChild(dl);

      const ul = this._el("ul");
      route.features.forEach(f => ul.appendChild(this._el("li", "", f)));
      card.appendChild(ul);
      if (!suitable) card.appendChild(this._el("p", "reason", pref.explainUnsuitable(route)));

      const btn = this._el("button", "btn btn-primary", this.sys.selectedRoute === route ? "Selected" : "Select this route");
      btn.type = "button";
      btn.setAttribute("aria-label", "Select " + route.label);
      btn.addEventListener("click", () => this.onSelectRoute(route.id));
      card.appendChild(btn);
      list.appendChild(card);
    });
  }

  onSelectRoute(routeId) {
    const route = this.sys.selectRoute(routeId);
    this.renderRoutes();
    this.renderAlerts();
    this.renderNavigation();
    this.$("alertsSection").hidden = false;
    this.$("navSection").hidden = false;
    this.showStatus(route.label + " selected. Navigation started.", "success");
    this.$("navHeading").focus();
  }

  renderAlerts() {
    const ul = this.$("alertsList");
    ul.textContent = "";
    this.sys.getAlerts().forEach(a => {
      const prefix = a.level === "warning" ? "Warning: " : "Info: "; // text, not just colour
      ul.appendChild(this._el("li", a.level, prefix + a.text));
    });
  }

  renderNavigation() {
    const route = this.sys.selectedRoute;
    if (!route) return;
    const steps = this.sys.getSteps();
    const i = this.sys.currentStep;
    this.$("navSubtitle").textContent = route.label + ": " + route.start.name + " to " + route.end.name +
      " (" + route.distanceKm + " km, about " + route.timeFor(this.sys.user.preference) + " min)";
    this.$("stepBanner").textContent = "Step " + (i + 1) + " of " + steps.length + ": " + steps[i];

    const ol = this.$("stepsList");
    ol.textContent = "";
    steps.forEach((s, idx) => {
      const li = this._el("li", idx < i ? "done" : idx === i ? "current" : "", s);
      if (idx === i) li.setAttribute("aria-current", "step");
      ol.appendChild(li);
    });
    this.$("prevBtn").disabled = i === 0;
    this.$("nextBtn").disabled = i === steps.length - 1;
  }

  openEmergency() {
    const info = this.sys.triggerEmergency();
    this.$("emMessage").textContent = info.message;
    this.$("emContact").textContent = info.contact;
    this.$("emNote").textContent = info.note;
    this.$("emergencyDialog").showModal();
    this.showStatus("Emergency / Help dialog opened (simulation).", "");
  }

  toggleContrast() {
    const on = document.body.classList.toggle("high-contrast");
    const btn = this.$("contrastBtn");
    btn.setAttribute("aria-pressed", String(on));
    btn.textContent = "High Contrast: " + (on ? "On" : "Off");
  }

  runTests() {
    const rows = this.sys.runSelfTests();
    // Responsive layout cannot be auto-tested here, so it is listed as a manual check.
    rows.push({ name: "Responsive UI", status: "MANUAL", detail: "Resize the browser window or use phone view and confirm the layout stacks." });
    const body = this.$("testResults");
    body.textContent = "";
    rows.forEach(r => {
      const tr = document.createElement("tr");
      tr.append(this._el("td", "", r.name), this._el("td", r.status.toLowerCase(), r.status), this._el("td", "", r.detail));
      body.appendChild(tr);
    });
    this.$("testTable").hidden = false;
    const failed = rows.filter(r => r.status === "FAIL").length;
    this.showStatus(failed ? failed + " self-test(s) failed." : "All automated self-tests passed.", failed ? "error" : "success");
  }
}

/* ---------- Start the app (browser) / export for Node tests ---------- */
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => new AppUI(new NavigationSystem()));
}
if (typeof module !== "undefined") {
  module.exports = { NavigationSystem, Route, Location, User, AccessibilityPreference };
}
