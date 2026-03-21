/**
 * Storage Utilities Module for Gardening Calendar
 * Handles all localStorage interactions
 */

import { calendarData } from './data.js';

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
    CUSTOM_PERIODS: 'gardening_custom_periods',
    WIND_UNIT: 'gardening_wind_unit',
    TODO_ITEMS: 'gardening_todo_items',
};

// Built-in periods definition
const BUILTIN_PERIODS = [
    { id: 'april', name: 'Early Spring', builtin: true, order: 1 },
    { id: 'may', name: 'Spring', builtin: true, order: 2 },
    { id: 'early_june', name: 'Late Spring', builtin: true, order: 3 }
];

const BUILTIN_ORDER_KEY = 'gardenCal_builtinPeriodOrders';

function getBuiltinOrderOverrides() {
    const stored = localStorage.getItem(BUILTIN_ORDER_KEY);
    return stored ? JSON.parse(stored) : {};
}

function saveBuiltinOrderOverrides(overrides) {
    localStorage.setItem(BUILTIN_ORDER_KEY, JSON.stringify(overrides));
}

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

    document.addEventListener('windUnitChange', (e) => {
        saveWindUnit(e.detail.unit);
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
 * Save wind unit preference
 * @param {string} unit - Wind unit ('ms', 'kmh', or 'mph')
 */
export function saveWindUnit(unit) {
    if (unit === 'ms' || unit === 'kmh' || unit === 'mph') {
        localStorage.setItem(STORAGE_KEYS.WIND_UNIT, unit);
    }
}

/**
 * Get wind unit preference
 * @returns {string} Wind unit ('ms', 'kmh', or 'mph', defaults to 'ms')
 */
export function getWindUnit() {
    const unit = localStorage.getItem(STORAGE_KEYS.WIND_UNIT);
    return (unit === 'ms' || unit === 'kmh' || unit === 'mph') ? unit : 'ms';
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
        windUnit: getWindUnit(),
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
    
    // For each month specified in the plant's months array
    if (plant.months && Array.isArray(plant.months) && plant.months.length > 0) {
        plant.months.forEach(month => {
            // Add to the specified category or default to custom_plants
            const category = plant.category || 'custom_plants';

            // Make sure the month exists in calendar data
            if (!calendarData[month]) {
                calendarData[month] = { custom_plants: [], custom_tasks: [] };
            }

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
    
    // For each month specified in the task's months array
    if (task.months && Array.isArray(task.months) && task.months.length > 0) {
        task.months.forEach(month => {
            // Always add custom tasks to custom_tasks category
            const category = 'custom_tasks';

            // Make sure the month exists in calendar data
            if (!calendarData[month]) {
                calendarData[month] = { custom_plants: [], custom_tasks: [] };
            }

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

            // Make sure the month exists in calendar data
            if (!calendarData[month]) {
                calendarData[month] = { custom_plants: [], custom_tasks: [] };
            }

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

            // Make sure the month exists in calendar data
            if (!calendarData[month]) {
                calendarData[month] = { custom_plants: [], custom_tasks: [] };
            }

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
    const customPeriods = getCustomPeriods();

    // If no entries and no custom periods, show message
    if (entries.plants.length === 0 && entries.tasks.length === 0 && customPeriods.periods.length === 0) {
        alert('No custom entries to export.');
        return;
    }

    // Include custom periods in the export
    const exportData = {
        ...entries,
        customPeriods: customPeriods.periods
    };

    // Create the export file
    const dataStr = JSON.stringify(exportData, null, 2);
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

    // Import custom periods if present
    if (importData.customPeriods && Array.isArray(importData.customPeriods)) {
        const existingPeriods = getCustomPeriods();
        if (replaceExisting) {
            existingPeriods.periods = [];
        }

        importData.customPeriods.forEach(period => {
            // Check if period with this ID already exists
            const existingIndex = existingPeriods.periods.findIndex(p => p.id === period.id);
            if (existingIndex !== -1) {
                // Update existing period name
                existingPeriods.periods[existingIndex].name = period.name;
            } else {
                // Add new period
                existingPeriods.periods.push({
                    id: period.id,
                    name: period.name,
                    order: period.order || existingPeriods.periods.length
                });
            }

            // Initialize calendar data for this period
            if (!calendarData[period.id]) {
                calendarData[period.id] = { custom_plants: [], custom_tasks: [] };
            }
        });

        saveCustomPeriods(existingPeriods);
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

                // Make sure the month exists in calendar data
                if (!calendarData[month]) {
                    calendarData[month] = { custom_plants: [], custom_tasks: [] };
                }

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

                // Make sure the month exists in calendar data
                if (!calendarData[month]) {
                    calendarData[month] = { custom_plants: [], custom_tasks: [] };
                }

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
 * Get custom periods from storage
 * @returns {Object} Object with periods array
 */
export function getCustomPeriods() {
    const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_PERIODS);
    return stored ? JSON.parse(stored) : { periods: [] };
}

/**
 * Save custom periods to storage
 * @param {Object} data - Object with periods array
 */
export function saveCustomPeriods(data) {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_PERIODS, JSON.stringify(data));
}

/**
 * Add a new custom period
 * @param {string} name - Period name
 * @returns {Object} The newly created period
 */
export function addCustomPeriod(name, insertBeforeId) {
    const data = getCustomPeriods();
    const allPeriods = getAllPeriods();

    let order;
    if (insertBeforeId) {
        const target = allPeriods.find(p => p.id === insertBeforeId);
        if (target) {
            order = target.order - 0.5;
        }
    }

    if (order === undefined) {
        // Append at the end
        const maxOrder = allPeriods.length > 0
            ? Math.max(...allPeriods.map(p => p.order || 0))
            : 3;
        order = maxOrder + 1;
    }

    const newPeriod = {
        id: `period_${Date.now()}`,
        name: name,
        order: order
    };
    data.periods.push(newPeriod);
    saveCustomPeriods(data);

    // Initialize empty calendar data for this period
    if (!calendarData[newPeriod.id]) {
        calendarData[newPeriod.id] = {
            custom_plants: [],
            custom_tasks: []
        };
    }

    return newPeriod;
}

/**
 * Rename a custom period
 * @param {string} id - Period ID
 * @param {string} newName - New name for the period
 * @returns {boolean} True if renamed successfully
 */
export function renameCustomPeriod(id, newName) {
    const data = getCustomPeriods();
    const period = data.periods.find(p => p.id === id);
    if (!period) return false;

    period.name = newName;
    saveCustomPeriods(data);
    return true;
}

/**
 * Delete a custom period and all its associated data
 * @param {string} id - Period ID
 * @returns {boolean} True if deleted successfully
 */
export function deleteCustomPeriod(id) {
    const data = getCustomPeriods();
    const index = data.periods.findIndex(p => p.id === id);
    if (index === -1) return false;

    // Remove period from list
    data.periods.splice(index, 1);
    saveCustomPeriods(data);

    // Remove calendar data for this period
    delete calendarData[id];

    // Remove selected items for this period
    const selections = getSelectedItems();
    if (selections[id]) {
        delete selections[id];
        localStorage.setItem(STORAGE_KEYS.SELECTED_ITEMS, JSON.stringify(selections));
    }

    // Remove custom entries that reference this period
    const entries = getCustomEntries();
    let entriesChanged = false;

    entries.plants.forEach(plant => {
        if (plant.months && Array.isArray(plant.months)) {
            const idx = plant.months.indexOf(id);
            if (idx !== -1) {
                plant.months.splice(idx, 1);
                entriesChanged = true;
            }
        }
    });

    entries.tasks.forEach(task => {
        if (task.months && Array.isArray(task.months)) {
            const idx = task.months.indexOf(id);
            if (idx !== -1) {
                task.months.splice(idx, 1);
                entriesChanged = true;
            }
        }
    });

    if (entriesChanged) {
        saveCustomEntries(entries);
    }

    return true;
}

/**
 * Move a period left or right by swapping order values with its neighbor
 * @param {string} periodId - The period ID to move
 * @param {string} direction - 'left' or 'right'
 * @returns {boolean} True if moved successfully
 */
export function movePeriod(periodId, direction) {
    const sorted = getAllPeriods();
    const idx = sorted.findIndex(p => p.id === periodId);
    if (idx === -1) return false;

    const swapIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return false;

    const current = sorted[idx];
    const neighbor = sorted[swapIdx];

    // Swap order values
    const tempOrder = current.order;
    const newCurrentOrder = neighbor.order;
    const newNeighborOrder = tempOrder;

    // Apply to built-in overrides or custom periods
    const overrides = getBuiltinOrderOverrides();
    const customData = getCustomPeriods();

    function applyOrder(period, newOrder) {
        if (period.builtin) {
            overrides[period.id] = newOrder;
        } else {
            const cp = customData.periods.find(p => p.id === period.id);
            if (cp) cp.order = newOrder;
        }
    }

    applyOrder(current, newCurrentOrder);
    applyOrder(neighbor, newNeighborOrder);

    saveBuiltinOrderOverrides(overrides);
    saveCustomPeriods(customData);
    return true;
}

/**
 * Get all periods (built-in + custom), ordered
 * @returns {Array} Array of period objects
 */
export function getAllPeriods() {
    const overrides = getBuiltinOrderOverrides();
    const builtins = BUILTIN_PERIODS.map(p => ({
        ...p,
        order: overrides[p.id] !== undefined ? overrides[p.id] : p.order
    }));

    const customData = getCustomPeriods();
    const customPeriods = customData.periods.map(p => ({
        ...p,
        builtin: false
    }));

    return [...builtins, ...customPeriods].sort((a, b) => a.order - b.order);
}

/**
 * Initialize calendar data entries for all custom periods
 * Ensures custom periods have their data structures in calendarData
 */
export function initializeCustomPeriodData() {
    const customData = getCustomPeriods();
    customData.periods.forEach(period => {
        if (!calendarData[period.id]) {
            calendarData[period.id] = {
                custom_plants: [],
                custom_tasks: []
            };
        }
    });
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

/**
 * Count total selected items across all months and categories
 * @returns {number} Total number of selected items
 */
export function getSelectionCount() {
    const selections = getSelectedItems();
    let count = 0;
    for (const month in selections) {
        for (const category in selections[month]) {
            count += selections[month][category].length;
        }
    }
    return count;
}

/**
 * Get all TODO items
 * @returns {Array} Array of todo items
 */
export function getTodoItems() {
    const stored = localStorage.getItem(STORAGE_KEYS.TODO_ITEMS);
    return stored ? JSON.parse(stored) : [];
}

/**
 * Save TODO items
 * @param {Array} items - Todo items to save
 */
export function saveTodoItems(items) {
    localStorage.setItem(STORAGE_KEYS.TODO_ITEMS, JSON.stringify(items));
}

/**
 * Reorder a custom entry within its array
 * @param {string} type - 'plant' or 'task'
 * @param {string} itemId - The custom entry ID
 * @param {number} newIndex - The target index in the array
 */
export function reorderCustomEntry(type, itemId, newIndex) {
    const entries = getCustomEntries();
    const arr = type === 'plant' ? entries.plants : entries.tasks;
    const oldIndex = arr.findIndex(e => e.id === itemId);
    if (oldIndex === -1 || oldIndex === newIndex) return;

    const [item] = arr.splice(oldIndex, 1);
    arr.splice(newIndex, 0, item);
    saveCustomEntries(entries);
}

// Export all constants
export { STORAGE_KEYS };