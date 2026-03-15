# Garden Planner

A client-side gardening calendar with local weather forecasts, planting schedules, and a garden journal. No backend, no accounts — runs entirely in the browser.

**[Open the app](https://klauseduard.github.io/garden-planner/gardening_calendar.html)**

## Features

### Weather & Location
- 16-day weather forecast via [Open-Meteo](https://open-meteo.com/) (no API key needed)
- Current conditions with temperature, wind speed, and Beaufort scale labels
- Interactive hourly temperature sparklines with click-to-expand detail
- Configurable units: temperature (°C/°F), precipitation (mm/in), wind (m/s, km/h, mph)
- Köppen climate zone detection with manual override
- Contextual alerts (frost risk, heat stress, rain)

### Planting Schedule
- Curated plant and task lists for spring growing periods (April, May, Early June)
- Categories: direct sowing, seedlings, transplanting, greenhouse, garden tasks
- Checkbox tracking for selected plants and tasks
- Custom periods, plants, and tasks — create your own and reorder freely
- Filter to quickly find specific plants or tasks
- Import/export custom data as JSON

### Garden Journal
- Log entries by type: planting, garden care, harvest, observation, maintenance
- Photo attachments stored locally (IndexedDB)
- Harvest metrics (weight, quantity)
- Weather auto-captured with each entry
- Three view modes: timeline, photo gallery, calendar
- Full import/export (with or without photos)

### AI Garden Assistant
- Generates a detailed prompt with your location, weather, climate zone, and selected plants
- One-click copy or direct links to ChatGPT, Claude, Gemini, Copilot

## Tech Stack

- Vanilla HTML/CSS/JavaScript (ES6 modules)
- No build step, no dependencies, no framework
- localStorage + IndexedDB for persistence
- Hosted on GitHub Pages

## Also included

- **[Külvikalender](https://klauseduard.github.io/garden-planner/külvikalender.html)** — a compact Estonian-language sowing calendar (standalone)

## License

[MIT](LICENSE)
