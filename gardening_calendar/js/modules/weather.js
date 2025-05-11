/**
 * Weather Module for Gardening Calendar
 * Handles all weather-related functionality
 */

import * as uiUtils from './ui.js';
import * as storageUtils from './storage.js';

// Weather icon and color mappings
const weatherCodeMap = {
    0: {icon: '☀️', text: 'Clear sky', type: 'clear'},
    1: {icon: '🌤️', text: 'Mainly clear', type: 'clear'},
    2: {icon: '⛅', text: 'Partly cloudy', type: 'cloud'},
    3: {icon: '☁️', text: 'Overcast', type: 'cloud'},
    45: {icon: '🌫️', text: 'Fog', type: 'fog'},
    48: {icon: '🌫️', text: 'Depositing rime fog', type: 'fog'},
    51: {icon: '🌦️', text: 'Light drizzle', type: 'rain'},
    53: {icon: '🌦️', text: 'Moderate drizzle', type: 'rain'},
    55: {icon: '🌧️', text: 'Dense drizzle', type: 'rain'},
    56: {icon: '🌦️', text: 'Light freezing drizzle', type: 'rain'},
    57: {icon: '🌧️', text: 'Dense freezing drizzle', type: 'rain'},
    61: {icon: '🌦️', text: 'Slight rain', type: 'rain'},
    63: {icon: '🌧️', text: 'Moderate rain', type: 'rain'},
    65: {icon: '🌧️', text: 'Heavy rain', type: 'rain'},
    66: {icon: '🌧️', text: 'Light freezing rain', type: 'rain'},
    67: {icon: '🌧️', text: 'Heavy freezing rain', type: 'rain'},
    71: {icon: '🌨️', text: 'Slight snow fall', type: 'snow'},
    73: {icon: '🌨️', text: 'Moderate snow fall', type: 'snow'},
    75: {icon: '❄️', text: 'Heavy snow fall', type: 'snow'},
    77: {icon: '❄️', text: 'Snow grains', type: 'snow'},
    80: {icon: '🌦️', text: 'Slight rain showers', type: 'rain'},
    81: {icon: '🌧️', text: 'Moderate rain showers', type: 'rain'},
    82: {icon: '🌧️', text: 'Violent rain showers', type: 'rain'},
    85: {icon: '🌨️', text: 'Slight snow showers', type: 'snow'},
    86: {icon: '🌨️', text: 'Snow showers', type: 'snow'},
    95: {icon: '⛈️', text: 'Thunderstorm', type: 'storm'},
    96: {icon: '⛈️', text: 'Thunderstorm w/ hail', type: 'storm'},
    99: {icon: '⛈️', text: 'Thunderstorm w/ heavy hail', type: 'storm'}
};

const typeColors = {
    clear: {color: '#ff9800', bg: 'rgba(255, 152, 0, 0.15)'},
    cloud: {color: '#607d8b', bg: 'rgba(96, 125, 139, 0.15)'},
    fog: {color: '#90a4ae', bg: 'rgba(144, 164, 174, 0.15)'},
    rain: {color: '#2196f3', bg: 'rgba(33, 150, 243, 0.15)'},
    snow: {color: '#90caf9', bg: 'rgba(144, 202, 249, 0.15)'},
    storm: {color: '#673ab7', bg: 'rgba(103, 58, 183, 0.15)'},
    unknown: {color: '#9e9e9e', bg: 'rgba(158, 158, 158, 0.15)'}
};

// Global variables for weather state
let lastWeatherData = null;
let lastWeatherCoords = null;
let lastWeatherAction = null;
let lastWeatherLat = null;
let lastWeatherLon = null;

/**
 * Convert weather code to icon, text, and colors
 * @param {number} code - Weather code from API
 * @returns {Object} Object with icon, text, and color information
 */
export function weatherCodeToIconTextColor(code) {
    const entry = weatherCodeMap[code] || {icon: '❓', text: 'Unknown', type: 'unknown'};
    const color = typeColors[entry.type] || typeColors.unknown;
    return { ...entry, ...color };
}

/**
 * Fetch weather data from Open-Meteo
 * @param {string} lat - Latitude
 * @param {string} lon - Longitude
 * @param {boolean} isRetry - Whether this is a retry attempt
 */
