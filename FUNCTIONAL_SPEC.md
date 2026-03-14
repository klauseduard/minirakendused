# Gardening Calendar App - Functional Specification

Extracted from the existing codebase as a product requirements baseline.

---

## 1. Overview

A single-page web application for planning garden activities. Runs as static HTML/JS/CSS on GitHub Pages with no backend, no build system, and no framework dependencies. All user data is stored in the browser's localStorage.

**Live URL:** https://klauseduard.github.io/minirakendused/gardening_calendar.html

---

## 2. Feature Specifications

### 2.1 Location & Geolocation

**Purpose:** Determine the user's location for weather and climate zone lookup.

**Inputs:**
- Text search by city/place name (geocoded via Open-Meteo Geocoding API)
- Browser geolocation ("My Location" button)

**Behavior:**
- Location is persisted in localStorage as `gardening_last_location`
- On app load, the last-used location is automatically restored and weather is fetched
- Location display shows: name, admin regions, country, lat/lon coordinates

**External API:** `https://geocoding-api.open-meteo.com/v1/search`

### 2.2 Weather Forecast

**Purpose:** Show current conditions and 16-day forecast for the user's location.

**Data displayed:**
- Current weather: condition icon, temperature, wind speed
- 16-day daily forecast table with columns:
  - Date
  - Night min/max temperature (hours 21-23, 0-5)
  - Day min/max temperature (hours 6-20)
  - Precipitation sum
  - Weather condition (icon + text)
  - Temperature sparkline (SVG, 24-hour curve with morning/noon/evening dots)

**Interactions:**
- Hover over sparkline shows tooltip with hourly temp, precip, wind
- Click sparkline opens modal with full 24-hour hourly detail table
- Temperature color-coded: blue (cold) through green (mild) to red (hot)

**Unit preferences (persisted):**
- Temperature: Celsius / Fahrenheit
- Precipitation: mm / inches

**External API:** `https://api.open-meteo.com/v1/forecast` (free, no auth required)

**WMO weather codes mapped:** 0-99 with icons, text descriptions, and color themes for clear/cloud/fog/rain/snow/storm conditions.

### 2.3 Köppen Climate Zone Detection

**Purpose:** Identify the user's climate zone for gardening context.

**Data source:** `koppen_grid_0.5deg.json` - global grid at 0.5-degree resolution.

**Behavior:**
- Automatically detected when location is set
- Displays zone code and description
- User can manually override the detected zone
- Override persisted in localStorage as `gardening_climate_zone_override`

### 2.4 Planting Schedule (Calendar)

**Purpose:** Show recommended plants and tasks organized by growing period.

**Structure:**
- 3 fixed growing periods: April, May, Early June
- 5 built-in categories per period:
  - Direct Sowing
  - Starting Seedlings (April only)
  - Transplanting (May and Early June only)
  - Greenhouse
  - Garden Tasks
- 2 custom categories: My Custom Plants, My Custom Tasks

**Plant data:**
- Each plant entry has English (`en`) and Estonian (`et`) translations
- ~100+ plants/tasks across all periods
- Plant data is hardcoded in `data.js` (not fetched from API)

**Interactions:**
- Each plant/task has a checkbox for tracking
- "Select All" checkbox per category
- Selections persisted in localStorage as `gardening_selected_items`, organized by month > category
- Month tab buttons switch the displayed period

### 2.5 Custom Entries

**Purpose:** Let users add their own plants and tasks to the calendar.

**Custom Plant fields:** name, description (optional), category, month(s)
**Custom Task fields:** name, description (optional), month(s)

**Operations:** Create, Read, Update, Delete
- Each entry gets a unique ID (`plant_<timestamp>` or `task_<timestamp>`)
- Creation/update timestamps tracked
- Custom entries appear in the calendar alongside built-in entries (marked with edit/delete buttons)
- Persisted in localStorage as `gardening_custom_entries`

**Import/Export:**
- Export: downloads JSON file with timestamp in filename
- Import: file upload with two modes:
  - **Merge:** add new entries, update existing by ID
  - **Replace All:** clear all existing, use imported data
- Imported entries are validated for basic structure

### 2.6 Garden Journal

**Purpose:** Record gardening activities with text, photos, and metadata.

**Entry fields:**
- Date (required)
- Type (required): Planting, Garden Care, Harvest, Observation, Maintenance
- Plants (comma-separated, optional)
- Location in garden (optional)
- Notes (free text)
- Photos (multiple, via file upload)
- Harvest-specific: weight, quantity (shown only when type = Harvest)

**Views:**
- **Timeline:** chronological list of entries
- **Photo Gallery:** grid of entry photos
- **Calendar:** entries shown on a month calendar grid

