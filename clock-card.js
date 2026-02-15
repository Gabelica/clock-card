class ClockCard extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (!this.content) {
      this.init();
    }
    this.updateClock();
  }

  setConfig(config) {
    this.config = config;
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
          font-size: 20cqw;
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
        <svg viewBox="0 0 300 300">
          <circle cx="150" cy="150" r="140" class="bg-ring" />
          <circle cx="150" cy="150" r="140" class="active-ring" id="seconds-ring" />
        </svg>
      </ha-card>
    `;
    this.content = this.querySelector("ha-card");
    this.timeDisplay = this.querySelector("#time-display");
    this.secondsRing = this.querySelector("#seconds-ring");
  }

  updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = now.getSeconds();

    if (this.timeDisplay) {
      this.timeDisplay.innerText = `${hours}:${minutes}`;
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
}

customElements.define("clock-card", ClockCard);