export async function fetchWeatherData(lat, lon, isRetry = false) {
    lastWeatherCoords = { lat, lon };
    lastWeatherAction = 'weather';
    lastWeatherLat = lat;
    lastWeatherLon = lon;
    const weatherSection = document.getElementById('weatherDataSection');
    if (!weatherSection) return;
    weatherSection.textContent = 'Loading weather data...';
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&hourly=temperature_2m,precipitation,windspeed_10m&forecast_days=16&timezone=auto`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Weather service error');
        const data = await response.json();
        lastWeatherData = data;
        if (!data.current_weather || !data.daily || !data.hourly) {
            weatherSection.innerHTML = '<div role="alert" style="color: #b71c1c;">Weather data not available for this location.</div>';
            return;
        }
        renderWeatherData(data);
    } catch (e) {
        if (weatherSection) {
            weatherSection.innerHTML = '<div role="alert" style="color: #b71c1c;">Could not fetch weather data. <button id="retryWeatherBtn" style="margin-left:12px;">Retry</button></div>';
            const btn = document.getElementById('retryWeatherBtn');
            if (btn) btn.onclick = () => {
                if (lastWeatherCoords) fetchWeatherData(lastWeatherCoords.lat, lastWeatherCoords.lon, true);
            };
        }
    }
}

/**
 * Render weather data in selected units
 * @param {Object} data - Weather data from API
 */
export function renderWeatherData(data) {
    const weatherSection = document.getElementById('weatherDataSection');
    if (!weatherSection) return;
    
    // Get unit preferences from storage module
    const tempUnit = storageUtils.getTemperatureUnit();
    const precipUnit = storageUtils.getPrecipitationUnit();
    
    // Display current weather
    const currentIconTextColor = weatherCodeToIconTextColor(data.current_weather.weathercode);
    let html = `<div class="weather-current"><strong>Current weather:</strong> <span style="display:inline-block;background:${currentIconTextColor.bg};border-radius:50%;padding:6px 10px;font-size:1.4em;color:${currentIconTextColor.color};margin-right:6px;">${currentIconTextColor.icon}</span> ${currentIconTextColor.text}, ${convertTemp(data.current_weather.temperature, tempUnit)}${getTempUnitSymbol(tempUnit)}, Wind: ${data.current_weather.windspeed} km/h</div>`;
    
    // Prepare hourly data grouped by day
    const hourlyByDay = groupHourlyByDay(data.hourly, data.daily.time);
    const hourlyPrecipByDay = groupHourlyByDay({ time: data.hourly.time, temperature_2m: data.hourly.precipitation }, data.daily.time);
    const hourlyWindByDay = groupHourlyByDay({ time: data.hourly.time, temperature_2m: data.hourly.windspeed_10m }, data.daily.time);
    
    // Display forecast table
    html += `<div style="margin-top:10px;"><strong>16-day forecast:</strong></div>`;
    html += `<table class="weather-forecast-table"><caption class='visually-hidden'>16-day weather forecast for selected location</caption><thead><tr><th scope='col'>Date</th><th scope='col'>Night Min</th><th scope='col'>Night Max</th><th scope='col'>Day Min</th><th scope='col'>Day Max</th><th scope='col'>Precip.</th><th scope='col'>Weather</th><th scope='col'>Temp Trend</th></tr></thead><tbody>`;
    
    for (let i = 0; i < data.daily.time.length; i++) {
        const { nightMin, nightMax, dayMin, dayMax } = calcNightDayMinMax(hourlyByDay[i]);
        const weatherIconTextColor = weatherCodeToIconTextColor(data.daily.weathercode[i]);
        
        // Color-code the temperature cells
        function getTempHtml(tempValue) {
            if (tempValue === null) return '-';
            const temp = convertTemp(tempValue, tempUnit);
            const tempColor = getTemperatureColor(temp, tempUnit);
            
            // Calculate contrasting text color (black or white) based on background color
            // Convert hex color to RGB to calculate luminance
            const hexToRgb = (hex) => {
                const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
                const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
                return result ? {
                    r: parseInt(result[1], 16),
                    g: parseInt(result[2], 16),
                    b: parseInt(result[3], 16)
                } : {r: 0, g: 0, b: 0};
            };
            
            // Calculate relative luminance for accessibility contrast
            const rgb = hexToRgb(tempColor);
            
            // Use the original color but with reduced opacity for a softer look
            const bgColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`;
            const textColor = '#333333';
            const borderColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
            
            return `<span style="display:inline-block;background-color:${bgColor};color:${textColor};padding:2px 6px;border-radius:4px;font-weight:500;border:1px solid ${borderColor};">${temp}${getTempUnitSymbol(tempUnit)}</span>`;
        }
        
        html += `<tr>
            <td>${data.daily.time[i]}</td>
            <td>${getTempHtml(nightMin)}</td>
            <td>${getTempHtml(nightMax)}</td>
            <td>${getTempHtml(dayMin)}</td>
            <td>${getTempHtml(dayMax)}</td>
            <td>${convertPrecip(data.daily.precipitation_sum[i], precipUnit)} ${getPrecipUnitSymbol(precipUnit)}</td>
            <td><span style='display:inline-block;background:${weatherIconTextColor.bg};border-radius:50%;padding:7px 12px;font-size:1.5em;color:${weatherIconTextColor.color};margin-bottom:2px;'>${weatherIconTextColor.icon}</span><br><span style='color:${weatherIconTextColor.color};font-size:0.93em;'>${weatherIconTextColor.text}</span></td>
            <td>${renderSparkline(hourlyByDay[i], i, tempUnit)}</td>
        </tr>`;
    }
    
    html += `</tbody></table>`;
    weatherSection.innerHTML = html;
    
    // Add event listeners for sparklines
    addSparklineListeners(hourlyByDay, data.daily.time, hourlyPrecipByDay, hourlyWindByDay, tempUnit, precipUnit);
}

