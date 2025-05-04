// Gardening Calendar - Weather Module

// Initialize weather functionality
function initWeather() {
    // Set up unit selection listeners
    const tempUnitSelect = document.getElementById('tempUnitSelect');
    const precipUnitSelect = document.getElementById('precipUnitSelect');
    
    if (tempUnitSelect) {
        // Load saved preference
        const savedTempUnit = localStorage.getItem('gardening_temp_unit');
        if (savedTempUnit) {
            tempUnitSelect.value = savedTempUnit;
        }
        
        // Add change listener
        tempUnitSelect.addEventListener('change', function() {
            localStorage.setItem('gardening_temp_unit', this.value);
            updateWeatherDisplay();
        });
    }
    
    if (precipUnitSelect) {
        // Load saved preference
        const savedPrecipUnit = localStorage.getItem('gardening_precip_unit');
        if (savedPrecipUnit) {
            precipUnitSelect.value = savedPrecipUnit;
        }
        
        // Add change listener
        precipUnitSelect.addEventListener('change', function() {
            localStorage.setItem('gardening_precip_unit', this.value);
            updateWeatherDisplay();
        });
    }
}

// Update weather display when unit changes
function updateWeatherDisplay() {
    // Re-render weather if we have data
    if (window.lastWeatherData) {
        displayWeatherData(
            window.lastWeatherData, 
            window.lastWeatherLat, 
            window.lastWeatherLon
        );
    }
}

