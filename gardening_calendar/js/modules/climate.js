/**
 * Climate Zone Module for Gardening Calendar
 * Handles climate zone determination and UI rendering.
 */

// Global variables for the module
let koppenGrid = null;
let userClimateZone = null;
let userClimateZoneOverride = null;

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
            }
        });
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
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