/**
 * Calculate night and day min/max for a day's hourly temps
 * @param {Array} temps - Array of hourly temperatures
 * @returns {Object} Object with nightMin, nightMax, dayMin, dayMax
 */
export function calcNightDayMinMax(temps) {
    if (!temps || temps.length !== 24) return { nightMin: null, nightMax: null, dayMin: null, dayMax: null };
    
    // Night: 21:00–23:00 (21,22,23) and 00:00–05:00 (0,1,2,3,4,5)
    const nightHours = [21,22,23,0,1,2,3,4,5];
    const dayHours = [6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];
    const nightTemps = nightHours.map(h => temps[h]).filter(t => t !== undefined);
    const dayTemps = dayHours.map(h => temps[h]).filter(t => t !== undefined);
    
    return {
        nightMin: nightTemps.length ? Math.round(Math.min(...nightTemps)) : null,
        nightMax: nightTemps.length ? Math.round(Math.max(...nightTemps)) : null,
        dayMin: dayTemps.length ? Math.round(Math.min(...dayTemps)) : null,
        dayMax: dayTemps.length ? Math.round(Math.max(...dayTemps)) : null
    };
}

/**
 * Group hourly temperature data by day
 * @param {Object} hourly - Hourly data object
 * @param {Array} dailyDates - Array of date strings
 * @returns {Array} Array of arrays with hourly data grouped by day
 */
export function groupHourlyByDay(hourly, dailyDates) {
    const result = [];
    const hours = hourly.time;
    const temps = hourly.temperature_2m;
    let dayIndex = 0;
    let currentDay = dailyDates[dayIndex];
    let dayTemps = [];
    
    for (let i = 0; i < hours.length; i++) {
        if (hours[i].startsWith(currentDay)) {
            dayTemps.push(temps[i]);
        } else {
            result.push(dayTemps);
            dayTemps = [];
            dayIndex++;
            currentDay = dailyDates[dayIndex];
            if (!currentDay) break;
            if (hours[i].startsWith(currentDay)) {
                dayTemps.push(temps[i]);
            }
        }
    }
    
    if (dayTemps.length) result.push(dayTemps);
    return result;
}

/**
 * Get temperature color based on value and unit
 * @param {number} temp - Temperature value
 * @param {string} tempUnit - Temperature unit (C or F)
 * @returns {string} Color hex code
 */
export function getTemperatureColor(temp, tempUnit) {
    // Define more granular temperature steps
    const temperatureSteps = tempUnit === 'F' ? [
        { threshold: 14, color: '#0d47a1' },   // Very cold (deep blue)
        { threshold: 23, color: '#1565c0' },   // Freezing (deep blue-mid blue)
        { threshold: 32, color: '#1976d2' },   // Freezing point (mid blue)
        { threshold: 41, color: '#1e88e5' },   // Cold (blue)
        { threshold: 50, color: '#42a5f5' },   // Cool (light blue)
        { threshold: 59, color: '#64b5f6' },   // Cool-mild (pale blue)
        { threshold: 64, color: '#81c784' },   // Mild (light green)
        { threshold: 68, color: '#4caf50' },   // Mild-comfortable (medium green)
        { threshold: 73, color: '#7cb342' },   // Comfortable (green-yellow)
        { threshold: 77, color: '#9e9d24' },   // Warm (yellow-green)
        { threshold: 82, color: '#ffb74d' },   // Warm-hot (light orange)
        { threshold: 86, color: '#ff9800' },   // Hot (orange)
        { threshold: 91, color: '#f57c00' },   // Very hot (dark orange)
        { threshold: 95, color: '#e64a19' },   // Extremely hot (orange-red)
        { threshold: 100, color: '#d32f2f' },  // Dangerous heat (red)
        { threshold: Infinity, color: '#b71c1c' } // Extreme heat (deep red)
    ] : [
        { threshold: -20, color: '#0d47a1' },  // Extreme cold (deep blue)
        { threshold: -15, color: '#1565c0' },  // Very cold (deep blue-mid blue)
        { threshold: -10, color: '#1976d2' },  // Very cold (mid blue)
        { threshold: -5, color: '#1e88e5' },   // Cold (blue)
        { threshold: 0, color: '#42a5f5' },    // Freezing (light blue)
        { threshold: 5, color: '#64b5f6' },    // Cool (pale blue)
        { threshold: 10, color: '#81c784' },   // Cool-mild (light green)
        { threshold: 15, color: '#4caf50' },   // Mild (medium green)
        { threshold: 20, color: '#7cb342' },   // Comfortable (green-yellow)
        { threshold: 23, color: '#9e9d24' },   // Warm (yellow-green)
        { threshold: 26, color: '#ffb74d' },   // Warm-hot (light orange)
        { threshold: 30, color: '#ff9800' },   // Hot (orange)
        { threshold: 33, color: '#f57c00' },   // Very hot (dark orange)
        { threshold: 36, color: '#e64a19' },   // Extremely hot (orange-red)
        { threshold: 40, color: '#d32f2f' },   // Dangerous heat (red)
        { threshold: Infinity, color: '#b71c1c' } // Extreme heat (deep red)
    ];
    
    // Find the appropriate color based on temperature
    for (const step of temperatureSteps) {
        if (temp <= step.threshold) {
            return step.color;
        }
    }
    
    return '#b71c1c'; // Fallback to deepest red
}

