# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Garden Planner — a client-side-only gardening calendar SPA built with vanilla ES6 modules. No build system, no npm, no framework. Served as static files via GitHub Pages.

**Entry points:**
- `gardening_calendar.html` — main English app (`<script type="module" src="gardening_calendar/js/main.js">`)
- `külvikalender.html` — standalone Estonian sowing calendar (inline JS, not connected to module system)

**Live:** https://klauseduard.github.io/garden-planner/gardening_calendar.html

## Running & Testing

No build step. Open HTML files directly or serve with any static server:
```bash
python3 -m http.server 8000
# then open http://localhost:8000/gardening_calendar.html
```

**Tests:** Open `tests/test-runner.html` in a browser. Custom inline test runner (no Jest/Mocha) with `describe()`/`it()`/`assert()` covering data.js and storage.js. Results render as pass/fail HTML.

## Architecture

### Module Graph

`main.js` orchestrates initialization in sequence, dispatching custom events (`dataModuleLoaded`, `journalModuleLoaded`, etc.) as milestones. All 11 modules live in `gardening_calendar/js/modules/`:

| Module | Responsibility |
|---|---|
| `data.js` | Translations (`translations.en`), plant/task database (`calendarData`), category icons/names |
| `storage.js` | All localStorage + IndexedDB read/write. Unit preferences, selections, journal, custom entries |
| `ui.js` | Modal/dialog factory (`showModal`, `showConfirmDialog`, `showNotification`), focus trap, a11y |
| `weather.js` | Open-Meteo forecast API, sparkline SVG rendering, unit conversion (temp/precip/wind), weather callout |
| `climate.js` | Köppen zone lookup from `koppen_grid_0.5deg.json`, frost date estimation |
| `calendar.js` | Period navigation, plant/task card grid rendering, selection badges, drag-to-reorder |
| `search.js` | Real-time text filter + highlight across built-in and custom entries |
| `journal.js` | CRUD for journal entries, 3 views (timeline/gallery/calendar), JSON export/import |
| `custom-entries.js` | User-defined plants/tasks — modal forms, validation, runtime `calendarData` mutation |
| `photo-storage.js` | IndexedDB photo management, image compression (800px max, JPEG 0.7), localStorage migration |
| `social.js` | Share buttons (Facebook, Twitter/X, email, Web Share API) |

### Global State

```javascript
window.GardeningApp = { activeMonth, currentLang, modules: {...}, state: {...} }
```

Modules use this shared container instead of deep prop-drilling.

### Data Flow Patterns

**Location → Weather → Climate:** User sets location → Open-Meteo geocoding → `fetchWeatherData(lat, lon)` → `showClimateZone(lat, lon)` with Köppen grid lookup → UI renders forecast + climate zone + frost dates.

**Plant selection:** Checkbox toggle → `storage.toggleItemSelection()` → localStorage update → badge count refresh.

**Journal entry:** Form submit → photo compression → IndexedDB write → localStorage entry with auto-captured weather → all 3 views re-render.

### Storage

**localStorage keys** (all prefixed `gardening_`): `selected_items`, `journal_entries`, `custom_entries`, `last_location`, `temp_unit`, `precip_unit`, `wind_unit`, `climate_zone_override`, `language`.

**IndexedDB** (`GardenPlannerDB`): `photos` object store keyed by entry ID.

### External APIs (no auth required)

- **Open-Meteo Forecast:** `api.open-meteo.com/v1/forecast` — 16-day forecast with hourly temp, precip, wind, soil temp
- **Open-Meteo Geocoding:** `geocoding-api.open-meteo.com/v1/search` — location name → coordinates

## CSS

Single file: `gardening_calendar/styles.css` (~2900 lines). "Botanical Almanac" design system.

**Key variables:** `--bg-cream`, `--surface`, `--forest` (green), `--terracotta` (orange CTA), `--sage`, `--border`, `--highlight`.
**Typography:** Playfair Display (headings) + Source Sans 3 (body) via Google Fonts.
**Breakpoints:** `768px` — below = mobile (bottom nav, card layout), above = desktop (header nav, table layout).

## Conventions

- 4-space indentation, single quotes, camelCase functions, UPPERCASE constants
- JSDoc on exported functions
- Plant data objects carry bilingual names: `{ en: "carrot", et: "porgand" }`
- Weather temperatures stored in Celsius internally, converted for display via `convertTemp()`
- Soil temperature color thresholds always evaluate in Celsius (`getSoilTemperatureColor`)
- `i18n` infrastructure exists (`translations` object, `currentLang`) but only English UI is active
