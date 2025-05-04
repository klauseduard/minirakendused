// Gardening Calendar - Location Module
import { displayWeatherData } from './weather.js';

// Climate zone data
let koppenGrid = null;
let userClimateZone = null;
let userClimateZoneOverride = null;

// Track last actions for retry
let lastGeocodeQuery = null;
let lastWeatherCoords = null;
let lastWeatherAction = null; // 'geocode' or 'weather'

// Initialize location functionality
function initLocation() {
    // Get DOM elements
    const locationInput = document.getElementById('locationInput');
    const searchLocationBtn = document.getElementById('searchLocationBtn');
    const useMyLocationBtn = document.getElementById('useMyLocationBtn');
    const clearLocationBtn = document.getElementById('clearLocationBtn');
    const climateZoneInfo = document.getElementById('climateZoneInfo');
    
    // Load Köppen climate zone data
    loadKoppenGrid();
    
    // Set up event listeners
    if (locationInput && searchLocationBtn) {
        // Search button
        searchLocationBtn.addEventListener('click', function() {
            const query = locationInput.value.trim();
            if (query) {
                geocodeLocation(query);
            }
        });
        
        // Enter key in input
        locationInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const query = this.value.trim();
                if (query) {
                    geocodeLocation(query);
                }
            }
        });
        
        // Input focus change
        locationInput.addEventListener('focus', function() {
            this.setAttribute('placeholder', 'City or place name');
        });
        
        locationInput.addEventListener('blur', function() {
            this.setAttribute('placeholder', 'City or place name (e.g., Paris, Barcelona)');
        });
        
        // Clear button
        if (clearLocationBtn) {
            clearLocationBtn.addEventListener('click', function() {
                locationInput.value = '';
                this.style.opacity = '0.2';
            });
            
            // Update clear button visibility on input change
            locationInput.addEventListener('input', function() {
                clearLocationBtn.style.opacity = this.value ? '0.7' : '0.2';
            });
        }
    }
    
    // Use my location button
    if (useMyLocationBtn) {
        useMyLocationBtn.addEventListener('click', function() {
            if (navigator.geolocation) {
                useMyLocationBtn.disabled = true;
                useMyLocationBtn.textContent = '📍 Locating...';
                
                navigator.geolocation.getCurrentPosition(
                    // Success
                    function(position) {
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        
                        fetchWeatherData(lat, lon);
                        displayLocationInfo('Your location', lat, lon, '', '', '');
                        
                        // Store location in localStorage
                        localStorage.setItem('gardening_last_location', JSON.stringify({
                            type: 'coords',
                            lat: lat,
                            lon: lon
                        }));
                        
                        // Track in analytics
                        if (typeof gtag === 'function') {
                            gtag('event', 'use_geolocation');
                        }
                        
                        // Reset button
                        useMyLocationBtn.disabled = false;
                        useMyLocationBtn.innerHTML = '<span class="location-icon">📍</span> My Location';
                    },
                    // Error
                    function(error) {
                        console.error('Geolocation error:', error);
                        alert('Unable to get your location. Please try entering a location manually.');
                        
                        // Reset button
                        useMyLocationBtn.disabled = false;
                        useMyLocationBtn.innerHTML = '<span class="location-icon">📍</span> My Location';
                    }
                );
            } else {
                alert('Geolocation is not supported by your browser. Please enter a location manually.');
            }
        });
    }
    
    // Check for cached location on page load
    const cached = localStorage.getItem('gardening_last_location');
    if (cached) {
        try {
            const loc = JSON.parse(cached);
            if (loc.type === 'query' && loc.value) {
                locationInput.value = loc.value;
                // Update clear button opacity
                if (clearLocationBtn) {
                    clearLocationBtn.style.opacity = '0.7';
                }
                geocodeLocation(loc.value);
            } else if (loc.type === 'coords' && loc.lat && loc.lon) {
                // Clear the input when using coordinates
                if (locationInput) {
                    locationInput.value = '';
                }
                if (clearLocationBtn) {
                    clearLocationBtn.style.opacity = '0.2';
                }
                displayLocationInfo('Your location', loc.lat, loc.lon, '', '', '');
                fetchWeatherData(loc.lat, loc.lon);
            }
        } catch (e) {
            console.error('Error parsing cached location:', e);
        }
    }
}