/**
 * Render a mini SVG sparkline for a day's temperatures
 * @param {Array} temps - Array of hourly temperatures
 * @param {number} dayIndex - Index of the day
 * @param {string} tempUnit - Temperature unit
 * @returns {string} SVG HTML for sparkline
 */
export function renderSparkline(temps, dayIndex, tempUnit) {
    if (!temps || temps.length === 0) return '';
    
    const svgWidth = 160;
    const svgHeight = 50;
    const padLeft = 0;
    const padRight = 0;
    const padTop = 5;
    const padBottom = 5;
    const graphWidth = svgWidth - padLeft - padRight;
    const graphHeight = svgHeight - padTop - padBottom;
    
    // Convert temperatures if needed
    const displayTemps = temps.map(t => convertTemp(t, tempUnit));
    
    // Find min and max for scaling
    const minTemp = Math.min(...displayTemps) - 1;
    const maxTemp = Math.max(...displayTemps) + 1;
    const tempRange = maxTemp - minTemp;
    
    // Scale points to fit the graph
    const pointsX = temps.map((_, i) => padLeft + (i / (temps.length - 1)) * graphWidth);
    const pointsY = displayTemps.map(t => svgHeight - padBottom - ((t - minTemp) / tempRange) * graphHeight);
    
    // Create SVG path
    let pathD = 'M ' + pointsX[0] + ' ' + pointsY[0];
    for (let i = 1; i < temps.length; i++) {
        // Use a simple curve between points
        const cpx1a = pointsX[i-1] + (pointsX[i] - pointsX[i-1])/3;
        const cpy1a = pointsY[i-1];
        const cpx2a = pointsX[i] - (pointsX[i] - pointsX[i-1])/3;
        const cpy2a = pointsY[i];
        pathD += ` C ${cpx1a} ${cpy1a}, ${cpx2a} ${cpy2a}, ${pointsX[i]} ${pointsY[i]}`;
    }
    
    // Add point circles
    const morningCircle = `<circle cx="${pointsX[6]}" cy="${pointsY[6]}" r="2.5" fill="#ff9800" />`;
    const noonCircle = `<circle cx="${pointsX[12]}" cy="${pointsY[12]}" r="3" fill="#ffb74d" />`;
    const eveningCircle = `<circle cx="${pointsX[18]}" cy="${pointsY[18]}" r="2.5" fill="#f57c00" />`;
    
    return `<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" class="temp-sparkline" data-day-index="${dayIndex}">
        <path d="${pathD}" fill="none" stroke="#64b5f6" stroke-width="2.5" />
        ${morningCircle}
        ${noonCircle}
        ${eveningCircle}
    </svg>`;
}

/**
 * Add event listeners to sparklines for hover tooltips
 * @param {Array} hourlyByDay - Hourly temperature data by day
 * @param {Array} dailyDates - Array of date strings
 * @param {Array} hourlyPrecipByDay - Hourly precipitation data by day
 * @param {Array} hourlyWindByDay - Hourly wind data by day
 * @param {string} tempUnit - Temperature unit
 * @param {string} precipUnit - Precipitation unit
 */
