# Clock Card for Home Assistant

A sleek, modern digital clock card for Home Assistant featuring a smooth, animated radial seconds ring.

![Clock Card Preview]() 

## Features
- **Real-time Digital Clock:** Large, readable HH:MM display.
- **Animated Seconds Ring:** A smooth, radial progress bar that fills as the minute progresses.
- **Zero Configuration:** Works out of the box with your browser's local time.
- **Lightweight:** Pure JavaScript/CSS with no external dependencies.
- **HACS Ready:** Easy installation and updates.

## Installation

### Method 1: HACS (Recommended)
1. Open **HACS** in your Home Assistant.
2. Go to **Frontend**.
3. Click the **3 dots** (top right) and select **Custom repositories**.
4. Paste the URL of this repository: `https://github.com/Gabelica/clock-card`
5. Select **Lovelace** as the category and click **Add**.
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
```
