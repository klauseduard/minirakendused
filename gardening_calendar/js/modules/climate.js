/**
 * Climate Zone Module for Gardening Calendar
 * Handles climate zone determination and UI rendering.
 */

// Global variables for the module
let koppenGrid = null;
let userClimateZone = null;
let userClimateZoneOverride = null;
let userLat = null;

/**
 * Phase configuration: frost-relative timing for each built-in period.
 * Offsets are in weeks relative to last frost date (negative = before frost).
 */
const PHASE_CONFIG = {
    april:      { startWeeks: -8, endWeeks: -4 },
    may:        { startWeeks: -4, endWeeks: 0 },
    early_june: { startWeeks: 0,  endWeeks: 3 }
};

/**
 * Map Köppen first letter to a broad zone group name.
 * @param {string} koppenCode - Full Köppen code (e.g. 'Dfb', 'Cfa')
 * @returns {string|null} Zone group name or null if unknown
 */
export function getZoneGroup(koppenCode) {
    if (!koppenCode) return null;
    const letter = koppenCode.charAt(0).toUpperCase();
    const map = { A: 'tropical', B: 'arid', C: 'temperate', D: 'continental', E: 'polar' };
    return map[letter] || null;
}

/**
 * Get frost data for the current user location.
 * @returns {{ lastSpring: Date|null, firstAutumn: Date|null, label: string, confidence: string }|null}
 */
export function getUserFrostData() {
    if (userLat == null || !userClimateZone) return null;
    return estimateLastFrostDate(userLat, userClimateZone);
}

/**
 * Get calendar date range for a built-in period based on frost date.
 * @param {string} periodId - 'april', 'may', or 'early_june'
 * @returns {{ start: Date, end: Date, label: string }|null} Date range or null if unavailable
 */
export function getPhaseCalendarDates(periodId) {
    const config = PHASE_CONFIG[periodId];
    if (!config) return null;

    const frost = getUserFrostData();
    if (!frost || !frost.lastSpring) return null;

    const frostMs = frost.lastSpring.getTime();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const start = new Date(frostMs + config.startWeeks * weekMs);
    const end = new Date(frostMs + config.endWeeks * weekMs);

    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { start, end, label: `${fmt(start)} – ${fmt(end)}` };
}

/**
 * Initialize the climate zone module.
 * Loads Köppen climate classification grid data.
 */
export function initClimateZone() {
    console.log('Initializing climate zone module...');
    
    // Load the Köppen climate classification grid data
    fetch('gardening_calendar/data/koppen_grid_0.5deg.json')
        .then(response => response.json())
        .then(data => {
            koppenGrid = data;
            console.log('Köppen grid data loaded successfully');
            
            // Check for cached location
            const cached = localStorage.getItem('gardening_last_location');
            if (cached) {
                try {
                    const loc = JSON.parse(cached);
                    console.log(`Found cached location: ${JSON.stringify(loc)}`);
                    if (loc.type === 'coords' && loc.lat && loc.lon) {
                        console.log(`Showing climate zone for cached location: lat=${loc.lat}, lon=${loc.lon}`);
                        showClimateZone(loc.lat, loc.lon);
                    }
                } catch (e) {
                    console.error('Error processing cached location:', e);
                }
            }
        })
        .catch(error => {
            console.error('Error loading Köppen grid data:', error);
        });
        
    // Check for override
    const override = localStorage.getItem('gardening_climate_zone_override');
    if (override) {
        userClimateZoneOverride = override;
        userClimateZone = override;
    }
}

/**
 * Helper to round to nearest 0.25
 * @param {number|string} x - Value to round
 * @return {string} - Value rounded to nearest 0.25, with 2 decimal places
 */
export function round025(x) {
    // Ensure x is a number and round to either .25 or .75
    const num = typeof x === 'string' ? parseFloat(x) : x;
    const decimal = num % 1;
    const whole = Math.floor(num);
    let rounded;
    if (decimal < 0.375) {
        rounded = 0.25;
    } else if (decimal < 0.875) {
        rounded = 0.75;
    } else {
        rounded = 0.25;
        return (whole + 1 + rounded).toFixed(2);
    }
    return (whole + rounded).toFixed(2);
}

/**
 * Show climate zone information for the given coordinates
 * @param {number|string} lat - Latitude
 * @param {number|string} lon - Longitude
 */