export function addSparklineListeners(hourlyByDay, dailyDates, hourlyPrecipByDay, hourlyWindByDay, tempUnit, precipUnit) {
    const sparklines = document.querySelectorAll('.temp-sparkline');
    
    for (const sparkline of sparklines) {
        const dayIndex = parseInt(sparkline.getAttribute('data-day-index'), 10);
        const temps = hourlyByDay[dayIndex];
        const precips = hourlyPrecipByDay?.[dayIndex] || [];
        const winds = hourlyWindByDay?.[dayIndex] || [];
        if (!temps || temps.length === 0) continue;
        
        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'weather-tooltip';
        tooltip.style.cssText = 'display:none;position:absolute;background:white;border:1px solid #ccc;border-radius:4px;padding:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);z-index:1000;';
        document.body.appendChild(tooltip);
        
        // Show tooltip on hover
        sparkline.addEventListener('mousemove', (e) => {
            const rect = sparkline.getBoundingClientRect();
            const x = e.clientX - rect.left; // x position within the element
            const hourIndex = Math.min(23, Math.max(0, Math.floor((x / rect.width) * 24)));
            
            // Format the time (0 => 12 AM, 12 => 12 PM, 23 => 11 PM)
            const hourDisplay = hourIndex === 0 ? '12 AM' : 
                               hourIndex < 12 ? `${hourIndex} AM` : 
                               hourIndex === 12 ? '12 PM' : 
                               `${hourIndex - 12} PM`;
                               
            const date = dailyDates[dayIndex];
            const temp = convertTemp(temps[hourIndex], tempUnit);
            const precip = precips[hourIndex] ? convertPrecip(precips[hourIndex], precipUnit) : 0;
            const wind = winds[hourIndex] || 0;
            
            tooltip.innerHTML = `
                <div style="margin-bottom:5px;font-weight:bold;">${date} ${hourDisplay}</div>
                <div>Temperature: ${temp}${getTempUnitSymbol(tempUnit)}</div>
                <div>Precipitation: ${precip} ${getPrecipUnitSymbol(precipUnit)}</div>
                <div>Wind: ${wind} km/h</div>
            `;
            
            tooltip.style.left = (e.pageX + 15) + 'px';
            tooltip.style.top = (e.pageY + 15) + 'px';
            tooltip.style.display = 'block';
        });
        
        // Hide tooltip when not hovering
        sparkline.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
        
        // Add click handler to open detailed hourly view
        sparkline.addEventListener('click', () => {
            showHourlyWeatherDetail(dayIndex, dailyDates[dayIndex], temps, precips, winds, tempUnit, precipUnit);
        });
    }
}

/**
 * Show detailed hourly weather for a day in a modal
 * @param {number} dayIndex - Index of the day
 * @param {string} dateStr - Date string
 * @param {Array} temps - Hourly temperatures
 * @param {Array} precips - Hourly precipitation
 * @param {Array} winds - Hourly wind speeds
 * @param {string} tempUnit - Temperature unit
 * @param {string} precipUnit - Precipitation unit
 */