// Load Köppen climate zone grid data
function loadKoppenGrid() {
    fetch('gardening_calendar/data/koppen_grid_0.5deg.json')
        .then(r => r.json())
        .then(data => {
            koppenGrid = data;
            // If we already have a location, try to show zone
            const cached = localStorage.getItem('gardening_last_location');
            if (cached) {
                try {
                    const loc = JSON.parse(cached);
                    if (loc.type === 'coords' && loc.lat && loc.lon) {
                        showClimateZone(loc.lat, loc.lon);
                    }
                } catch (e) {
                    console.error('Error parsing cached location:', e);
                }
            }
        })
        .catch(error => {
            console.error('Error loading Köppen grid data:', error);
        });
}

// Round to nearest 0.25 degree (for climate zone grid)
function round025(x) {
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

// Show climate zone info
function showClimateZone(lat, lon) {
    const climateZoneInfo = document.getElementById('climateZoneInfo');
    if (!climateZoneInfo) return;
    
    if (!koppenGrid) {
        climateZoneInfo.innerHTML = '';
        return;
    }
    
    // Check for override
    const override = localStorage.getItem('gardening_climate_zone_override');
    let lookupKey = '';
    let foundZone = '';
    
    if (override) {
        userClimateZoneOverride = override;
        userClimateZone = override;
        lookupKey = '(override)';
        foundZone = override;
    } else {
        const latNum = typeof lat === 'string' ? parseFloat(lat) : lat;
        const lonNum = typeof lon === 'string' ? parseFloat(lon) : lon;
        const key = `${round025(latNum)} ${round025(lonNum)}`;
        
        // Try exact match first
        if (koppenGrid[key]) {
            userClimateZone = koppenGrid[key];
            lookupKey = key;
            foundZone = userClimateZone;
        } else {
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
            } else {
                userClimateZone = 'Unknown';
                lookupKey = key;
                foundZone = 'Unknown';
            }
        }
    }
    
    renderClimateZoneUI(lookupKey, foundZone);
}

// Render the climate zone UI
function renderClimateZoneUI(lookupKey = '', foundZone = '') {
    const climateZoneInfo = document.getElementById('climateZoneInfo');
    if (!climateZoneInfo) return;
    
    let html = '';
    
    if (userClimateZone) {
        html += `<div class="climate-zone-info">`;
        html += `<div class="climate-zone-row">`;
        html += `<strong>Climate zone:</strong> <span id="climateZoneCode" class="climate-zone-code">${userClimateZone}</span>`;
        html += `<a href="https://en.wikipedia.org/wiki/K%C3%B6ppen_climate_classification" target="_blank" class="climate-zone-link">(What is this?)</a>`;
        html += `</div>`;
        html += `<div class="climate-zone-override">`;
        html += `<label for="climateZoneOverride">Override zone:</label>`;
        html += `<input id="climateZoneOverride" type="text" class="climate-zone-input" value="${userClimateZoneOverride || ''}" placeholder="e.g. Dfb">`;
        html += `<button id="setClimateZoneOverrideBtn" class="climate-zone-btn">Set</button>`;
        html += `<button id="clearClimateZoneOverrideBtn" class="climate-zone-btn climate-zone-clear-btn">Clear</button>`;
        html += `</div></div>`;
    }
    
    climateZoneInfo.innerHTML = html;
    
    // Add event listeners
    const setBtn = document.getElementById('setClimateZoneOverrideBtn');
    const clearBtn = document.getElementById('clearClimateZoneOverrideBtn');
    const input = document.getElementById('climateZoneOverride');
    
    if (setBtn && input) {
        setBtn.addEventListener('click', function() {
            const value = input.value.trim();
            if (value) {
                localStorage.setItem('gardening_climate_zone_override', value);
                userClimateZoneOverride = value;
                userClimateZone = value;
                document.getElementById('climateZoneCode').textContent = value;
                
                // Track in analytics
                if (typeof gtag === 'function') {
                    gtag('event', 'set_climate_zone_override', {
                        'zone': value
                    });
                }
            }
        });
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            localStorage.removeItem('gardening_climate_zone_override');
            userClimateZoneOverride = null;
            
            // Recalculate based on coordinates
            const cached = localStorage.getItem('gardening_last_location');
            if (cached) {
                try {
                    const loc = JSON.parse(cached);
                    if (loc.type === 'coords' && loc.lat && loc.lon) {
                        showClimateZone(loc.lat, loc.lon);
                    }
                } catch (e) {
                    console.error('Error parsing cached location:', e);
                }
            }
            
            // Track in analytics
            if (typeof gtag === 'function') {
                gtag('event', 'clear_climate_zone_override');
            }
        });
    }
}