export function showClimateZone(lat, lon) {
    console.log(`showClimateZone called with: lat=${lat}, lon=${lon}`);
    const climateZoneInfo = document.getElementById('climateZoneInfo');
    
    if (!koppenGrid) {
        console.error('Köppen grid data not loaded yet');
        climateZoneInfo.innerHTML = '';
        return;
    }
    
    // Check for override
    const override = localStorage.getItem('gardening_climate_zone_override');
    let lookupKey = '';
    let foundZone = '';
    if (override) {
        console.log(`Using override climate zone: ${override}`);
        userClimateZoneOverride = override;
        userClimateZone = override;
        lookupKey = '(override)';
        foundZone = override;
    } else {
        // Ensure lat and lon are numeric values
        const latNum = typeof lat === 'string' ? parseFloat(lat) : lat;
        const lonNum = typeof lon === 'string' ? parseFloat(lon) : lon;
        userLat = latNum;

        if (isNaN(latNum) || isNaN(lonNum)) {
            console.error(`Invalid coordinates: lat=${lat}, lon=${lon}`);
            climateZoneInfo.innerHTML = '';
            return;
        }
        
        console.log(`Processed coordinates: latNum=${latNum}, lonNum=${lonNum}`);
        
        const key = `${round025(latNum)} ${round025(lonNum)}`;
        console.log(`Looking up climate zone with key: ${key}`);
        
        // Try exact match first
        if (koppenGrid[key]) {
            userClimateZone = koppenGrid[key];
            lookupKey = key;
            foundZone = userClimateZone;
            console.log(`Found exact match: ${userClimateZone}`);
        } else {
            console.log(`No exact match found, searching for nearest...`);
            // Find nearest neighbor
            const roundedLat = round025(latNum);
            const roundedLon = round025(lonNum);
            let minDistance = Infinity;
            let nearestZone = null;
            let nearestKey = null;
            
            // Search in nearby coordinates (±1 degree should be enough)
            for (const gridKey in koppenGrid) {
                const [gridLat, gridLon] = gridKey.split(' ').map(Number);
                if (Math.abs(gridLat - roundedLat) <= 1 && Math.abs(gridLon - roundedLon) <= 1) {
                    const distance = Math.sqrt(
                        Math.pow(gridLat - roundedLat, 2) + 
                        Math.pow(gridLon - roundedLon, 2)
                    );
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestZone = koppenGrid[gridKey];
                        nearestKey = gridKey;
                    }
                }
            }
            
            if (nearestZone) {
                userClimateZone = nearestZone;
                lookupKey = `${key} (nearest: ${nearestKey}, dist: ${minDistance.toFixed(2)}°)`;
                foundZone = nearestZone;
                console.log(`Found nearest match: ${userClimateZone}, distance: ${minDistance.toFixed(2)}°`);
            } else {
                userClimateZone = 'Unknown';
                lookupKey = key;
                foundZone = 'Unknown';
                console.log(`No nearby climate zone found for coordinates`);
            }
        }
    }
    renderClimateZoneUI(lookupKey, foundZone);

    // Notify other modules that the climate zone has been determined/changed
    document.dispatchEvent(new CustomEvent('climateZoneUpdated', {
        detail: { zone: userClimateZone, zoneGroup: getZoneGroup(userClimateZone), lat: userLat }
    }));
}

/**
 * Render the climate zone UI with optional debug info
 * @param {string} lookupKey - The key used for lookup (for debugging)
 * @param {string} foundZone - The zone that was found
 */
