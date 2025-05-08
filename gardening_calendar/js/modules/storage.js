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
    JOURNAL_DATA: 'gardening_journal_entries',
    CUSTOM_ENTRIES: 'gardening_custom_entries',
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

/**
 * Get all custom entries
 * @returns {Object} Object containing custom plants and tasks by month
 */
export function getCustomEntries() {
    const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_ENTRIES);
    return stored ? JSON.parse(stored) : {
        plants: [],
        tasks: []
    };
}

/**
 * Save all custom entries
 * @param {Object} entries - Object containing custom plants and tasks
 */
export function saveCustomEntries(entries) {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_ENTRIES, JSON.stringify(entries));
}

/**
 * Add a custom plant entry
 * @param {Object} plant - Plant data object
 * @returns {Object} Updated custom entries
 */
export function addCustomPlant(plant) {
    const entries = getCustomEntries();
    
    // Generate a unique ID for the plant
    plant.id = `plant_${Date.now()}`;
    plant.created = new Date().toISOString();
    
    // Add to plants array
    entries.plants.push(plant);
    
    // Add to calendar data
    const calendarData = window.calendarData;
    
    // For each month specified in the plant's months array
    if (plant.months && Array.isArray(plant.months) && plant.months.length > 0) {
        plant.months.forEach(month => {
            // Add to the specified category or default to custom_plants
            const category = plant.category || 'custom_plants';
            
            // Make sure the category exists for this month
            if (!calendarData[month][category]) {
                calendarData[month][category] = [];
            }
            
            // Add the plant to the category
            calendarData[month][category].push({
                en: plant.name,
                description: plant.description,
                custom: true,
                customId: plant.id
            });
        });
    }
    
    // Save the updated custom entries
    saveCustomEntries(entries);
    
    return entries;
}

/**
 * Add a custom task entry
 * @param {Object} task - Task data object
 * @returns {Object} Updated custom entries
 */
export function addCustomTask(task) {
    const entries = getCustomEntries();
    
    // Generate a unique ID for the task
    task.id = `task_${Date.now()}`;
    task.created = new Date().toISOString();
    
    // Add to tasks array
    entries.tasks.push(task);
    
    // Add to calendar data
    const calendarData = window.calendarData;
    
    // For each month specified in the task's months array
    if (task.months && Array.isArray(task.months) && task.months.length > 0) {
        task.months.forEach(month => {
            // Always add custom tasks to custom_tasks category
            const category = 'custom_tasks';
            
            // Make sure the category exists for this month
            if (!calendarData[month][category]) {
                calendarData[month][category] = [];
            }
            
            // Add the task to the category
            calendarData[month][category].push({
                en: task.name,
                description: task.description,
                custom: true,
                customId: task.id
            });
        });
    }
    
    // Save the updated custom entries
    saveCustomEntries(entries);
    
    return entries;
}

/**
 * Update a custom plant entry
 * @param {string} id - Plant ID
 * @param {Object} updatedPlant - Updated plant data
 * @returns {Object|null} Updated plant or null if not found
 */
export function updateCustomPlant(id, updatedPlant) {
    const entries = getCustomEntries();
    const index = entries.plants.findIndex(p => p.id === id);
    
    if (index === -1) {
        return null;
    }
    
    // Get old plant data for comparison
    const oldPlant = entries.plants[index];
    
    // Update the plant
    entries.plants[index] = {
        ...oldPlant,
        ...updatedPlant,
        id: oldPlant.id,
        created: oldPlant.created,
        updated: new Date().toISOString()
    };
    
    // Update plant in calendar data
    const calendarData = window.calendarData;
    
    // First, remove the plant from all old month categories
    if (oldPlant.months && Array.isArray(oldPlant.months)) {
        oldPlant.months.forEach(month => {
            const category = oldPlant.category || 'custom_plants';
            if (calendarData[month] && calendarData[month][category]) {
                calendarData[month][category] = calendarData[month][category].filter(item => 
                    !(item.custom && item.customId === id)
                );
            }
        });
    }
    
    // Then add the plant to all new month categories
    const updatedMethods = entries.plants[index];
    if (updatedMethods.months && Array.isArray(updatedMethods.months)) {
        updatedMethods.months.forEach(month => {
            const category = updatedMethods.category || 'custom_plants';
            
            // Make sure the category exists for this month
            if (!calendarData[month][category]) {
                calendarData[month][category] = [];
            }
            
            // Add the plant to the category
            calendarData[month][category].push({
                en: updatedMethods.name,
                description: updatedMethods.description,
                custom: true,
                customId: id
            });
        });
    }
    
    // Save the updated custom entries
    saveCustomEntries(entries);
    
    return entries.plants[index];
}