**Photo handling:**
- Photos stored as base64 in localStorage (via `gardening_journal_entries`)
- Image compression applied: max width 800px, JPEG quality 0.7

**Import/Export:**
- Export options:
  - **Complete:** includes base64 images (larger file)
  - **Lightweight:** text-only, no images
- Import with merge/replace options (same as custom entries)

**Mobile-specific:**
- Floating Action Button (FAB) for quick "Add Entry"
- Dropdown selector for views (replaces tabs)
- More menu (vertical dots) for export/import

### 2.7 AI Prompt Generator

**Purpose:** Generate context-rich prompts for external AI assistants with gardening advice.

**Prompt includes:**
- Current date and season
- Location and climate zone
- Current weather conditions
- 7-day forecast summary
- Selected plants from calendar (optional, togglable)
- Weather suitability filter (optional): excludes cold-sensitive plants when min temp < 10C, heat-sensitive when max > 30C, moisture-sensitive when avg precip > 10mm
- User's custom notes

**Prompt output asks AI for:**
1. Immediate weekly tasks
2. What to plant now
3. Weather-related precautions
4. Long-term planning suggestions
5. Care instructions for selected plants (or general tips)

**Distribution:**
- Copy to clipboard
- Direct links to: ChatGPT, Claude, Gemini, Copilot (opens in new tab with prompt pre-filled where the AI supports URL parameters)

### 2.8 Search

**Purpose:** Filter calendar plants and tasks by text query.

**Behavior:**
- Real-time filtering as user types
- Searches across all categories in the active month
- Matching text highlighted with yellow background
- Works on both built-in and custom entries

### 2.9 Social Sharing

**Purpose:** Share the app or individual journal entries on social media.

**Channels:** Facebook, Twitter/X, Email, native Web Share API (mobile)

**Placement:** Footer area, journal entry view modal

### 2.10 Navigation

**Desktop:**
- Quick-jump menu in header: Location, Weather, Search & AI, Schedule, Journal
- Clicking Journal hides all other sections and shows journal full-screen
- Clicking any other nav item shows all sections and scrolls to target

**Mobile (viewport <= 600px):**
- Bottom navigation bar: Weather, Schedule, Journal, AI Helper
- Same show/hide behavior for Journal
- Header hidden to save space
- Scroll-to-top button hidden (bottom nav provides navigation)

### 2.11 Analytics

- Google Analytics (gtag.js) with tracking ID `G-ZFD132PZ0Z`
- Events tracked: prompt generation, AI assistant selection, unit preference changes

---

## 3. Data Architecture

### 3.1 localStorage Keys

| Key | Type | Content |
|-----|------|---------|
| `gardening_selected_items` | Object | `{ month: { category: [items] } }` |
| `gardening_journal_entries` | Array | Journal entries with base64 photos |
| `gardening_custom_entries` | Object | `{ plants: [...], tasks: [...] }` |
| `gardening_last_location` | Object | `{ type, lat, lon, locationName }` |
| `gardening_temp_unit` | String | `"C"` or `"F"` |
| `gardening_precip_unit` | String | `"mm"` or `"in"` |
| `gardening_language` | String | `"en"` (only English currently active) |
| `gardening_climate_zone_override` | String | Köppen zone code |

### 3.2 External Dependencies

| Service | URL | Auth | Purpose |
|---------|-----|------|---------|
| Open-Meteo Forecast | `api.open-meteo.com/v1/forecast` | None | Weather data |
| Open-Meteo Geocoding | `geocoding-api.open-meteo.com/v1/search` | None | Location lookup |
| Google Analytics | `googletagmanager.com` | Config ID | Usage tracking |

### 3.3 Static Data Files

| File | Purpose |
|------|---------|
| `koppen_grid_0.5deg.json` | Köppen climate zone grid |

---

## 4. Multi-language Support

**Current state:** English only (translations structure exists for Estonian `et` but only plant names have Estonian translations; UI strings are English only).

The data model supports bilingual plant names (`{en: "carrot", et: "porgand"}`), but there is no language switcher in the UI.

---

## 5. Responsive Design

| Breakpoint | Behavior |
|------------|----------|
| > 600px | Desktop layout: horizontal quick-jump nav, side-by-side form fields, full tab bar for journal views |
| <= 600px | Mobile layout: bottom nav bar, stacked controls, FAB button, dropdown for journal views, hidden header |

---

## 6. Accessibility Features

- Focus trapping in modals (Tab/Shift+Tab cycling)
- Escape key closes modals
- ARIA labels on buttons and form inputs
- `role="dialog"` and `aria-modal="true"` on dynamic modals
- Visually hidden labels for screen readers
- `<caption>` on forecast table (visually hidden)
- Click-outside-to-close on all modals