export function showHourlyWeatherDetail(dayIndex, dateStr, temps, precips, winds, tempUnit, precipUnit) {
    if (!temps || temps.length === 0) return;
    
    // Use the UI module's showModal function if available
    if (typeof uiUtils !== 'undefined' && typeof uiUtils.showModal === 'function') {
        const title = `Hourly Weather Details - ${dateStr}`;
        
        // Build hourly table
        let content = `<div style="max-height:70vh;overflow-y:auto;padding:0 5px;">`;
        content += `<table class="weather-modal-hourly-table" style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;">`;
        content += `<caption class="visually-hidden">Hourly weather details for ${dateStr}</caption>`;
        content += `<thead><tr><th>Hour</th><th>Temp</th><th>Precip</th><th>Wind</th></tr></thead><tbody>`;
        
        // Add rows for each hour
        for (let i = 0; i < 24; i++) {
            // Format hour display (0 => 12 AM, 12 => 12 PM, 23 => 11 PM)
            const hourDisplay = i === 0 ? '12 AM' : 
                              i < 12 ? `${i} AM` : 
                              i === 12 ? '12 PM' : 
                              `${i - 12} PM`;
            
            const temp = temps[i] !== undefined ? convertTemp(temps[i], tempUnit) : '-';
            const precip = precips[i] !== undefined ? convertPrecip(precips[i], precipUnit) : '-';
            const wind = winds[i] !== undefined ? winds[i] : '-';
            
            // Get temperature color for styling
            const tempColor = getTemperatureColor(temp, tempUnit);
            const hexToRgb = (hex) => {
                const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
                const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
                return result ? {
                    r: parseInt(result[1], 16),
                    g: parseInt(result[2], 16),
                    b: parseInt(result[3], 16)
                } : {r: 0, g: 0, b: 0};
            };
            
            const rgb = hexToRgb(tempColor);
            const bgColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`;
            const borderColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
            
            content += `<tr>`;
            content += `<td>${hourDisplay}</td>`;
            content += `<td><span style="display:inline-block;background-color:${bgColor};color:#333;padding:2px 6px;border-radius:4px;font-weight:500;border:1px solid ${borderColor};">${temp}${getTempUnitSymbol(tempUnit)}</span></td>`;
            content += `<td>${precip} ${getPrecipUnitSymbol(precipUnit)}</td>`;
            content += `<td>${wind} km/h</td>`;
            content += `</tr>`;
        }
        
        content += `</tbody></table></div>`;
        
        // Show modal
        uiUtils.showModal(title, content, {
            id: 'hourlyWeatherModal',
            width: '90%',
            maxWidth: '600px',
            showCloseButton: true,
            closeOnEscape: true,
            closeOnOutsideClick: true
        });
    } else {
        // Fallback if UI module is not available - create a simple modal
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'weather-modal-overlay';
        modalOverlay.style.cssText = 'display:flex;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);justify-content:center;align-items:center;z-index:1000;';
        
        const modal = document.createElement('div');
        modal.className = 'weather-modal';
        modal.style.cssText = 'background:white;border-radius:8px;padding:20px;max-width:600px;width:90%;max-height:90vh;overflow-y:auto;position:relative;';
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.className = 'weather-modal-close';
        closeBtn.style.cssText = 'position:absolute;top:10px;right:10px;background:none;border:none;font-size:24px;cursor:pointer;padding:5px;line-height:1;';
        closeBtn.setAttribute('aria-label', 'Close modal');
        
        const title = document.createElement('div');
        title.className = 'weather-modal-title';
        title.textContent = `Hourly Weather Details - ${dateStr}`;
        title.style.cssText = 'font-size:18px;font-weight:600;color:#333;margin-bottom:15px;padding-right:30px;';
        
        // Build table similar to above
        let tableHtml = `<table class="weather-modal-hourly-table" style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;">`;
        tableHtml += `<caption class="visually-hidden">Hourly weather details for ${dateStr}</caption>`;
        tableHtml += `<thead><tr><th>Hour</th><th>Temp</th><th>Precip</th><th>Wind</th></tr></thead><tbody>`;
        
        for (let i = 0; i < 24; i++) {
            const hourDisplay = i === 0 ? '12 AM' : 
                              i < 12 ? `${i} AM` : 
                              i === 12 ? '12 PM' : 
                              `${i - 12} PM`;
            
            const temp = temps[i] !== undefined ? convertTemp(temps[i], tempUnit) : '-';
            const precip = precips[i] !== undefined ? convertPrecip(precips[i], precipUnit) : '-';
            const wind = winds[i] !== undefined ? winds[i] : '-';
            
            tableHtml += `<tr>`;
            tableHtml += `<td>${hourDisplay}</td>`;
            tableHtml += `<td>${temp}${getTempUnitSymbol(tempUnit)}</td>`;
            tableHtml += `<td>${precip} ${getPrecipUnitSymbol(precipUnit)}</td>`;
            tableHtml += `<td>${wind} km/h</td>`;
            tableHtml += `</tr>`;
        }
        
        tableHtml += `</tbody></table>`;
        
        const content = document.createElement('div');
        content.innerHTML = tableHtml;
        
        modal.appendChild(closeBtn);
        modal.appendChild(title);
        modal.appendChild(content);
        modalOverlay.appendChild(modal);
        document.body.appendChild(modalOverlay);
        
        // Hide bottom navigation when modal is open on mobile devices
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav && window.innerWidth <= 600) {
            bottomNav.style.display = 'none';
        }
        
        // Function to close modal and restore navigation
        const closeModal = () => {
            modalOverlay.remove();
            
            // Restore bottom navigation bar when modal is closed
            const bottomNav = document.querySelector('.bottom-nav');
            if (bottomNav && window.innerWidth <= 600) {
                bottomNav.style.display = 'flex';
            }
        };
        
        // Add event listeners
        closeBtn.addEventListener('click', closeModal);
        
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });
        
        document.addEventListener('keydown', function closeOnEsc(e) {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', closeOnEsc);
            }
        });
    }
}

/**
 * Convert temperature between Celsius and Fahrenheit
 * @param {number} value - Temperature value
 * @param {string} unit - Target unit (C or F)
 * @returns {number} Converted temperature value
 */
export function convertTemp(value, unit) {
    if (unit === 'F') {
        return Math.round((value * 9/5) + 32);
    }
    return Math.round(value);
}

/**
 * Get temperature unit symbol
 * @param {string} unit - Temperature unit
 * @returns {string} Unit symbol
 */
export function getTempUnitSymbol(unit) {
    return unit === 'C' ? '°C' : '°F';
}

/**
 * Convert precipitation between millimeters and inches
 * @param {number} value - Precipitation value
 * @param {string} unit - Target unit (mm or in)
 * @returns {number} Converted precipitation value
 */
export function convertPrecip(value, unit) {
    if (unit === 'in') {
        return (value / 25.4).toFixed(2);
    }
    return Math.round(value);
}

/**
 * Get precipitation unit symbol
 * @param {string} unit - Precipitation unit
 * @returns {string} Unit symbol
 */
export function getPrecipUnitSymbol(unit) {
    return unit === 'in' ? 'in' : 'mm';
}