/**
 * Update a custom task entry
 * @param {string} id - Task ID
 * @param {Object} updatedTask - Updated task data
 * @returns {Object|null} Updated task or null if not found
 */
export function updateCustomTask(id, updatedTask) {
    const entries = getCustomEntries();
    const index = entries.tasks.findIndex(t => t.id === id);
    
    if (index === -1) {
        return null;
    }
    
    // Get old task data for comparison
    const oldTask = entries.tasks[index];
    
    // Update the task
    entries.tasks[index] = {
        ...oldTask,
        ...updatedTask,
        id: oldTask.id,
        created: oldTask.created,
        updated: new Date().toISOString()
    };
    
    // Update task in calendar data
    const calendarData = window.calendarData;
    
    // First, remove the task from all old month categories
    if (oldTask.months && Array.isArray(oldTask.months)) {
        oldTask.months.forEach(month => {
            if (calendarData[month] && calendarData[month]['custom_tasks']) {
                calendarData[month]['custom_tasks'] = calendarData[month]['custom_tasks'].filter(item => 
                    !(item.custom && item.customId === id)
                );
            }
        });
    }
    
    // Then add the task to all new month categories
    const updatedPlant = entries.tasks[index];
    if (updatedPlant.months && Array.isArray(updatedPlant.months)) {
        updatedPlant.months.forEach(month => {
            // Always use custom_tasks category
            const category = 'custom_tasks';
            
            // Make sure the category exists for this month
            if (!calendarData[month][category]) {
                calendarData[month][category] = [];
            }
            
            // Add the task to the category
            calendarData[month][category].push({
                en: updatedPlant.name,
                description: updatedPlant.description,
                custom: true,
                customId: id
            });
        });
    }
    
    // Save the updated custom entries
    saveCustomEntries(entries);
    
    return entries.tasks[index];
}

/**
 * Delete a custom plant entry
 * @param {string} id - Plant ID
 * @returns {boolean} True if deleted successfully
 */
export function deleteCustomPlant(id) {
    const entries = getCustomEntries();
    const index = entries.plants.findIndex(p => p.id === id);
    
    if (index === -1) {
        return false;
    }
    
    // Get plant data for calendar removal
    const plant = entries.plants[index];
    
    // Remove from plants array
    entries.plants.splice(index, 1);
    
    // Remove from calendar data
    const calendarData = window.calendarData;
    
    if (plant.months && Array.isArray(plant.months)) {
        plant.months.forEach(month => {
            const category = plant.category || 'custom_plants';
            if (calendarData[month] && calendarData[month][category]) {
                calendarData[month][category] = calendarData[month][category].filter(item => 
                    !(item.custom && item.customId === id)
                );
            }
        });
    }
    
    // Save the updated custom entries
    saveCustomEntries(entries);
    
    return true;
}

/**
 * Delete a custom task entry
 * @param {string} id - Task ID
 * @returns {boolean} True if deleted successfully
 */
export function deleteCustomTask(id) {
    const entries = getCustomEntries();
    const index = entries.tasks.findIndex(t => t.id === id);
    
    if (index === -1) {
        return false;
    }
    
    // Get task data for calendar removal
    const task = entries.tasks[index];
    
    // Remove from tasks array
    entries.tasks.splice(index, 1);
    
    // Remove from calendar data
    const calendarData = window.calendarData;
    
    if (task.months && Array.isArray(task.months)) {
        task.months.forEach(month => {
            if (calendarData[month] && calendarData[month]['custom_tasks']) {
                calendarData[month]['custom_tasks'] = calendarData[month]['custom_tasks'].filter(item => 
                    !(item.custom && item.customId === id)
                );
            }
        });
    }
    
    // Save the updated custom entries
    saveCustomEntries(entries);
    
    return true;
}

/**
 * Export custom entries to a file
 */