export function renderClimateZoneUI(lookupKey = '', foundZone = '') {
    const climateZoneInfo = document.getElementById('climateZoneInfo');
    let html = '';
    if (userClimateZone) {
        html += `<div style="margin-top: 15px; padding: 10px 15px; background: var(--white); border-radius: 8px; box-shadow: 0 1px 3px var(--shadow);">`;
        html += `<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">`;
        html += `<strong>Climate zone:</strong> <span id="climateZoneCode" style="background: var(--light-bg); padding: 2px 8px; border-radius: 4px; font-family: monospace;">${userClimateZone}</span>`;
        html += `<a href="https://en.wikipedia.org/wiki/K%C3%B6ppen_climate_classification" target="_blank" style="color: var(--primary-color); text-decoration: none; font-size: 0.95em;">(What is this?)</a>`;
        html += `</div>`;

        // Frost date estimation
        if (userLat != null) {
            const frost = estimateLastFrostDate(userLat, userClimateZone);
            html += `<div class="frost-date-info">`;
            if (frost.lastSpring) {
                const now = new Date();
                const springDiff = Math.round((frost.lastSpring - now) / (1000 * 60 * 60 * 24 * 7));
                const autumnDiff = Math.round((frost.firstAutumn - now) / (1000 * 60 * 60 * 24 * 7));
                const springLabel = frost.lastSpring.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const autumnLabel = frost.firstAutumn.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                if (springDiff <= 0) {
                    html += `<div class="frost-date-row">❄️ Last frost: <strong>~${springLabel}</strong> <span class="frost-date-meta" style="color:var(--forest);">(Frost risk has passed)</span></div>`;
                } else {
                    html += `<div class="frost-date-row">❄️ Estimated last frost: <strong>~${springLabel}</strong> <span class="frost-date-meta" style="color:var(--terracotta);">(~${springDiff} weeks away)</span></div>`;
                }

                if (autumnDiff > 0) {
                    html += `<div class="frost-date-row">🍂 First autumn frost: <strong>~${autumnLabel}</strong> <span class="frost-date-meta">(~${autumnDiff} weeks away)</span></div>`;
                } else {
                    html += `<div class="frost-date-row">🍂 First autumn frost: <strong>~${autumnLabel}</strong> <span class="frost-date-meta">(has passed)</span></div>`;
                }
            } else {
                html += `<div class="frost-date-row">☀️ ${frost.label}</div>`;
            }
            html += `<div class="frost-date-disclaimer">Based on latitude; actual dates vary by elevation, microclimate, and year.</div>`;
            html += `</div>`;
        }

        html += `<div style="display: flex; align-items: center; gap: 10px;">`;
        html += `<label for="climateZoneOverride" style="font-size: 0.95em;">Override zone:</label>`;
        html += `<input id="climateZoneOverride" type="text" style="padding: 4px 8px; border: 1px solid var(--secondary-color); border-radius: 4px; width: 60px;" value="${userClimateZoneOverride || ''}" placeholder="e.g. Dfb">`;
        html += `<button id="setClimateZoneOverrideBtn" style="padding: 4px 10px; background: var(--secondary-color); color: white; border: none; border-radius: 4px; font-size: 0.95em; cursor: pointer;">Set</button>`;
        html += `<button id="clearClimateZoneOverrideBtn" style="padding: 4px 10px; background: var(--accent-color); color: white; border: none; border-radius: 4px; font-size: 0.95em; cursor: pointer;">Clear</button>`;
        html += `</div></div>`;
    }
    climateZoneInfo.innerHTML = html;

    // Add listeners
    const setBtn = document.getElementById('setClimateZoneOverrideBtn');
    const clearBtn = document.getElementById('clearClimateZoneOverrideBtn');
    if (setBtn) {
        setBtn.addEventListener('click', function() {
            const val = document.getElementById('climateZoneOverride').value.trim();
            if (val) {
                localStorage.setItem('gardening_climate_zone_override', val);
                userClimateZoneOverride = val;
                userClimateZone = val;
                renderClimateZoneUI();
                document.dispatchEvent(new CustomEvent('climateZoneUpdated', {
                    detail: { zone: val, zoneGroup: getZoneGroup(val), lat: userLat }
                }));
            }
        });
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            localStorage.removeItem('gardening_climate_zone_override');
            userClimateZoneOverride = null;
            // Recompute from location (showClimateZone dispatches the event)
            const cached = localStorage.getItem('gardening_last_location');
            if (cached) {
                try {
                    const loc = JSON.parse(cached);
                    if (loc.type === 'coords' && loc.lat && loc.lon) {
                        const latNum = typeof loc.lat === 'string' ? parseFloat(loc.lat) : loc.lat;
                        const lonNum = typeof loc.lon === 'string' ? parseFloat(loc.lon) : loc.lon;
                        showClimateZone(latNum, lonNum);
                        return;
                    }
                } catch (e) {}
            }
            renderClimateZoneUI();
            document.dispatchEvent(new CustomEvent('climateZoneUpdated', {
                detail: { zone: null, zoneGroup: null, lat: userLat }
            }));
        });
    }
}

/**
 * Get the current climate zone
 * @returns {string} The current climate zone
 */
export function getCurrentClimateZone() {
    return userClimateZone;
}

