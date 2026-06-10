// SPDX-License-Identifier: MIT

// ---------------------------------------------------------------------------
// Action handler — mirrors the pattern used by HA built-in cards.
// We implement it ourselves so the card has no runtime dependencies.
// ---------------------------------------------------------------------------

const HOLD_DURATION = 500; // ms before hold fires

/**
 * Attach pointer-based tap / hold / double-tap listeners to an element.
 * Fires custom DOM events: "action" with detail { action: 'tap'|'hold'|'double_tap' }
 */
function attachActionHandler(el, options = {}) {
  if (el._actionHandlerAttached) return;
  el._actionHandlerAttached = true;

  const hasHold = options.hasHold !== false;
  const hasDoubleTap = options.hasDoubleTap === true;

  let holdTimer = null;
  let startX = 0;
  let startY = 0;
  let tapCount = 0;
  let tapTimer = null;
  let held = false;

  function fireAction(action) {
    el.dispatchEvent(new CustomEvent("action", { detail: { action }, bubbles: false }));
  }

  function onPointerDown(e) {
    held = false;
    startX = e.clientX;
    startY = e.clientY;
    if (hasHold) {
      holdTimer = window.setTimeout(() => {
        held = true;
        fireAction("hold");
      }, HOLD_DURATION);
    }
  }

  function onPointerUp(e) {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    if (held) return;

    const dx = Math.abs(e.clientX - startX);
    const dy = Math.abs(e.clientY - startY);
    if (dx > 10 || dy > 10) return; // was a scroll/swipe

    if (hasDoubleTap) {
      tapCount++;
      if (tapCount === 1) {
        tapTimer = window.setTimeout(() => {
          tapCount = 0;
          fireAction("tap");
        }, 250);
      } else if (tapCount === 2) {
        clearTimeout(tapTimer);
        tapCount = 0;
        fireAction("double_tap");
      }
    } else {
      fireAction("tap");
    }
  }

  function onPointerCancel() {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    held = false;
  }

  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointerup", onPointerUp);
  el.addEventListener("pointercancel", onPointerCancel);
}

/**
 * Execute a HA action config object.
 * Needs the host element (for events), the hass object, and the action config.
 */
