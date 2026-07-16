# Clock Card for Home Assistant

A sleek, modern digital clock card for Home Assistant featuring a smooth, animated radial seconds ring.

<img width="630" height="481" alt="Preview image" src="https://github.com/user-attachments/assets/72580420-536b-4795-b794-cdc7bb153c82" />

## Features
- **Real-time Digital Clock:** 24-hour or 12-hour format.
- **Animated Seconds Ring:** A smooth, radial progress bar that fills as the minute progresses.
- **Configurable Date Display:** Toggle date visibility and choose format `Browser`, `DD/MM`, or `MM/DD`.
- **Flexible Styling:** Configure size, number color, background color, and background shape (`square` or `circle`).
- **Background Toggle:** Disable background entirely for transparent mode.
- **UI Editor Support:** All options are available in the Home Assistant card editor.
- **Visibility Reporting:** Optionally toggle an `input_boolean` while the card is on screen — useful for detecting which dashboard view is currently displayed (e.g. from Node-RED).
- **Lightweight:** Pure JavaScript/CSS with no external dependencies.

## Installation

### Method 1: HACS (Recommended)
1. Open **HACS** in your Home Assistant.
2. Go to **Frontend**.
3. Click the **3 dots** (top right) and select **Custom repositories**.
4. Paste the URL of this repository: `https://github.com/Gabelica/clock-card`
5. Select **Dashboard** as the type and click **Add**.
6. Find the **Clock Card** in the list and click **Download**.

### Method 2: Manual
1. Download `clock-card.js` from this repository.
2. Upload it to your `/config/www/` directory.
3. Add the resource reference in **Settings > Dashboards > Resources**:
   - **URL:** `/local/clock-card.js`
   - **Type:** `JavaScript Module`

## Configuration

Add the card to your dashboard using the UI or YAML:

```yaml
type: custom:clock-card
show_date: true
date_format: locale # locale | dd_mm | mm_dd
time_format: "24" # "24" | "12"
size: 300
show_background: true
background_shape: circle # square | circle
background_color: "rgba(0, 0, 0, 0.55)"
number_color: "#f1f1f1"
report_entity: input_boolean.clock_view_active # optional, turned on while the card is mounted
```

## Development

### Local Development Workflow

1. Edit `clock-card.js`.
2. Use `preview.html` for quick local testing of card options.
   - Open it directly in your browser or with [VSCode live server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer).
3. Test in Home Assistant using HACS install or manual install.

### Releasing Updates (HACS)

HACS detects updates from tags/releases

For every release:

1. Commit and push your changes.
2. Create a new version tag (example `v0.0.1`).
3. Push the tag.
4. Create a GitHub Release from that tag.

Example:

```bash
git add .
git commit -m "release: v0.0.1"
git push
git tag v0.0.1
git push origin v0.0.1
```

## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes and test with `preview.html` and Home Assistant.
4. Open a Pull Request with a clear summary of changes.

## License

This project is open source and licensed under the MIT License.

See `LICENSE` for details.