export function exportCustomEntries() {
    const entries = getCustomEntries();
    
    // If no entries, show message
    if (entries.plants.length === 0 && entries.tasks.length === 0) {
        alert('No custom entries to export.');
        return;
    }
    
    // Create the export file
    const dataStr = JSON.stringify(entries, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    // Generate filename with timestamp
    const date = new Date().toISOString().slice(0, 10);
    const filename = `gardening_custom_entries_${date}.json`;
    
    // Create download link and trigger download
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Import custom entries from a file
 * @param {Object} importData - Imported custom entries data
 * @param {boolean} replaceExisting - Whether to replace all existing entries
 * @returns {Object} Updated custom entries
 */
export function importCustomEntries(importData, replaceExisting = false) {
    let entries = replaceExisting ? { plants: [], tasks: [] } : getCustomEntries();
    
    // Validate import data structure
    if (!importData || typeof importData !== 'object') {
        console.error('Invalid import data format');
        return entries;
    }
    
    // Import plants
    if (importData.plants && Array.isArray(importData.plants)) {
        importData.plants.forEach(plant => {
            // Check if plant with this ID already exists
            const existingIndex = entries.plants.findIndex(p => p.id === plant.id);
            
            if (existingIndex !== -1) {
                // Update existing plant
                entries.plants[existingIndex] = {
                    ...plant,
                    updated: new Date().toISOString()
                };
            } else {
                // Add new plant
                entries.plants.push({
                    ...plant,
                    id: plant.id || `plant_${Date.now()}_${entries.plants.length}`,
                    created: plant.created || new Date().toISOString()
                });
            }
        });
    }
    
    // Import tasks
    if (importData.tasks && Array.isArray(importData.tasks)) {
        importData.tasks.forEach(task => {
            // Check if task with this ID already exists
            const existingIndex = entries.tasks.findIndex(t => t.id === task.id);
            
            if (existingIndex !== -1) {
                // Update existing task
                entries.tasks[existingIndex] = {
                    ...task,
                    updated: new Date().toISOString()
                };
            } else {
                // Add new task
                entries.tasks.push({
                    ...task,
                    id: task.id || `task_${Date.now()}_${entries.tasks.length}`,
                    created: task.created || new Date().toISOString()
                });
            }
        });
    }
    
    // Save imported entries
    saveCustomEntries(entries);
    
    // Update calendar data with custom entries
    const calendarData = window.calendarData;
    
    // Clear existing custom entries from calendar data
    Object.keys(calendarData).forEach(month => {
        if (calendarData[month]['custom_plants']) {
            calendarData[month]['custom_plants'] = [];
        }
        if (calendarData[month]['custom_tasks']) {
            calendarData[month]['custom_tasks'] = [];
        }
    });
    
    // Add plants to calendar
    entries.plants.forEach(plant => {
        if (plant.months && Array.isArray(plant.months)) {
            plant.months.forEach(month => {
                const category = plant.category || 'custom_plants';
                
                // Make sure the category exists for this month
                if (!calendarData[month][category]) {
                    calendarData[month][category] = [];
                }
                
                // Add the plant to the category
                calendarData[month][category].push({
                    en: plant.name,
                    description: plant.description,
                    custom: true,
                    customId: plant.id
                });
            });
        }
    });
    
    // Add tasks to calendar
    entries.tasks.forEach(task => {
        if (task.months && Array.isArray(task.months)) {
            task.months.forEach(month => {
                // Always use custom_tasks category
                const category = 'custom_tasks';
                
                // Make sure the category exists for this month
                if (!calendarData[month][category]) {
                    calendarData[month][category] = [];
                }
                
                // Add the task to the category
                calendarData[month][category].push({
                    en: task.name,
                    description: task.description,
                    custom: true,
                    customId: task.id
                });
            });
        }
    });
    
    return entries;
}

/**
 * Get all journal entries
 * @returns {Array} Array of journal entries
 */
export function getJournalEntries() {
    const stored = localStorage.getItem(STORAGE_KEYS.JOURNAL_DATA);
    return stored ? JSON.parse(stored) : [];
}

/**
 * Save journal entries
 * @param {Array} entries - Journal entries to save
 */
export function saveJournalEntries(entries) {
    localStorage.setItem(STORAGE_KEYS.JOURNAL_DATA, JSON.stringify(entries));
}

// Export all constants
export { STORAGE_KEYS }; 