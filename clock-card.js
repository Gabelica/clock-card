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
    this.config = Object.assign({ show_date: true, size: 300 }, config || {});
    if (this.content) {
      this._applyConfig();
    }
  }

  _applyConfig() {
    if (!this.config || !this.content) return;

    this.content.style.setProperty("--clock-size", `${this.config.size}px`);
    this.style.setProperty("--clock-size", `${this.config.size}px`);

    if (this.dateDisplay) {
      if (this.config.show_date) {
        this.dateDisplay.classList.remove("hidden");
      } else {
        this.dateDisplay.classList.add("hidden");
      }
    }
  }

  init() {
    this.innerHTML = `
      <style>
        ha-card {
          background: transparent;
          box-shadow: none;
          border: none;
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          margin: auto;
        }
        .clock-text {
          position: absolute;
          font-size: calc(var(--clock-size, 300px) * 0.3);
          font-weight: bold;
          color: var(--primary-text-color);
          z-index: 2;
          font-family: var(--paper-font-headline_-_font-family);
        }
        .date-text {
          position: absolute;
          top: 65%;
          font-size: calc(var(--clock-size, 300px) * 0.1);
          color: var(--primary-text-color);
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
        <div class="clock-text" id="time-display">--:--</div>
        <div class="date-text" id="date-display"></div>
        <svg viewBox="0 0 300 300">
          <circle cx="150" cy="150" r="140" class="bg-ring" />
          <circle cx="150" cy="150" r="140" class="active-ring" id="seconds-ring" />
        </svg>
      </ha-card>
    `;
    this.content = this.querySelector("ha-card");
    this.timeDisplay = this.querySelector("#time-display");
    this.dateDisplay = this.querySelector("#date-display");
    this.secondsRing = this.querySelector("#seconds-ring");
  }

  updateClock() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = now.getSeconds();

    if (this.timeDisplay) {
      this.timeDisplay.innerText = `${hours}:${minutes}`;
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
        setTimeout(() => {
          this.secondsRing.style.transition = "none";
          this.secondsRing.style.strokeDashoffset = c;
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
  }

  getCardSize() {
    return 3;
  }

  static getStubConfig() {
    return { show_date: true, size: 300 };
  }

  static getConfigForm() {
    return {
      schema: [
        { name: "show_date", selector: { boolean: {} } },
        { name: "size", selector: { number: { min: 50, max: 1000 } } },
      ],
      computeLabel: (schema) => {
        if (schema.name === "show_date") return "Show date";
        if (schema.name === "size") return "Size (px)";
        return undefined;
      },
      computeHelper: (schema) => {
        if (schema.name === "size")
          return "Clock diameter in pixels (recommended 100-400).";
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
      },
    };
  }
}

customElements.define("clock-card", ClockCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "custom:clock-card",
  name: "Clock Card",
  preview: true,
  description: "Clock card with optional date and configurable size",
});
