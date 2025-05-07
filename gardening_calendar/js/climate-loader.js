/**
 * Climate Module Loader
 * Imports the climate module and exposes its functions globally
 */
import * as climateModule from './modules/climate.js';

// Expose climate functions to the global scope for backward compatibility
window.climateUtils = climateModule;

// Create specific named exports for direct access
window.koppenGrid = null; // Will be set by the module
window.showClimateZone = climateModule.showClimateZone;
window.renderClimateZoneUI = climateModule.renderClimateZoneUI;
window.round025 = climateModule.round025;
window.getCurrentClimateZone = climateModule.getCurrentClimateZone;
window.getClimateZoneOverride = climateModule.getClimateZoneOverride;
window.setClimateZoneOverride = climateModule.setClimateZoneOverride;
window.clearClimateZoneOverride = climateModule.clearClimateZoneOverride;

// Initialize climate module
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing climate module from loader...');
    
    // Initialize after weather module is loaded
    document.addEventListener('weatherModuleLoaded', () => {
        console.log('Weather module loaded, initializing climate zone...');
        climateModule.initClimateZone();
    });
    
    // If weather module is already loaded, initialize immediately
    if (window.weatherUtils) {
        console.log('Weather module already loaded, initializing climate zone...');
        climateModule.initClimateZone();
    }
});

// Mark that the climate module is loaded
document.dispatchEvent(new CustomEvent('climateModuleLoaded'));
console.log('Climate module loader completed'); 