function handleAction(node, hass, actionConfig) {
  if (!actionConfig || !actionConfig.action || actionConfig.action === "none") return;

  // Confirmation dialog
  if (actionConfig.confirmation) {
    const msg =
      typeof actionConfig.confirmation === "object" && actionConfig.confirmation.text
        ? actionConfig.confirmation.text
        : "Are you sure?";
    if (!window.confirm(msg)) return;
  }

  switch (actionConfig.action) {
    case "navigate": {
      const path = actionConfig.navigation_path;
      if (!path) return;
      if (actionConfig.navigation_replace) {
        history.replaceState(null, "", path);
      } else {
        history.pushState(null, "", path);
      }
      node.dispatchEvent(
        new CustomEvent("location-changed", {
          detail: { replace: !!actionConfig.navigation_replace },
          bubbles: true,
          composed: true,
        }),
      );
      break;
    }

    case "url": {
      const url = actionConfig.url_path;
      if (!url) return;
      window.open(url, "_blank", "noopener noreferrer");
      break;
    }

    case "more-info": {
      const entityId = actionConfig.entity;
      if (!entityId) return;
      node.dispatchEvent(
        new CustomEvent("hass-more-info", {
          detail: { entityId },
          bubbles: true,
          composed: true,
        }),
      );
      break;
    }

    case "toggle": {
      const entityId = actionConfig.entity;
      if (!entityId || !hass) return;
      const [domain] = entityId.split(".");
      hass.callService(domain, "toggle", { entity_id: entityId });
      break;
    }

    case "perform-action": {
      if (!hass || !actionConfig.perform_action) return;
      const [domain, service] = actionConfig.perform_action.split(".");
      hass.callService(domain, service, actionConfig.data || {}, actionConfig.target || {});
      break;
    }

    case "assist": {
      node.dispatchEvent(
        new CustomEvent("show-dialog", {
          detail: {
            dialogTag: "ha-voice-command-dialog",
            dialogImport: () =>
              Promise.resolve(),
            dialogParams: {
              pipeline_id: actionConfig.pipeline_id || "last_used",
              start_listening: actionConfig.start_listening || false,
            },
          },
          bubbles: true,
          composed: true,
        }),
      );
      break;
    }

    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// Default configs
// ---------------------------------------------------------------------------

const DEFAULT_ACTION = { action: "none" };

const DEFAULT_CONFIG = {
  show_date: true,
  date_format: "locale",
  size: 300,
  time_format: "24",
  show_background: false,
  background_color: "transparent",
  number_color: "var(--primary-text-color)",
  background_shape: "square",
  tap_action: DEFAULT_ACTION,
  hold_action: DEFAULT_ACTION,
  double_tap_action: DEFAULT_ACTION,
};

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

class ClockCard extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (!this.content) {
      this.init();
      if (this.config) {
        this._applyConfig();
      }
    }
    this.updateClock();
  }

  setConfig(config) {
    const cfg = Object.assign({}, DEFAULT_CONFIG, config || {});
    // Deep-merge action objects so partial user overrides don't wipe sub-keys
    for (const key of ["tap_action", "hold_action", "double_tap_action"]) {
      cfg[key] = Object.assign({}, DEFAULT_ACTION, (config && config[key]) || {});
    }
    this.config = cfg;
    if (this.content) {
      this._applyConfig();
    }
  }

  _hasAction(actionCfg) {
    return actionCfg && actionCfg.action && actionCfg.action !== "none";
  }

  _applyConfig() {
    if (!this.config || !this.content) return;

    this.style.setProperty("--clock-size", `${this.config.size}px`);
    this.style.setProperty(
      "--clock-background-color",
      this.config.show_background ? this.config.background_color : "transparent",
    );
    this.style.setProperty("--clock-number-color", this.config.number_color);
    this.style.setProperty(
      "--clock-background-radius",
      this.config.background_shape === "circle" ? "50%" : "0",
    );

    if (this.dateDisplay) {
      this.dateDisplay.classList.toggle("hidden", !this.config.show_date);
    }
    if (this.timeDisplay) {
      this.timeDisplay.classList.toggle("twelve-hour", this.config.time_format === "12");
    }

    const interactive =
      this._hasAction(this.config.tap_action) ||
      this._hasAction(this.config.hold_action) ||
      this._hasAction(this.config.double_tap_action);
    this.content.style.cursor = interactive ? "pointer" : "default";
  }

  init() {
    this.dateFormatters = {
      locale: new Intl.DateTimeFormat(undefined, { month: "2-digit", day: "2-digit" }),
      dd_mm: new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit" }),
      mm_dd: new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit" }),
    };

    this.innerHTML = `
      <style>
        ha-card {
          background: var(--clock-background-color, transparent);
          box-shadow: none;
          border: none;
          position: relative;
          width: var(--clock-size, 300px);
          max-width: 100%;
          aspect-ratio: 1 / 1;
          margin: 0;
          border-radius: var(--clock-background-radius, 0);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          -webkit-tap-highlight-color: transparent;
        }
        .clock-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: calc(var(--clock-size, 300px) * 0.25);
          font-weight: bold;
          color: var(--clock-number-color, var(--primary-text-color));
          z-index: 2;
          font-family: var(--paper-font-headline_-_font-family);
          white-space: nowrap;
          pointer-events: none;
          user-select: none;
        }
        .clock-text .time-main {
          display: inline-block;
        }
        .clock-text.twelve-hour {
          font-size: calc(var(--clock-size, 300px) * 0.24);
        }
        .clock-text .meridiem {
          display: inline-block;
          margin-left: 0.18em;
          font-size: 0.38em;
          vertical-align: super;
          letter-spacing: 0.03em;
          opacity: 0.9;
        }
        .clock-text .meridiem.hidden {
          display: none;
        }
        .date-text {
          position: absolute;
          top: 70%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: calc(var(--clock-size, 300px) * 0.07);
          color: var(--clock-number-color, var(--primary-text-color));
          z-index: 2;
          pointer-events: none;
          user-select: none;
        }
        .date-text.hidden {
          display: none;
        }
        svg {
          position: absolute;
          top: 0;
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
          pointer-events: none;
        }
        circle {
          fill: none;
          stroke-width: 4%;
          stroke-linecap: round;
        }
        .bg-ring {
          stroke: var(--divider-color);
          opacity: 0.2;
        }
        .active-ring {
          stroke: var(--primary-color);
          transition: stroke-dashoffset 1s linear;
        }
      </style>
      <ha-card>
        <div class="clock-text" id="time-display">
          <span class="time-main" id="time-main">--:--</span>
          <span class="meridiem hidden" id="time-meridiem">AM</span>
        </div>
        <div class="date-text" id="date-display"></div>
        <svg viewBox="0 0 300 300">
          <circle cx="150" cy="150" r="140" class="bg-ring" />
          <circle cx="150" cy="150" r="140" class="active-ring" id="seconds-ring" />
        </svg>
      </ha-card>
    `;

    this.style.display = "flex";
    this.style.alignItems = "center";
    this.style.justifyContent = "center";
    this.style.width = "100%";
    this.style.height = "100%";

    this.content = this.querySelector("ha-card");
    this.timeDisplay = this.querySelector("#time-display");
    this.timeMain = this.querySelector("#time-main");
    this.timeMeridiem = this.querySelector("#time-meridiem");
    this.dateDisplay = this.querySelector("#date-display");
    this.secondsRing = this.querySelector("#seconds-ring");

    // Attach the action handler to ha-card
    const hasDoubleTap = this._hasAction(this.config && this.config.double_tap_action);
    attachActionHandler(this.content, {
      hasHold: true,
      hasDoubleTap,
    });

    this.content.addEventListener("action", (e) => {
      const actionType = e.detail.action; // 'tap' | 'hold' | 'double_tap'
      const actionCfgKey = `${actionType}_action`;
      const actionCfg = this.config && this.config[actionCfgKey];
      handleAction(this, this._hass, actionCfg);
    });
  }

  _formatDate(now) {
    const dateFormat = (this.config && this.config.date_format) || "locale";
    const formatter =
      this.dateFormatters && this.dateFormatters[dateFormat]
        ? this.dateFormatters[dateFormat]
        : this.dateFormatters && this.dateFormatters.locale;

    if (formatter) return formatter.format(now);

    return `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
  }

  updateClock() {
    const now = new Date();
    const formattedDate = this._formatDate(now);
    const format12h = this.config && this.config.time_format === "12";
    const rawHours = now.getHours();
    const hours = format12h
      ? String(((rawHours + 11) % 12) + 1).padStart(2, "0")
      : String(rawHours).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const meridiem = rawHours >= 12 ? "PM" : "AM";
    const seconds = now.getSeconds();

    if (this.timeMain && this.timeMeridiem) {
      this.timeMain.textContent = `${hours}:${minutes}`;
      if (format12h) {
        this.timeMeridiem.textContent = meridiem;
        this.timeMeridiem.classList.remove("hidden");
      } else {
        this.timeMeridiem.classList.add("hidden");
      }
    }
    if (this.dateDisplay) {
      this.dateDisplay.innerText = formattedDate;
    }
    if (this.secondsRing) {
      const r = 140;
      const c = 2 * Math.PI * r;
      this.secondsRing.style.strokeDasharray = c;
      if (seconds === 0) {
        this.secondsRing.style.transition = "none";
        this.secondsRing.style.strokeDashoffset = c;
      } else {
        const dashoffset = c - (seconds / 60) * c;
        this.secondsRing.style.transition = "stroke-dashoffset 1s linear";
        this.secondsRing.style.strokeDashoffset = dashoffset;
      }
    }

    if (!this.timer) {
      this.timer = setInterval(() => this.updateClock(), 1000);
    }
  }

  disconnectedCallback() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getCardSize() {
    return 3;
  }

  static getStubConfig() {
    return Object.assign({}, DEFAULT_CONFIG);
  }

  static getConfigForm() {
    // Reusable action schema builder
    const actionSchema = (actionKey, label) => ({
      name: actionKey,
      type: "expandable",
      title: label,
      schema: [
        {
          name: "action",
          selector: {
            select: {
              options: [
                { value: "none", label: "None" },
                { value: "more-info", label: "More info" },
                { value: "toggle", label: "Toggle" },
                { value: "navigate", label: "Navigate" },
                { value: "url", label: "Open URL" },
                { value: "perform-action", label: "Perform action" },
                { value: "assist", label: "Assist" },
              ],
              mode: "dropdown",
            },
          },
        },
        // more-info / toggle / perform-action / assist: optional entity override
        {
          name: "entity",
          selector: { entity: {} },
          condition: { name: "action", value: ["more-info", "toggle"] },
        },
        // navigate
        {
          name: "navigation_path",
          selector: { text: {} },
          condition: { name: "action", value: "navigate" },
        },
        {
          name: "navigation_replace",
          selector: { boolean: {} },
          condition: { name: "action", value: "navigate" },
        },
        // url
        {
          name: "url_path",
          selector: { text: {} },
          condition: { name: "action", value: "url" },
        },
        // perform-action
        {
          name: "perform_action",
          selector: { text: {} },
          condition: { name: "action", value: "perform-action" },
        },
        // assist
        {
          name: "pipeline_id",
          selector: { text: {} },
          condition: { name: "action", value: "assist" },
        },
        {
          name: "start_listening",
          selector: { boolean: {} },
          condition: { name: "action", value: "assist" },
        },
        // confirmation (applies to all actions that do something)
        {
          name: "confirmation",
          selector: { boolean: {} },
        },
      ],
    });

    return {
      schema: [
        { name: "show_date", selector: { boolean: {} } },
        {
          name: "date_format",
          selector: {
            select: {
              options: [
                { value: "locale", label: "Browser" },
                { value: "dd_mm", label: "DD/MM" },
                { value: "mm_dd", label: "MM/DD" },
              ],
              mode: "dropdown",
            },
          },
          condition: { name: "show_date", value: true },
        },
        { name: "size", selector: { number: { min: 50, max: 1000 } } },
        {
          name: "time_format",
          selector: {
            select: {
              options: [
                { value: "24", label: "24-hour" },
                { value: "12", label: "12-hour" },
              ],
              mode: "dropdown",
            },
          },
        },
        { name: "show_background", selector: { boolean: {} } },
        {
          name: "background_color",
          selector: { text: {} },
          condition: { name: "show_background", value: true },
        },
        { name: "number_color", selector: { text: {} } },
        {
          name: "background_shape",
          selector: {
            select: {
              options: [
                { value: "square", label: "Square" },
                { value: "circle", label: "Circle" },
              ],
              mode: "dropdown",
            },
          },
          condition: { name: "show_background", value: true },
        },
        actionSchema("tap_action", "Tap action"),
        actionSchema("hold_action", "Hold action"),
        actionSchema("double_tap_action", "Double tap action"),
      ],

      computeLabel: (schema) => {
        const labels = {
          show_date: "Show date",
          date_format: "Date format",
          size: "Size (px)",
          time_format: "Time format",
          show_background: "Show background",
          background_color: "Background color",
          number_color: "Number color",
          background_shape: "Background shape",
          tap_action: "Tap action",
          hold_action: "Hold action",
          double_tap_action: "Double tap action",
          action: "Action",
          entity: "Entity",
          navigation_path: "Navigation path",
          navigation_replace: "Replace history entry",
          url_path: "URL",
          perform_action: "Service (e.g. media_player.media_play_pause)",
          pipeline_id: "Pipeline ID",
          start_listening: "Start listening",
          confirmation: "Require confirmation",
        };
        return labels[schema.name];
      },

      computeHelper: (schema) => {
        const helpers = {
          size: "Clock diameter in pixels (recommended 100–400).",
          date_format: "Locale-aware or fixed DD/MM and MM/DD formats.",
          time_format: "24-hour or 12-hour clock display.",
          show_background: "Enable or disable background fill.",
          background_color: "CSS color value (e.g. #111111, rgba(0,0,0,0.4)).",
          number_color: "CSS color for numbers/date (e.g. #ffffff, var(--primary-text-color)).",
          background_shape: "Square or circle background.",
          navigation_path: "HA path (e.g. /lovelace/0) or any URL path.",
          navigation_replace: "Replace the current history entry instead of pushing a new one.",
          url_path: "Full URL to open (e.g. https://example.com).",
          perform_action: "Domain.service to call (e.g. media_player.media_play_pause).",
          pipeline_id: "Assist pipeline: last_used, preferred, or a pipeline id.",
          start_listening: "Automatically start voice input when Assist opens.",
          confirmation: "Show a confirmation dialog before performing the action.",
          entity: "Entity to target or show more info for.",
        };
        return helpers[schema.name];
      },

      assertConfig: (config) => {
        if (config.size !== undefined) {
          if (typeof config.size !== "number") throw new Error("Size must be a number");
          if (config.size < 50 || config.size > 1000) throw new Error("Size must be between 50 and 1000");
        }
        if (config.show_date !== undefined && typeof config.show_date !== "boolean")
          throw new Error("show_date must be a boolean");
        if (config.date_format !== undefined) {
          if (!["locale", "dd_mm", "mm_dd"].includes(config.date_format))
            throw new Error("date_format must be 'locale', 'dd_mm', or 'mm_dd'");
        }
        if (config.time_format !== undefined) {
          if (!["24", "12"].includes(config.time_format))
            throw new Error("time_format must be '24' or '12'");
        }
        if (config.show_background !== undefined && typeof config.show_background !== "boolean")
          throw new Error("show_background must be a boolean");
        if (config.background_color !== undefined && typeof config.background_color !== "string")
          throw new Error("background_color must be a string");
        if (config.number_color !== undefined && typeof config.number_color !== "string")
          throw new Error("number_color must be a string");
        if (config.background_shape !== undefined) {
          if (!["square", "circle"].includes(config.background_shape))
            throw new Error("background_shape must be 'square' or 'circle'");
        }

        const validActions = ["none", "more-info", "toggle", "navigate", "url", "perform-action", "assist"];
        for (const key of ["tap_action", "hold_action", "double_tap_action"]) {
          const a = config[key];
          if (a === undefined) continue;
          if (typeof a !== "object") throw new Error(`${key} must be an object`);
          if (a.action !== undefined && !validActions.includes(a.action))
            throw new Error(`${key}.action must be one of: ${validActions.join(", ")}`);
          if (a.action === "navigate" && a.navigation_path !== undefined && typeof a.navigation_path !== "string")
            throw new Error(`${key}.navigation_path must be a string`);
          if (a.action === "url" && a.url_path !== undefined && typeof a.url_path !== "string")
            throw new Error(`${key}.url_path must be a string`);
          if (a.action === "perform-action" && a.perform_action !== undefined && typeof a.perform_action !== "string")
            throw new Error(`${key}.perform_action must be a string`);
        }
      },
    };
  }
}

if (!customElements.get("clock-card")) {
  customElements.define("clock-card", ClockCard);
}
window.customCards = window.customCards || [];
window.customCards.push({
  type: "clock-card",
  name: "Clock Card",
  preview: true,
  description: "Clock card with optional date, configurable size, and customizable colors",
});