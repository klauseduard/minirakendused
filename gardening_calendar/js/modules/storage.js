/**
 * Storage Utilities Module for Gardening Calendar
 * Handles all localStorage interactions
 */

// Constants for storage keys
const STORAGE_KEYS = {
    SELECTED_ITEMS: 'gardening_selected_items',
    LAST_LOCATION: 'gardening_last_location',
    TEMP_UNIT: 'gardening_temp_unit',
    PRECIP_UNIT: 'gardening_precip_unit',
    LANGUAGE: 'gardening_language',
    CLIMATE_ZONE_OVERRIDE: 'gardening_climate_zone_override',
    JOURNAL_DATA: 'gardening_journal_data',
};

/**
 * Initialize the storage module
 * Loads preferences and sets up any required event listeners
 */
export function initStorage() {
    console.log('Initializing storage module...');
    
    // Load user preferences
    const preferences = loadPreferences();
    
    // Log loaded preferences for debugging
    console.log('Loaded user preferences:', preferences);
    
    // Set up event listeners for preference changes if needed
    document.addEventListener('temperatureUnitChange', (e) => {
        saveTemperatureUnit(e.detail.unit);
    });
    
    document.addEventListener('precipitationUnitChange', (e) => {
        savePrecipitationUnit(e.detail.unit);
    });
    
    return preferences;
}

/**
 * Get selected plants and tasks
 * @returns {Object} Selected items object organized by month and category
 */
export function getSelectedItems() {
    const stored = localStorage.getItem(STORAGE_KEYS.SELECTED_ITEMS);
    return stored ? JSON.parse(stored) : {};
}

/**
 * Check if an item is selected
 * @param {string} month - Month name
 * @param {string} category - Category name
 * @param {Object|string} item - Item to check
 * @returns {boolean} True if item is selected
 */
export function isItemSelected(month, category, item) {
    const selections = getSelectedItems();
    
    // Check if we have any selections for this month and category
    if (!selections[month] || !selections[month][category]) {
        return false;
    }
    
    // For object items (like plants), compare by their English name
    if (typeof item === 'object' && item.en) {
        const matchFound = selections[month][category].some(selected => 
            typeof selected === 'object' && selected.en === item.en
        );
        return matchFound;
    }
    
    // For string items or other types, use direct includes check
    return selections[month][category].includes(item);
}

/**
 * Toggle item selection status
 * @param {string} month - Month name
 * @param {string} category - Category name
 * @param {Object|string} item - Item to toggle
 * @param {boolean} selected - Whether item should be selected
 */
export function toggleItemSelection(month, category, item, selected) {
    const selections = getSelectedItems();
    
    // Initialize nested structure if needed
    if (!selections[month]) selections[month] = {};
    if (!selections[month][category]) selections[month][category] = [];
    
    const items = selections[month][category];
    
    // For object items (like plants), find by comparing English name
    let index = -1;
    if (typeof item === 'object' && item.en) {
        index = items.findIndex(existingItem => 
            typeof existingItem === 'object' && existingItem.en === item.en
        );
    } else {
        // For string items or other types, use indexOf
        index = items.indexOf(item);
    }
    
    if (selected && index === -1) {
        // Store a clean copy without any DOM-related attributes
        if (typeof item === 'object') {
            // We store only the essential data (language keys)
            const cleanItem = { type: 'plant' };
            if (item.en) cleanItem.en = item.en;
            if (item.et) cleanItem.et = item.et;
            items.push(cleanItem);
        } else {
            items.push(item);
        }
    } else if (!selected && index !== -1) {
        // Log details of the deselected item for debugging
        console.log('Removing:', JSON.stringify(items[index]));
        items.splice(index, 1);
    }
    
    // Clean up empty arrays and objects
    if (items.length === 0) delete selections[month][category];
    if (Object.keys(selections[month]).length === 0) delete selections[month];
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.SELECTED_ITEMS, JSON.stringify(selections));
    
    // Log the updated selections for debugging
    console.log('Item operation:', selected ? 'select' : 'deselect', item.en || item);
    console.log('Updated selections for', month, category, ':', JSON.stringify(selections[month]?.[category] || []));
    
    return selections;
}

/**
 * Save last used location
 * @param {Object} locationData - Location data object
 */
export function saveLastLocation(locationData) {
    localStorage.setItem(STORAGE_KEYS.LAST_LOCATION, JSON.stringify(locationData));
}

/**
 * Get last used location
 * @returns {Object|null} Last location or null if not available
 */
export function getLastLocation() {
    const cached = localStorage.getItem(STORAGE_KEYS.LAST_LOCATION);
    return cached ? JSON.parse(cached) : null;
}

/**
 * Save climate zone override
 * @param {string} zoneCode - Climate zone code
 */
export function saveClimateZoneOverride(zoneCode) {
    if (zoneCode) {
        localStorage.setItem(STORAGE_KEYS.CLIMATE_ZONE_OVERRIDE, zoneCode);
    } else {
        localStorage.removeItem(STORAGE_KEYS.CLIMATE_ZONE_OVERRIDE);
    }
}

/**
 * Get climate zone override
 * @returns {string|null} Climate zone code or null if not set
 */
export function getClimateZoneOverride() {
    return localStorage.getItem(STORAGE_KEYS.CLIMATE_ZONE_OVERRIDE);
}

/**
 * Save temperature unit preference
 * @param {string} unit - Temperature unit ('C' or 'F')
 */
export function saveTemperatureUnit(unit) {
    if (unit === 'C' || unit === 'F') {
        localStorage.setItem(STORAGE_KEYS.TEMP_UNIT, unit);
    }
}

/**
 * Get temperature unit preference
 * @returns {string} Temperature unit ('C' or 'F', defaults to 'C')
 */
export function getTemperatureUnit() {
    const unit = localStorage.getItem(STORAGE_KEYS.TEMP_UNIT);
    return (unit === 'C' || unit === 'F') ? unit : 'C';
}

/**
 * Save precipitation unit preference
 * @param {string} unit - Precipitation unit ('mm' or 'in')
 */
export function savePrecipitationUnit(unit) {
    if (unit === 'mm' || unit === 'in') {
        localStorage.setItem(STORAGE_KEYS.PRECIP_UNIT, unit);
    }
}

/**
 * Get precipitation unit preference
 * @returns {string} Precipitation unit ('mm' or 'in', defaults to 'mm')
 */
export function getPrecipitationUnit() {
    const unit = localStorage.getItem(STORAGE_KEYS.PRECIP_UNIT);
    return (unit === 'mm' || unit === 'in') ? unit : 'mm';
}

/**
 * Save language preference
 * @param {string} lang - Language code
 */
export function saveLanguage(lang) {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
}

/**
 * Get language preference
 * @returns {string} Language code (defaults to 'en')
 */
export function getLanguage() {
    return localStorage.getItem(STORAGE_KEYS.LANGUAGE) || 'en';
}

/**
 * Load all preferences at once
 * @returns {Object} Object containing all user preferences
 */
export function loadPreferences() {
    return {
        temperatureUnit: getTemperatureUnit(),
        precipitationUnit: getPrecipitationUnit(),
        language: getLanguage(),
        lastLocation: getLastLocation(),
        climateZoneOverride: getClimateZoneOverride()
    };
}

// Export all constants
export { STORAGE_KEYS }; 