/**
 * Check if a specific climate zone override is set
 * @returns {string|null} The override value or null if not set
 */
export function getClimateZoneOverride() {
    return userClimateZoneOverride;
}

/**
 * Set a climate zone override
 * @param {string} zone - The climate zone to set as override
 */
export function setClimateZoneOverride(zone) {
    if (zone && zone.trim()) {
        localStorage.setItem('gardening_climate_zone_override', zone);
        userClimateZoneOverride = zone;
        userClimateZone = zone;
        renderClimateZoneUI();
        document.dispatchEvent(new CustomEvent('climateZoneUpdated', {
            detail: { zone: zone, zoneGroup: getZoneGroup(zone), lat: userLat }
        }));
    }
}

/**
 * Clear the climate zone override
 */
export function clearClimateZoneOverride() {
    localStorage.removeItem('gardening_climate_zone_override');
    userClimateZoneOverride = null;
    
    // Recompute from location
    const cached = localStorage.getItem('gardening_last_location');
    if (cached) {
        try {
            const loc = JSON.parse(cached);
            if (loc.type === 'coords' && loc.lat && loc.lon) {
                const latNum = typeof loc.lat === 'string' ? parseFloat(loc.lat) : loc.lat;
                const lonNum = typeof loc.lon === 'string' ? parseFloat(loc.lon) : loc.lon;
                showClimateZone(latNum, lonNum);
                return;
            }
        } catch (e) {}
    }
    renderClimateZoneUI();
}

/**
 * Estimate last spring frost and first autumn frost dates based on latitude and climate zone.
 * @param {number} lat - Latitude (positive = North, negative = South)
 * @param {string} [climateZone] - Köppen climate zone code (e.g. 'Dfb', 'Cfa')
 * @returns {{ lastSpring: Date|null, firstAutumn: Date|null, label: string, confidence: string }}
 */
export function estimateLastFrostDate(lat, climateZone) {
    const absLat = Math.abs(lat);
    const year = new Date().getFullYear();

    // Latitude-based lookup (Northern Hemisphere spring/autumn frost month-day)
    const bands = [
        { maxLat: 25, spring: null,       autumn: null },        // Frost-free
        { maxLat: 30, spring: [2, 15],    autumn: [11, 30] },
        { maxLat: 35, spring: [3, 1],     autumn: [11, 15] },
        { maxLat: 40, spring: [3, 15],    autumn: [10, 31] },
        { maxLat: 45, spring: [4, 1],     autumn: [10, 15] },
        { maxLat: 50, spring: [4, 15],    autumn: [9, 30] },
        { maxLat: 55, spring: [5, 1],     autumn: [9, 15] },
        { maxLat: 60, spring: [5, 10],    autumn: [9, 5] },
        { maxLat: 65, spring: [5, 20],    autumn: [8, 31] },
        { maxLat: 90, spring: [6, 5],     autumn: [8, 15] }
    ];

    const band = bands.find(b => absLat <= b.maxLat);
    if (!band || !band.spring) {
        return { lastSpring: null, firstAutumn: null, label: 'Frost-free zone', confidence: 'approximate' };
    }

    // Climate zone refinement (days to shift spring frost)
    let shiftDays = 0;
    if (climateZone) {
        const firstLetter = climateZone.charAt(0).toUpperCase();
        if (firstLetter === 'A') {
            return { lastSpring: null, firstAutumn: null, label: 'Frost-free (tropical)', confidence: 'approximate' };
        }
        if (firstLetter === 'C') shiftDays = -7;  // Oceanic/temperate → earlier last frost
        if (firstLetter === 'D') shiftDays = 7;   // Continental → later last frost
    }

    let springDate = new Date(year, band.spring[0] - 1, band.spring[1] + shiftDays);
    let autumnDate = new Date(year, band.autumn[0] - 1, band.autumn[1] - shiftDays);

    // Southern Hemisphere: invert (swap spring/autumn and shift by ~6 months)
    if (lat < 0) {
        springDate = new Date(year, band.autumn[0] - 1 - 6, band.autumn[1] - shiftDays);
        autumnDate = new Date(year, band.spring[0] - 1 + 6, band.spring[1] + shiftDays);
    }

    return {
        lastSpring: springDate,
        firstAutumn: autumnDate,
        label: `~${springDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        confidence: 'approximate'
    };
}