// Geocode a location query
function geocodeLocation(query) {
    // Store last action info for retry
    lastGeocodeQuery = query;
    lastWeatherAction = 'geocode';
    
    // Display loading state
    displayLocationInfo('', '', '', 'Searching...', '', query);
    
    // Save to localStorage
    localStorage.setItem('gardening_last_location', JSON.stringify({
        type: 'query',
        value: query
    }));
    
    // Use OpenStreetMap Nominatim API for geocoding
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    
    fetch(nominatimUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data && data.length > 0) {
                const result = data[0];
                const lat = result.lat;
                const lon = result.lon;
                const displayName = result.display_name;
                
                displayLocationInfo(displayName, lat, lon, '', '', '');
                fetchWeatherData(lat, lon);
                
                // Track in analytics
                if (typeof gtag === 'function') {
                    gtag('event', 'geocode_location', {
                        'query': query,
                        'success': true
                    });
                }
            } else {
                displayLocationInfo('', '', '', 'Location not found', '', query);
                
                // Track in analytics
                if (typeof gtag === 'function') {
                    gtag('event', 'geocode_location', {
                        'query': query,
                        'success': false
                    });
                }
            }
        })
        .catch(error => {
            console.error('Error geocoding location:', error);
            displayLocationInfo('', '', '', 'Error searching location', '', query);
            
            // Track error in analytics
            if (typeof gtag === 'function') {
                gtag('event', 'geocode_error', {
                    'query': query,
                    'error': error.toString()
                });
            }
        });
}

// Fetch weather data for a location
function fetchWeatherData(lat, lon) {
    // Store last action info for retry
    lastWeatherCoords = { lat, lon };
    lastWeatherAction = 'weather';
    
    // OpenWeatherMap API key and URL
    const apiKey = 'c1d0aca3b9dfc6b4066c8d20e7262465'; // This is a public key
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
    
    // Show loading state
    const weatherPlaceholder = document.getElementById('weatherPlaceholder');
    if (weatherPlaceholder) {
        weatherPlaceholder.style.display = 'block';
        weatherPlaceholder.textContent = 'Loading weather data...';
    }
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            displayWeatherData(data, lat, lon);
            
            // Track in analytics
            if (typeof gtag === 'function') {
                gtag('event', 'fetch_weather', {
                    'lat': lat,
                    'lon': lon,
                    'success': true
                });
            }
        })
        .catch(error => {
            console.error('Error fetching weather data:', error);
            
            if (weatherPlaceholder) {
                weatherPlaceholder.textContent = 'Error loading weather data. Please try again.';
            }
            
            // Track error in analytics
            if (typeof gtag === 'function') {
                gtag('event', 'weather_error', {
                    'lat': lat,
                    'lon': lon,
                    'error': error.toString()
                });
            }
        });
}

// Display location information
function displayLocationInfo(name, lat, lon, status, error, query) {
    const weatherDisplay = document.getElementById('weather-info');
    const weatherPlaceholder = document.getElementById('weatherPlaceholder');
    
    if (!weatherDisplay || !weatherPlaceholder) return;
    
    if (status) {
        // Display status message
        weatherPlaceholder.style.display = 'block';
        weatherPlaceholder.textContent = status;
        return;
    }
    
    if (error) {
        // Display error message
        weatherPlaceholder.style.display = 'block';
        weatherPlaceholder.textContent = `${error}${query ? `: ${query}` : ''}`;
        return;
    }
    
    // If we have coordinates, try to show climate zone
    if (lat && lon) {
        showClimateZone(lat, lon);
    }
}

export { initLocation, geocodeLocation, fetchWeatherData, displayLocationInfo }; 