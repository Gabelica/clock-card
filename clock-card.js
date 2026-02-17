const DEFAULT_CONFIG = {
  show_date: true,
  size: 300,
  time_format: "24",
  show_background: false,
  background_color: "transparent",
  number_color: "var(--primary-text-color)",
  background_shape: "square",
};

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
    this.config = Object.assign({}, DEFAULT_CONFIG, config || {});
    if (this.content) {
      this._applyConfig();
    }
  }

  _applyConfig() {
    if (!this.config || !this.content) return;

    this.style.setProperty("--clock-size", `${this.config.size}px`);
    this.style.setProperty(
      "--clock-background-color",
      this.config.show_background
        ? this.config.background_color
        : "transparent",
    );
    this.style.setProperty("--clock-number-color", this.config.number_color);
    this.style.setProperty(
      "--clock-background-radius",
      this.config.background_shape === "circle" ? "50%" : "0",
    );

    if (this.dateDisplay) {
      if (this.config.show_date) {
        this.dateDisplay.classList.remove("hidden");
      } else {
        this.dateDisplay.classList.add("hidden");
      }
    }
    if (this.timeDisplay) {
      this.timeDisplay.classList.toggle(
        "twelve-hour",
        this.config.time_format === "12"
      );
    }
  }

  init() {
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
  }

  updateClock() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const format12h = this.config && this.config.time_format === "12";
    const rawHours = now.getHours();
    const hours = format12h
      ? String(((rawHours + 11) % 12) + 1).padStart(2, "0")
      : String(rawHours).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const meridiem = rawHours >= 12 ? "PM" : "AM";
    const seconds = now.getSeconds();

    if (this.timeDisplay && this.timeMain && this.timeMeridiem) {
      if (format12h) {
        this.timeMain.textContent = `${hours}:${minutes}`;
        this.timeMeridiem.textContent = meridiem;
        this.timeMeridiem.classList.remove("hidden");
      } else {
        this.timeMain.textContent = `${hours}:${minutes}`;
        this.timeMeridiem.classList.add("hidden");
      }
    }
    if (this.dateDisplay) {
      this.dateDisplay.innerText = `${month}/${day}`;
    }
    if (this.secondsRing) {
      const r = 140;
      const c = 2 * Math.PI * r;

      this.secondsRing.style.strokeDasharray = c;

      if (seconds === 0) {
        this.secondsRing.style.transition = "stroke-dashoffset 1s linear";
        this.secondsRing.style.strokeDashoffset = 0;
        if (this.ringResetTimeout) {
          clearTimeout(this.ringResetTimeout);
        }
        this.ringResetTimeout = setTimeout(() => {
          this.secondsRing.style.transition = "none";
          this.secondsRing.style.strokeDashoffset = c;
          this.ringResetTimeout = null;
        }, 950);
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
    if (this.ringResetTimeout) {
      clearTimeout(this.ringResetTimeout);
      this.ringResetTimeout = null;
    }
  }

  getCardSize() {
    return 3;
  }

  static getStubConfig() {
    return Object.assign({}, DEFAULT_CONFIG);
  }

  static getConfigForm() {
    return {
      schema: [
        { name: "show_date", selector: { boolean: {} } },
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
      ],
      computeLabel: (schema) => {
        if (schema.name === "show_date") return "Show date";
        if (schema.name === "size") return "Size (px)";
        if (schema.name === "time_format") return "Time format";
        if (schema.name === "show_background") return "Show background";
        if (schema.name === "background_color") return "Background color";
        if (schema.name === "number_color") return "Number color";
        if (schema.name === "background_shape") return "Background shape";
        return undefined;
      },
      computeHelper: (schema) => {
        if (schema.name === "size")
          return "Clock diameter in pixels (recommended 100-400).";
        if (schema.name === "time_format")
          return "Choose between 24-hour and 12-hour clock display.";
        if (schema.name === "show_background")
          return "Enable or disable background fill.";
        if (schema.name === "background_color")
          return "CSS color value (example: #111111, rgba(0,0,0,0.4), transparent).";
        if (schema.name === "number_color")
          return "CSS color value for clock numbers/date (example: #ffffff, var(--primary-text-color)).";
        if (schema.name === "background_shape")
          return "Choose whether the background is a square or full circle.";
        return undefined;
      },
      assertConfig: (config) => {
        if (config.size !== undefined) {
          if (typeof config.size !== "number") {
            throw new Error("Size must be a number");
          }
          if (config.size < 50 || config.size > 1000) {
            throw new Error("Size must be between 50 and 1000");
          }
        }
        if (config.show_date !== undefined) {
          if (typeof config.show_date !== "boolean") {
            throw new Error("Show date must be a boolean");
          }
        }
        if (config.time_format !== undefined) {
          if (typeof config.time_format !== "string") {
            throw new Error("Time format must be a string");
          }
          if (config.time_format !== "24" && config.time_format !== "12") {
            throw new Error("Time format must be '24' or '12'");
          }
        }
        if (config.show_background !== undefined) {
          if (typeof config.show_background !== "boolean") {
            throw new Error("Show background must be a boolean");
          }
        }
        if (
          config.background_color !== undefined &&
          typeof config.background_color !== "string"
        ) {
          throw new Error("Background color must be a string");
        }
        if (
          config.number_color !== undefined &&
          typeof config.number_color !== "string"
        ) {
          throw new Error("Number color must be a string");
        }
        if (config.background_shape !== undefined) {
          if (typeof config.background_shape !== "string") {
            throw new Error("Background shape must be a string");
          }
          if (
            config.background_shape !== "square" &&
            config.background_shape !== "circle"
          ) {
            throw new Error("Background shape must be 'square' or 'circle'");
          }
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
  description:
    "Clock card with optional date, configurable size, and customizable colors",
});
