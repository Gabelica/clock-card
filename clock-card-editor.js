class ClockCardEditor extends HTMLElement {
  setConfig(config) {
    this.config = Object.assign({ show_date: true, size: 300 }, config || {});
    this.render();
  }

  connectedCallback() {
    if (!this._initialized) {
      this.render();
      this._initialized = true;
    }
  }

  render() {
    const cfg = this.config || { show_date: true, size: 300 };
    this.innerHTML = `
      <div style="padding:12px; display:flex; flex-direction:column; gap:8px;">
        <label style="display:flex; align-items:center; gap:8px;">
          <input type="checkbox" id="showDate" ${cfg.show_date ? "checked" : ""} />
          <span>Show date</span>
        </label>
        <label style="display:flex; align-items:center; gap:8px;">
          <span>Size</span>
          <input type="number" id="size" value="${cfg.size}" min="50" max="1000" style="width:100px;" />
        </label>
      </div>
    `;

    this.querySelector("#showDate").addEventListener("change", () => this._valueChanged());
    this.querySelector("#size").addEventListener("input", () => this._valueChanged());
  }

  _valueChanged() {
    const newConfig = Object.assign({}, this.config, {
      show_date: this.querySelector("#showDate").checked,
      size: Number(this.querySelector("#size").value),
    });
    this._fire("config-changed", { config: newConfig });
  }

  _fire(type, detail) {
    const ev = new Event(type, { bubbles: true, composed: true });
    ev.detail = detail;
    this.dispatchEvent(ev);
  }
}

customElements.define("clock-card-editor", ClockCardEditor);
