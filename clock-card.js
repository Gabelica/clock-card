class ClockCard extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (!this.content) {
      this.init();
    }
    this.updateClock();
  }

  setConfig(config) {
    this.config = Object.assign({ show_date: true, size: 300 }, config || {});

    if (this.content) {
      this.content.style.setProperty("--clock-size", `${this.config.size}px`);
      if (this.dateDisplay)
        this.dateDisplay.style.display = this.config.show_date
          ? "block"
          : "none";
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
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .clock-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: calc(var(--clock-size, 300px) * 0.3);
          font-weight: bold;
          color: var(--primary-text-color);
          z-index: 2;
          text-align: center;
          font-family: var(--paper-font-headline_-_font-family);
        }
        .date-text {
          position: absolute;
          top: 70%;
          left: 50%;
          transform: translateX(-50%);
          font-size: calc(var(--clock-size, 300px) * 0.15);
          color: var(--primary-text-color);
          z-index: 2;
          text-align: center;
          opacity: 0.95;
        }
        .date-text {
          position: absolute;
          font-size: 2rem;
          font-weight: bold;
          color: var(--primary-text-color);
          z-index: 1;
          font-family: var(--paper-font-headline_-_font-family);
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
    };
  }

  static getConfigElement() {
    const tag = "clock-card-config";

    if (!customElements.get(tag)) {
      class ClockCardConfig extends HTMLElement {
        setConfig(config) {
          this._config = Object.assign(
            { show_date: true, size: 300 },
            config || {},
          );
          this.render();
        }

        set hass(hass) {
          this._hass = hass;
        }

        set lovelace(lovelace) {
          this._lovelace = lovelace;
        }

        render() {
          const cfg = this._config || { show_date: true, size: 300 };
          this.innerHTML = `
            <div style="padding:12px; display:flex; flex-direction:column; gap:8px;">
              <label style="display:flex; align-items:center; gap:8px;">
                <input type="checkbox" id="showDate" ${cfg.show_date ? "checked" : ""} />
                <span>Show date</span>
              </label>
              <label style="display:flex; align-items:center; gap:8px;">
                <span>Size (px)</span>
                <input type="number" id="size" value="${cfg.size}" min="50" max="1000" style="width:100px;" />
              </label>
            </div>
          `;

          this.querySelector("#showDate").addEventListener("change", () =>
            this._valueChanged(),
          );
          this.querySelector("#size").addEventListener("input", () =>
            this._valueChanged(),
          );
        }

        _valueChanged() {
          const newConfig = Object.assign({}, this._config, {
            show_date: this.querySelector("#showDate").checked,
            size: Number(this.querySelector("#size").value),
          });
          const ev = new Event("config-changed", {
            bubbles: true,
            composed: true,
          });
          ev.detail = { config: newConfig };
          this.dispatchEvent(ev);
        }
      }

      customElements.define(tag, ClockCardConfig);
    }

    return document.createElement(tag);
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
