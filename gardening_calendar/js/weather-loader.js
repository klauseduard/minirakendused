/**
 * Weather Loader Module
 * Imports the weather module and exposes its functions globally
 */
import * as weatherModule from './modules/weather.js';

// Expose weather functions to the global scope for backward compatibility
window.weatherUtils = weatherModule;

// Create specific named exports for direct access
window.weatherCodeToIconTextColor = weatherModule.weatherCodeToIconTextColor;
window.fetchWeatherData = weatherModule.fetchWeatherData;
window.renderWeatherData = weatherModule.renderWeatherData;
window.calcNightDayMinMax = weatherModule.calcNightDayMinMax;
window.groupHourlyByDay = weatherModule.groupHourlyByDay;
window.getTemperatureColor = weatherModule.getTemperatureColor;
window.renderSparkline = weatherModule.renderSparkline;
window.addSparklineListeners = weatherModule.addSparklineListeners;
window.convertTemp = weatherModule.convertTemp;
window.getTempUnitSymbol = weatherModule.getTempUnitSymbol;
window.convertPrecip = weatherModule.convertPrecip;
window.getPrecipUnitSymbol = weatherModule.getPrecipUnitSymbol;
window.displayLocationError = weatherModule.displayLocationError;
window.displayLocationInfo = weatherModule.displayLocationInfo;
window.geocodeLocation = weatherModule.geocodeLocation;

// Connect with climate zone functionality
const originalDisplayLocationInfo = weatherModule.displayLocationInfo;
window.displayLocationInfo = function(name, lat, lon, admin1, admin2, country) {
    // Call original function first
    originalDisplayLocationInfo(name, lat, lon, admin1, admin2, country);
    
    // Then update climate zone if that function exists
    if (typeof window.showClimateZone === 'function') {
        window.showClimateZone(lat, lon);
    }
};

// Initialize weather functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    weatherModule.initWeather();
    console.log("Weather module initialized");
}); 