// Display weather data
function displayWeatherData(data, lat, lon) {
    const weatherDisplay = document.getElementById('weather-info');
    const weatherPlaceholder = document.getElementById('weatherPlaceholder');
    
    if (!weatherDisplay || !data) return;
    
    // Store data for later re-rendering
    window.lastWeatherData = data;
    window.lastWeatherLat = lat;
    window.lastWeatherLon = lon;
    
    // Get preferred units
    const tempUnit = document.getElementById('tempUnitSelect')?.value || 'C';
    const precipUnit = document.getElementById('precipUnitSelect')?.value || 'mm';
    
    // Hide placeholder
    if (weatherPlaceholder) {
        weatherPlaceholder.style.display = 'none';
    }
    
    // Build weather display HTML
    let html = '<div class="weather-content">';
    
    // Current weather section
    if (data.current) {
        html += `
            <div class="current-weather">
                <h3>Current Weather</h3>
                <div class="current-weather-details">
                    <div class="current-temp-icon">
                        <span class="current-temp">
                            ${Math.round(convertTemp(data.current.temp, tempUnit))}${getTempUnitSymbol()}
                        </span>
                        ${data.current.weather && data.current.weather[0] ? 
                            `<img src="https://openweathermap.org/img/wn/${data.current.weather[0].icon}@2x.png" 
                                alt="${data.current.weather[0].description}" 
                                class="weather-icon">` : ''}
                    </div>
                    <div class="current-weather-info">
                        ${data.current.weather && data.current.weather[0] ? 
                            `<div class="weather-desc">${data.current.weather[0].description}</div>` : ''}
                        <div class="feels-like">
                            Feels like: ${Math.round(convertTemp(data.current.feels_like, tempUnit))}${getTempUnitSymbol()}
                        </div>
                        <div class="humidity">
                            Humidity: ${data.current.humidity}%
                        </div>
                        ${data.current.wind_speed ? 
                            `<div class="wind-speed">
                                Wind: ${Math.round(data.current.wind_speed * 3.6)} km/h
                            </div>` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    // Forecast section
    if (data.daily && data.daily.length > 0) {
        html += '<div class="weather-forecast">';
        html += '<h3>7-Day Forecast</h3>';
        html += '<div class="weather-forecast-table-container">';
        html += '<table class="weather-forecast-table">';
        
        // Headers
        html += '<thead><tr>';
        html += '<th>Date</th>';
        html += '<th>Weather</th>';
        html += '<th>Temperature</th>';
        html += `<th>Precip. (${getPrecipUnitSymbol()})</th>`;
        html += '</tr></thead>';
        
        // Body
        html += '<tbody>';
        
        // Prepare data for sparklines
        const hourlyByDay = [];
        const dailyDates = [];
        const hourlyPrecipByDay = [];
        const hourlyWindByDay = [];
        
        // Extract hourly data by day for sparklines
        if (data.hourly) {
            let currentDay = -1;
            let dayIndex = -1;
            
            data.hourly.forEach((hour, i) => {
                const date = new Date(hour.dt * 1000);
                const day = date.getDate();
                
                if (day !== currentDay) {
                    currentDay = day;
                    dayIndex++;
                    hourlyByDay[dayIndex] = [];
                    hourlyPrecipByDay[dayIndex] = [];
                    hourlyWindByDay[dayIndex] = [];
                    dailyDates[dayIndex] = date.toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                    });
                }
                
                hourlyByDay[dayIndex].push(hour.temp);
                hourlyPrecipByDay[dayIndex].push(hour.pop * 10); // Convert 0-1 to mm
                hourlyWindByDay[dayIndex].push(hour.wind_speed * 3.6); // Convert m/s to km/h
            });
        }
        
        // Daily forecast rows
        data.daily.forEach((day, i) => {
            if (i > 6) return; // Only show 7 days
            
            const date = new Date(day.dt * 1000);
            const dateStr = date.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
            
            const minTemp = Math.round(convertTemp(day.temp.min, tempUnit));
            const maxTemp = Math.round(convertTemp(day.temp.max, tempUnit));
            const precip = Math.round(convertPrecip(day.pop * 10, precipUnit) * 10) / 10; // Convert 0-1 to mm/in
            
            html += '<tr>';
            
            // Date column
            html += `<td>${dateStr}</td>`;
            
            // Weather column
            html += '<td class="weather-icon-cell">';
            if (day.weather && day.weather[0]) {
                html += `<img src="https://openweathermap.org/img/wn/${day.weather[0].icon}.png" 
                    alt="${day.weather[0].description}" 
                    class="forecast-weather-icon">
                    <span class="forecast-desc">${day.weather[0].description}</span>`;
            }
            html += '</td>';
            
            // Temperature column with sparkline
            html += '<td class="temp-sparkline-cell">';
            html += `<span class="temp-range">${minTemp}°–${maxTemp}°</span>`;
            
            // Add sparkline if we have hourly data for this day
            if (hourlyByDay[i] && hourlyByDay[i].length > 0) {
                html += renderTempSparkline(hourlyByDay[i], tempUnit, i);
            }
            
            html += '</td>';
            
            // Precipitation column
            html += `<td>${precip}</td>`;
            
            html += '</tr>';
        });
        
        html += '</tbody></table></div></div>';
    }
    
    html += '</div>'; // Close weather-content
    
    // Update display
    weatherDisplay.innerHTML = html;
    
    // Add event listeners for sparklines
    if (data.hourly) {
        addSparklineListeners(
            hourlyByDay, 
            dailyDates, 
            hourlyPrecipByDay, 
            hourlyWindByDay,
            tempUnit,
            precipUnit
        );
    }
}

// Add event delegation for sparkline clicks
function addSparklineListeners(hourlyByDay, dailyDates, hourlyPrecipByDay, hourlyWindByDay, tempUnit, precipUnit) {
    const table = document.querySelector('.weather-forecast-table');
    if (!table) return;
    
    table.addEventListener('click', function(e) {
        const svg = e.target.closest('svg[data-day-index]');
        if (svg) {
            const dayIndex = parseInt(svg.getAttribute('data-day-index'));
            if (!isNaN(dayIndex) && hourlyByDay[dayIndex]) {
                showWeatherModal(
                    dayIndex,
                    dailyDates[dayIndex],
                    hourlyByDay[dayIndex],
                    hourlyPrecipByDay ? hourlyPrecipByDay[dayIndex] : null,
                    hourlyWindByDay ? hourlyWindByDay[dayIndex] : null
                );
            }
        }
    });
}

// Show modal with detailed hourly weather
function showWeatherModal(dayIndex, date, temps, precips, winds) {
    // Track weather detail view in Google Analytics
    if (typeof gtag === 'function') {
        gtag('event', 'view_weather_details', {
            'date': date,
            'day_index': dayIndex
        });
    }
    
    // Remove any existing modal
    const oldModal = document.getElementById('weatherModalOverlay');
    if (oldModal) oldModal.remove();
    
    // Build hourly table
    const tempUnit = document.getElementById('tempUnitSelect')?.value || 'C';
    const precipUnit = document.getElementById('precipUnitSelect')?.value || 'mm';
    
    let hourlyTable = `
        <table class="weather-modal-hourly-table">
            <thead>
                <tr>
                    <th>Hour</th>
                    <th>Temp (${getTempUnitSymbol()})</th>
                    <th>Precip. (${getPrecipUnitSymbol()})</th>
                    <th>Wind (km/h)</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    for (let h = 0; h < temps.length; h++) {
        // Color-code the temperature cell
        const temp = convertTemp(temps[h], tempUnit);
        const tempColor = getTemperatureColor(temp, tempUnit);
        
        // Use the color with reduced opacity for a softer look
        const bgColor = convertHexToRgba(tempColor, 0.25);
        const textColor = '#333333';
        const borderColor = convertHexToRgba(tempColor, 0.5);
        
        const tempHtml = `
            <span style="display:inline-block;background-color:${bgColor};color:${textColor};
                padding:2px 6px;border-radius:4px;font-weight:500;width:100%;
                border:1px solid ${borderColor};">
                ${Math.round(temp)}${getTempUnitSymbol()}
            </span>
        `;
        
        hourlyTable += `
            <tr>
                <td>${h}:00</td>
                <td>${tempHtml}</td>
                <td>${precips && precips[h] !== undefined ? 
                    convertPrecip(precips[h], precipUnit).toFixed(1) : '-'}</td>
                <td>${winds && winds[h] !== undefined ? 
                    Math.round(winds[h]) : '-'}</td>
            </tr>
        `;
    }
    
    hourlyTable += '</tbody></table>';
    
    // Modal HTML
    const modalHtml = `
        <div class="weather-modal-overlay" id="weatherModalOverlay" tabindex="-1">
            <div class="weather-modal" role="dialog" aria-modal="true" aria-labelledby="weatherModalTitle">
                <button class="weather-modal-close" id="weatherModalCloseBtn" aria-label="Close weather details">&times;</button>
                <div class="weather-modal-title" id="weatherModalTitle">Hourly Weather for ${date}</div>
                <div class="weather-modal-chart">${renderLargeTempChart(temps, tempUnit)}</div>
                ${hourlyTable}
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Focus management
    const closeBtn = document.getElementById('weatherModalCloseBtn');
    if (closeBtn) closeBtn.focus();
    
    // Add close handlers
    closeBtn.onclick = () => {
        document.getElementById('weatherModalOverlay').remove();
    };
    
    document.getElementById('weatherModalOverlay').onclick = (e) => {
        if (e.target.id === 'weatherModalOverlay') {
            document.getElementById('weatherModalOverlay').remove();
        }
    };
    
    // Handle escape key
    document.addEventListener('keydown', function handleEscKey(e) {
        if (e.key === 'Escape') {
            document.getElementById('weatherModalOverlay').remove();
            document.removeEventListener('keydown', handleEscKey);
        }
    });
}

// Convert hex color to rgba
function convertHexToRgba(hex, alpha = 1) {
    // Convert shorthand hex (#rgb) to full form (#rrggbb)
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    
    // Parse the hex values
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    if (!result) return `rgba(0, 0, 0, ${alpha})`;
    
    // Convert to decimal values
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Render temperature sparkline
function renderTempSparkline(temps, tempUnit, dayIndex) {
    if (!temps || temps.length === 0) return '';
    
    const w = 120, h = 30;
    const convertedTemps = temps.map(t => convertTemp(t, tempUnit));
    
    // Use local min/max for the height calculations
    const min = Math.min(...convertedTemps);
    const max = Math.max(...convertedTemps);
    const range = max - min || 1;
    
    // Create a smooth curve using cubic bezier
    let path = '';
    const allPoints = [];
    let pathSegments = [];
    
    convertedTemps.forEach((t, i) => {
        const x = (i / (convertedTemps.length - 1)) * (w - 2) + 1;
        const y = h - 10 - ((t - min) / range) * (h - 20);
        allPoints.push({ x, y, temp: t });
    });
    
    // Build smooth path
    if (allPoints.length > 0) {
        path = `M ${allPoints[0].x.toFixed(1)},${allPoints[0].y.toFixed(1)}`;
        
        for (let i = 0; i < allPoints.length - 1; i++) {
            const current = allPoints[i];
            const next = allPoints[i + 1];
            
            // Calculate control points for smooth curve
            const cpx1 = current.x + (next.x - current.x) / 3;
            const cpy1 = current.y;
            const cpx2 = current.x + 2 * (next.x - current.x) / 3;
            const cpy2 = next.y;
            
            const segment = `C${cpx1.toFixed(1)},${cpy1.toFixed(1)} ${cpx2.toFixed(1)},${cpy2.toFixed(1)} ${next.x.toFixed(1)},${next.y.toFixed(1)}`;
            path += ` ${segment}`;
            
            // Store segment with average temperature for coloring
            const avgTemp = (current.temp + next.temp) / 2;
            pathSegments.push({
                segment: segment,
                temp: avgTemp,
                startX: current.x,
                endX: next.x
            });
        }
    }
    
    // Reference lines
    const y0 = h - 10 - ((convertTemp(0, tempUnit) - min) / range) * (h - 20);
    const y20 = h - 10 - ((convertTemp(20, tempUnit) - min) / range) * (h - 20);
    
    // Create multiple colored path segments
    let coloredPaths = '';
    
    if (allPoints.length > 0) {
        pathSegments.forEach((segment, i) => {
            const color = getTemperatureColor(segment.temp, tempUnit);
            coloredPaths += `<path d="M ${segment.startX.toFixed(1)},${allPoints[i].y.toFixed(1)} ${segment.segment}" 
                fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`;
        });
    }
    
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" 
        style="vertical-align:middle;cursor:pointer;" data-day-index="${dayIndex}">
        <polyline fill="none" stroke="#bbb" stroke-width="1" 
            points="0,${y0.toFixed(1)} ${w},${y0.toFixed(1)}" opacity="0.5" />
        <polyline fill="none" stroke="#bbb" stroke-width="1" 
            points="0,${y20.toFixed(1)} ${w},${y20.toFixed(1)}" opacity="0.5" />
        ${coloredPaths}
    </svg>`;
}

// Render a larger temperature chart for the modal
function renderLargeTempChart(temps, tempUnit) {
    if (!temps || temps.length === 0) return '';
    
    const w = 340, h = 100;
    const convertedTemps = temps.map(t => convertTemp(t, tempUnit));
    
    // Use local min/max for height calculations
    const min = Math.min(...convertedTemps);
    const max = Math.max(...convertedTemps);
    const range = max - min || 1;
    
    // Create points and segments similar to the sparkline
    const allPoints = [];
    let pathSegments = [];
    
    convertedTemps.forEach((t, i) => {
        const x = (i / (convertedTemps.length - 1)) * (w - 2) + 1;
        const y = h - 20 - ((t - min) / range) * (h - 40);
        allPoints.push({ x, y, temp: t });
    });
    
    // Build smooth path
    let path = '';
    if (allPoints.length > 0) {
        path = `M ${allPoints[0].x.toFixed(1)},${allPoints[0].y.toFixed(1)}`;
        
        for (let i = 0; i < allPoints.length - 1; i++) {
            const current = allPoints[i];
            const next = allPoints[i + 1];
            
            // Calculate control points for smooth curve
            const cpx1 = current.x + (next.x - current.x) / 3;
            const cpy1 = current.y;
            const cpx2 = current.x + 2 * (next.x - current.x) / 3;
            const cpy2 = next.y;
            
            const segment = `C${cpx1.toFixed(1)},${cpy1.toFixed(1)} ${cpx2.toFixed(1)},${cpy2.toFixed(1)} ${next.x.toFixed(1)},${next.y.toFixed(1)}`;
            path += ` ${segment}`;
            
            // Store segment with average temperature for coloring
            const avgTemp = (current.temp + next.temp) / 2;
            pathSegments.push({
                segment: segment,
                temp: avgTemp,
                startX: current.x,
                endX: next.x
            });
        }
    }
    
    // Reference lines for 0 and 20 (in selected unit)
    const y0 = h - 20 - ((convertTemp(0, tempUnit) - min) / range) * (h - 40);
    const y20 = h - 20 - ((convertTemp(20, tempUnit) - min) / range) * (h - 40);
    const minLabel = Math.round(min) + getTempUnitSymbol();
    const maxLabel = Math.round(max) + getTempUnitSymbol();
    
    // Create multiple colored path segments
    let coloredPaths = '';
    
    if (allPoints.length > 0) {
        pathSegments.forEach((segment, i) => {
            const color = getTemperatureColor(segment.temp, tempUnit);
            coloredPaths += `<path d="M ${segment.startX.toFixed(1)},${allPoints[i].y.toFixed(1)} ${segment.segment}" 
                fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`;
        });
    }
    
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <polyline fill="none" stroke="#bbb" stroke-width="1" 
            points="0,${y0.toFixed(1)} ${w},${y0.toFixed(1)}" opacity="0.5" />
        <polyline fill="none" stroke="#bbb" stroke-width="1" 
            points="0,${y20.toFixed(1)} ${w},${y20.toFixed(1)}" opacity="0.5" />
        ${coloredPaths}
        <text x="2" y="${h - 5}" font-size="11" fill="#888">${minLabel}</text>
        <text x="2" y="15" font-size="11" fill="#888">${maxLabel}</text>
    </svg>`;
}

// Get temperature unit symbol
function getTempUnitSymbol() {
    const tempUnit = document.getElementById('tempUnitSelect')?.value || 'C';
    return tempUnit === 'C' ? '°C' : '°F';
}

// Get precipitation unit symbol
function getPrecipUnitSymbol() {
    const precipUnit = document.getElementById('precipUnitSelect')?.value || 'mm';
    return precipUnit;
}

// Convert temperature based on selected unit
function convertTemp(value, targetUnit) {
    if (targetUnit === 'F') {
        // Convert Celsius to Fahrenheit
        return (value * 9/5) + 32;
    } else {
        // Already in Celsius
        return value;
    }
}

// Convert precipitation based on selected unit
function convertPrecip(value, targetUnit) {
    if (targetUnit === 'in') {
        // Convert mm to inches
        return value / 25.4;
    } else {
        // Already in mm
        return value;
    }
}

// Get color representing temperature
function getTemperatureColor(temp, unit) {
    // Scale temperatures to a color ranging from blue (cold) to red (hot)
    let normalizedTemp;
    
    if (unit === 'C') {
        // Normalize Celsius temps from -10°C to 40°C
        normalizedTemp = (temp + 10) / 50;
    } else {
        // Normalize Fahrenheit temps from 14°F to 104°F
        normalizedTemp = (temp - 14) / 90;
    }
    
    // Clamp between 0 and 1
    normalizedTemp = Math.max(0, Math.min(1, normalizedTemp));
    
    // Map to color (blue to red gradient)
    return getTemperatureGradientColor(normalizedTemp);
}

// Get color from blue-green-red gradient based on normalized value (0-1)
function getTemperatureGradientColor(normalizedValue) {
    // Create a blue to green to red gradient
    if (normalizedValue < 0.5) {
        // Blue to green (0-0.5)
        const g = Math.round((normalizedValue * 2) * 255);
        return `rgb(0,${g},255)`;
    } else {
        // Green to red (0.5-1)
        const scaledValue = (normalizedValue - 0.5) * 2;
        const r = Math.round(scaledValue * 255);
        const g = Math.round((1 - scaledValue) * 255);
        return `rgb(${r},${g},0)`;
    }
}

export { initWeather, updateWeatherDisplay, displayWeatherData }; 