/**
 * Display location error
 * @param {string} message - Error message
 * @param {string} errorType - Type of error
 */
export function displayLocationError(message, errorType) {
    const weatherPlaceholder = document.getElementById('weatherPlaceholder');
    if (weatherPlaceholder) {
        weatherPlaceholder.innerHTML = `<div role="alert" style="color: #b71c1c;">${message}</div>`;
    }
    lastWeatherAction = errorType;
}

/**
 * Display location information and fetch weather
 * @param {string} name - Location name
 * @param {string} lat - Latitude
 * @param {string} lon - Longitude
 * @param {string} admin1 - Administrative region 1
 * @param {string} admin2 - Administrative region 2
 * @param {string} country - Country
 */
export function displayLocationInfo(name, lat, lon, admin1, admin2, country) {
    console.log(`weather.js displayLocationInfo - lat: ${lat}, lon: ${lon}`);
    
    // Store coordinates for reference
    lastWeatherLat = lat;
    lastWeatherLon = lon;
    
    const weatherPlaceholder = document.getElementById('weatherPlaceholder');
    if (weatherPlaceholder) {
        let locationParts = [];
        if (name) locationParts.push(name);
        if (admin2) locationParts.push(admin2);
        if (admin1) locationParts.push(admin1);
        if (country) locationParts.push(country);
        const locationString = locationParts.join(', ');
        
        weatherPlaceholder.innerHTML =
            `<div class="weather-location-info"><strong>Location:</strong> ${locationString}<br><br>` +
            `<span style="font-size:0.97em;color:#666;">Latitude: ${lat}, Longitude: ${lon}</span></div>` +
            `<div id="weatherDataSection">Loading weather data...</div>`;
    }
    
    // Fetch weather for this location
    fetchWeatherData(lat, lon);
}

/**
 * Geocode a location name or postal code
 * @param {string} query - Location query
 */
export async function geocodeLocation(query) {
    const weatherPlaceholder = document.getElementById('weatherPlaceholder');
    if (!weatherPlaceholder) return;
    
    lastWeatherAction = 'geocode';
    weatherPlaceholder.textContent = 'Looking up location...';
    
    // Clear any previous location cache first to prevent override
    localStorage.removeItem('gardening_last_location');
    
    try {
        console.log(`Geocoding location: ${query}`);
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Geocoding service error');
        
        const data = await response.json();
        if (!data.results || data.results.length === 0) {
            displayLocationError('Location not found. Please try a different name or postal code.', 'geocode');
            return;
        }
        
        const result = data.results[0];
        console.log(`Geocoding result: ${result.name} at ${result.latitude}, ${result.longitude}`);
        
        // Create a location string
        let locationParts = [];
        if (result.name) locationParts.push(result.name);
        if (result.admin2) locationParts.push(result.admin2);
        if (result.admin1) locationParts.push(result.admin1);
        if (result.country) locationParts.push(result.country);
        const locationString = locationParts.join(', ');
        
        // Save coordinates and location name in the cache
        localStorage.setItem('gardening_last_location', JSON.stringify({ 
            type: 'coords', 
            lat: result.latitude, 
            lon: result.longitude,
            locationName: locationString // Store the location name
        }));
        
        // Directly call functions instead of using displayLocationInfo to prevent location override
        if (weatherPlaceholder) {
            weatherPlaceholder.innerHTML =
                `<div class="weather-location-info"><strong>Location:</strong> ${locationString}<br><br>` +
                `<span style="font-size:0.97em;color:#666;">Latitude: ${result.latitude}, Longitude: ${result.longitude}</span></div>` +
                `<div id="weatherDataSection">Loading weather data...</div>`;
        }
        
        // Fetch weather directly
        fetchWeatherData(result.latitude, result.longitude);
        
        // Directly update climate zone if the function exists
        if (typeof window.showClimateZone === 'function') {
            console.log(`Directly calling showClimateZone with ${result.latitude}, ${result.longitude}`);
            window.showClimateZone(result.latitude, result.longitude);
        }
    } catch (e) {
        console.error('Error during geocoding:', e);
        displayLocationError('Could not resolve location. Please check your input and try again.', 'geocode');
    }
}

/**
 * Initialize weather functionality
 */
export function initWeather() {
    // Event listeners for location search and unit preferences
    const locationInput = document.getElementById('locationInput');
    const useMyLocationBtn = document.getElementById('useMyLocationBtn');
    const searchLocationBtn = document.getElementById('searchLocationBtn');
    const tempUnitSelect = document.getElementById('tempUnitSelect');
    const precipUnitSelect = document.getElementById('precipUnitSelect');
    
    if (!locationInput || !useMyLocationBtn || !searchLocationBtn) {
        console.error('Weather UI elements not found');
        return;
    }
    
    // Search when clicking the search button
    searchLocationBtn.addEventListener('click', function() {
        const query = locationInput.value.trim();
        if (query) geocodeLocation(query);
    });
    
    // Search when pressing Enter
    locationInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const query = locationInput.value.trim();
            if (query) geocodeLocation(query);
        }
    });
    
    // Handle 'Use my location' button
    useMyLocationBtn.addEventListener('click', function() {
        // Clear the input field when using geolocation
        locationInput.value = '';
        
        const weatherPlaceholder = document.getElementById('weatherPlaceholder');
        if (weatherPlaceholder) {
            weatherPlaceholder.textContent = 'Getting your location...';
        }
        
        if (!navigator.geolocation) {
            displayLocationError('Geolocation is not supported by your browser.', 'geocode');
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude.toFixed(5);
                const lon = pos.coords.longitude.toFixed(5);
                
                // Clear previous cache first
                localStorage.removeItem('gardening_last_location');
                
                // Then add new cache with explicit "Your location" name
                localStorage.setItem('gardening_last_location', JSON.stringify({ 
                    type: 'coords', 
                    lat, 
                    lon,
                    locationName: 'Your location' // Explicitly mark this as the user's location
                }));
                
                // Directly update UI without going through displayLocationInfo
                if (weatherPlaceholder) {
                    weatherPlaceholder.innerHTML =
                        `<div class="weather-location-info"><strong>Location:</strong> Your location<br><br>` +
                        `<span style="font-size:0.97em;color:#666;">Latitude: ${lat}, Longitude: ${lon}</span></div>` +
                        `<div id="weatherDataSection">Loading weather data...</div>`;
                }
                
                // Fetch weather directly 
                fetchWeatherData(lat, lon);
                
                // Directly update climate zone
                if (typeof window.showClimateZone === 'function') {
                    console.log(`Directly calling showClimateZone with ${lat}, ${lon} from geolocation`);
                    window.showClimateZone(lat, lon);
                }
            },
            (err) => {
                displayLocationError('Could not get your location. Please allow location access or enter a place name.', 'geocode');
            }
        );
    });
    
    // Save preferences to localStorage
    if (tempUnitSelect) {
        tempUnitSelect.addEventListener('change', () => {
            storageUtils.saveTemperatureUnit(tempUnitSelect.value);
            // Track event in Google Analytics
            if (typeof gtag === 'function') {
                gtag('event', 'change_preference', {
                    'preference_type': 'temperature_unit',
                    'value': tempUnitSelect.value
                });
            }
            if (lastWeatherData) renderWeatherData(lastWeatherData);
        });
    }
    
    if (precipUnitSelect) {
        precipUnitSelect.addEventListener('change', () => {
            storageUtils.savePrecipitationUnit(precipUnitSelect.value);
            // Track event in Google Analytics
            if (typeof gtag === 'function') {
                gtag('event', 'change_preference', {
                    'preference_type': 'precipitation_unit',
                    'value': precipUnitSelect.value
                });
            }
            if (lastWeatherData) renderWeatherData(lastWeatherData);
        });
    }
    
    // Try to restore last location on init
    try {
        // Only restore location if explicitly requested
        const shouldRestoreLocation = true; // You can change this to localStorage.getItem('gardening_restore_location') === 'true'
        
        if (shouldRestoreLocation) {
            const lastLocation = JSON.parse(localStorage.getItem('gardening_last_location'));
            if (lastLocation) {
                console.log('Restoring last location from storage:', lastLocation);
                if (lastLocation.type === 'coords') {
                    // Get the location name (default to "Your location" if not stored)
                    const locationName = lastLocation.locationName || 'Your location';
                    
                    // Directly update UI without going through displayLocationInfo
                    if (weatherPlaceholder) {
                        weatherPlaceholder.innerHTML =
                            `<div class="weather-location-info"><strong>Location:</strong> ${locationName}<br><br>` +
                            `<span style="font-size:0.97em;color:#666;">Latitude: ${lastLocation.lat}, Longitude: ${lastLocation.lon}</span></div>` +
                            `<div id="weatherDataSection">Loading weather data...</div>`;
                    }
                    
                    // Fetch weather directly 
                    fetchWeatherData(lastLocation.lat, lastLocation.lon);
                    
                    // Directly update climate zone
                    if (typeof window.showClimateZone === 'function') {
                        console.log(`Directly calling showClimateZone with ${lastLocation.lat}, ${lastLocation.lon} from restored location`);
                        window.showClimateZone(lastLocation.lat, lastLocation.lon);
                    }
                } else if (lastLocation.type === 'query' && lastLocation.value) {
                    locationInput.value = lastLocation.value;
                    geocodeLocation(lastLocation.value);
                }
            }
        }
    } catch (e) {
        console.error('Error restoring last location:', e);
    }
} 