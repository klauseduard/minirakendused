/**
 * Custom Entries Module for Gardening Calendar
 * Handles adding, editing, and removing custom plants and tasks
 */

// Import necessary modules
import { 
    getCustomEntries, saveCustomEntries, 
    addCustomPlant, addCustomTask,
    updateCustomPlant, updateCustomTask,
    deleteCustomPlant, deleteCustomTask,
    exportCustomEntries, importCustomEntries
} from './storage.js';

// DOM Elements
let addCustomPlantBtn;
let addCustomTaskBtn;
let exportCustomEntriesBtn;
let importCustomEntriesBtn;
let customPlantModal;
let customTaskModal;
let customEntryForm;
let activeMonth = 'april'; // Default active month

/**
 * Initialize custom entries functionality
 * @param {string} initialActiveMonth - Initial active month
 */
export function initCustomEntries(initialActiveMonth) {
    console.log('Initializing custom entries module...');
    
    // Store the active month
    activeMonth = initialActiveMonth || 'april';
    
    // Create custom entries modals
    createCustomModals();
    
    // Add custom entry buttons to the calendar section
    addCustomEntryButtons();
    
    // Get the import/export buttons
    exportCustomEntriesBtn = document.getElementById('exportCustomEntriesBtn');
    importCustomEntriesBtn = document.getElementById('importCustomEntriesBtn');
    
    // Load custom entries from storage
    loadCustomEntries();

    // Set up event listeners
    setupEventListeners();
}

/**
 * Create modals for adding and editing custom entries
 */
function createCustomModals() {
    // Create plant entry modal
    customPlantModal = document.createElement('div');
    customPlantModal.id = 'customPlantModal';
    customPlantModal.className = 'weather-modal-overlay';
    customPlantModal.style.display = 'none';
    customPlantModal.style.zIndex = '1000';
    
    customPlantModal.innerHTML = `
        <div class="weather-modal" style="max-width: 500px; padding: 25px;">
            <button class="weather-modal-close" id="closePlantModalBtn" aria-label="Close plant form">&times;</button>
            <div id="plantModalTitle" style="font-size: 1.2rem; font-weight: 600; color: var(--primary-color); margin-bottom: 15px;">Add Custom Plant</div>
            <form id="customPlantForm">
                <input type="hidden" id="plantEntryId" value="">
                <div style="margin-bottom: 15px;">
                    <label for="plantName" style="display: block; margin-bottom: 5px; font-weight: 500;">Plant Name *</label>
                    <input type="text" id="plantName" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label for="plantDescription" style="display: block; margin-bottom: 5px; font-weight: 500;">Description (optional)</label>
                    <textarea id="plantDescription" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; min-height: 80px;"></textarea>
                </div>
                <div style="margin-bottom: 15px;">
                    <label for="plantCategory" style="display: block; margin-bottom: 5px; font-weight: 500;">Category</label>
                    <select id="plantCategory" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="custom_plants">My Custom Plants</option>
                        <option value="direct_sowing">Direct Sowing</option>
                        <option value="seedling_start">Starting Seedlings</option>
                        <option value="transplanting">Transplanting</option>
                        <option value="greenhouse">Greenhouse</option>
                    </select>
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 10px; font-weight: 500;">Growing Period *</label>
                    <div style="display: flex; gap: 15px;">
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" name="plantMonth" value="april" style="margin-right: 5px;">
                            April
                        </label>
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" name="plantMonth" value="may" style="margin-right: 5px;">
                            May
                        </label>
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" name="plantMonth" value="early_june" style="margin-right: 5px;">
                            Early June
                        </label>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <button type="button" id="deletePlantBtn" class="button" style="background: #f44336; color: white; padding: 8px 16px; border: none; border-radius: 20px; cursor: pointer; display: none;">Delete</button>
                    <div>
                        <button type="button" id="cancelPlantBtn" class="button" style="background: #e0e0e0; color: #333; padding: 8px 16px; border: none; border-radius: 20px; cursor: pointer; margin-right: 10px;">Cancel</button>
                        <button type="submit" id="savePlantBtn" class="button" style="background: var(--primary-color); color: white; padding: 8px 16px; border: none; border-radius: 20px; cursor: pointer;">Save</button>
                    </div>
                </div>
            </form>
        </div>
    `;
    
    // Create task entry modal
    customTaskModal = document.createElement('div');
    customTaskModal.id = 'customTaskModal';
    customTaskModal.className = 'weather-modal-overlay';
    customTaskModal.style.display = 'none';
    customTaskModal.style.zIndex = '1000';
    
    customTaskModal.innerHTML = `
        <div class="weather-modal" style="max-width: 500px; padding: 25px;">
            <button class="weather-modal-close" id="closeTaskModalBtn" aria-label="Close task form">&times;</button>
            <div id="taskModalTitle" style="font-size: 1.2rem; font-weight: 600; color: var(--primary-color); margin-bottom: 15px;">Add Custom Task</div>
            <form id="customTaskForm">
                <input type="hidden" id="taskEntryId" value="">
                <div style="margin-bottom: 15px;">
                    <label for="taskName" style="display: block; margin-bottom: 5px; font-weight: 500;">Task Description *</label>
                    <input type="text" id="taskName" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label for="taskDescription" style="display: block; margin-bottom: 5px; font-weight: 500;">Additional Notes (optional)</label>
                    <textarea id="taskDescription" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; min-height: 80px;"></textarea>
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 10px; font-weight: 500;">When to Perform *</label>
                    <div style="display: flex; gap: 15px;">
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" name="taskMonth" value="april" style="margin-right: 5px;">
                            April
                        </label>
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" name="taskMonth" value="may" style="margin-right: 5px;">
                            May
                        </label>
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" name="taskMonth" value="early_june" style="margin-right: 5px;">
                            Early June
                        </label>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <button type="button" id="deleteTaskBtn" class="button" style="background: #f44336; color: white; padding: 8px 16px; border: none; border-radius: 20px; cursor: pointer; display: none;">Delete</button>
                    <div>
                        <button type="button" id="cancelTaskBtn" class="button" style="background: #e0e0e0; color: #333; padding: 8px 16px; border: none; border-radius: 20px; cursor: pointer; margin-right: 10px;">Cancel</button>
                        <button type="submit" id="saveTaskBtn" class="button" style="background: var(--primary-color); color: white; padding: 8px 16px; border: none; border-radius: 20px; cursor: pointer;">Save</button>
                    </div>
                </div>
            </form>
        </div>
    `;
    
    // Add modals to the body
    document.body.appendChild(customPlantModal);
    document.body.appendChild(customTaskModal);
}

/**
 * Add custom entry buttons to the calendar section
 */
function addCustomEntryButtons() {
    // Get the month navigation section
    const monthNav = document.querySelector('.month-navigation');
    
    // Find the calendar-nav container and the title section
    const monthNavTitle = monthNav.querySelector('.month-nav-title');
    const calendarNav = monthNav.querySelector('.calendar-nav');
    
    // Create custom entry buttons container
    const customButtonsContainer = document.createElement('div');
    customButtonsContainer.className = 'custom-entry-buttons';
    
    // Create add plant button
    addCustomPlantBtn = document.createElement('button');
    addCustomPlantBtn.id = 'addCustomPlantBtn';
    addCustomPlantBtn.className = 'custom-add-btn';
    addCustomPlantBtn.style.padding = '8px 16px';
    addCustomPlantBtn.style.background = 'var(--secondary-color)';
    addCustomPlantBtn.style.color = 'white';
    addCustomPlantBtn.style.border = 'none';
    addCustomPlantBtn.style.borderRadius = '30px';
    addCustomPlantBtn.style.display = 'flex';
    addCustomPlantBtn.style.alignItems = 'center';
    addCustomPlantBtn.style.gap = '5px';
    addCustomPlantBtn.style.fontWeight = '500';
    addCustomPlantBtn.style.cursor = 'pointer';
    addCustomPlantBtn.style.boxShadow = '0 2px 5px var(--shadow)';
    addCustomPlantBtn.style.minWidth = '150px';
    addCustomPlantBtn.style.justifyContent = 'center';
    addCustomPlantBtn.innerHTML = '<span style="font-size: 1.1em;">🌸</span><span>Add Custom Plant</span>';
    
    // Create add task button
    addCustomTaskBtn = document.createElement('button');
    addCustomTaskBtn.id = 'addCustomTaskBtn';
    addCustomTaskBtn.className = 'custom-add-btn';
    addCustomTaskBtn.style.padding = '8px 16px';
    addCustomTaskBtn.style.background = 'var(--secondary-color)';
    addCustomTaskBtn.style.color = 'white';
    addCustomTaskBtn.style.border = 'none';
    addCustomTaskBtn.style.borderRadius = '30px';
    addCustomTaskBtn.style.display = 'flex';
    addCustomTaskBtn.style.alignItems = 'center';
    addCustomTaskBtn.style.gap = '5px';
    addCustomTaskBtn.style.fontWeight = '500';
    addCustomTaskBtn.style.cursor = 'pointer';
    addCustomTaskBtn.style.boxShadow = '0 2px 5px var(--shadow)';
    addCustomTaskBtn.style.minWidth = '150px';
    addCustomTaskBtn.style.justifyContent = 'center';
    addCustomTaskBtn.innerHTML = '<span style="font-size: 1.1em;">📝</span><span>Add Custom Task</span>';
    
    // Add buttons to container
    customButtonsContainer.appendChild(addCustomPlantBtn);
    customButtonsContainer.appendChild(addCustomTaskBtn);
    
    // Create a separation between month nav and custom buttons
    const spacer = document.createElement('div');
    spacer.style.height = '20px';
    
    // Make sure the buttons are prominently placed
    // First add to calendar nav
    if (calendarNav) {
        calendarNav.style.display = 'flex';
        calendarNav.style.flexWrap = 'wrap';
        calendarNav.style.justifyContent = 'space-between';
        calendarNav.style.alignItems = 'center';
        calendarNav.style.gap = '10px';
        
        // Place the buttons after the month buttons
        calendarNav.appendChild(customButtonsContainer);
    } else {
        // Fallback: add container directly to monthNav
        monthNav.appendChild(spacer);
        monthNav.appendChild(customButtonsContainer);
    }
}

/**
 * Setup event listeners for custom entries
 */
function setupEventListeners() {
    // Add plant button click
    addCustomPlantBtn.addEventListener('click', () => {
        openPlantModal();
    });
    
    // Add task button click
    addCustomTaskBtn.addEventListener('click', () => {
        openTaskModal();
    });
    
    // Plant form submission
    document.getElementById('customPlantForm').addEventListener('submit', (e) => {
        e.preventDefault();
        savePlantEntry();
    });
    
    // Task form submission
    document.getElementById('customTaskForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveTaskEntry();
    });
    
    // Cancel buttons
    document.getElementById('cancelPlantBtn').addEventListener('click', () => {
        customPlantModal.style.display = 'none';
    });
    
    document.getElementById('cancelTaskBtn').addEventListener('click', () => {
        customTaskModal.style.display = 'none';
    });
    
    // Close modal buttons
    document.getElementById('closePlantModalBtn').addEventListener('click', () => {
        customPlantModal.style.display = 'none';
    });
    
    document.getElementById('closeTaskModalBtn').addEventListener('click', () => {
        customTaskModal.style.display = 'none';
    });
    
    // Delete buttons
    document.getElementById('deletePlantBtn').addEventListener('click', () => {
        deletePlantEntry();
    });
    
    document.getElementById('deleteTaskBtn').addEventListener('click', () => {
        deleteTaskEntry();
    });
    
    // Click outside to close
    customPlantModal.addEventListener('click', (e) => {
        if (e.target === customPlantModal) {
            customPlantModal.style.display = 'none';
        }
    });
    
    customTaskModal.addEventListener('click', (e) => {
        if (e.target === customTaskModal) {
            customTaskModal.style.display = 'none';
        }
    });
    
    // Month button clicks - update active month
    document.querySelectorAll('.month-btn').forEach(button => {
        button.addEventListener('click', () => {
            activeMonth = button.dataset.month;
        });
    });
    
    // Export custom entries
    if (exportCustomEntriesBtn) {
        exportCustomEntriesBtn.addEventListener('click', () => {
            exportCustomEntries();
        });
    }
    
    // Import custom entries
    if (importCustomEntriesBtn) {
        importCustomEntriesBtn.addEventListener('click', () => {
            showImportModal();
        });
    }
    
    // Set up import modal listeners
    setupImportModalListeners();
}

/**
 * Set up the import modal listeners
 */
function setupImportModalListeners() {
    const importModal = document.getElementById('customEntriesImportModal');
    const fileInput = document.getElementById('customEntriesFileInput');
    const closeBtn = document.getElementById('customImportModalCloseBtn');
    const cancelBtn = document.getElementById('customImportOptionsCancelBtn');
    const importOptions = document.querySelectorAll('#customEntriesImportModal .import-option');
    const optionsContainer = document.getElementById('importOptionsContainer');
    
    // Close button
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            importModal.style.display = 'none';
        });
    }
    
    // Cancel button
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            importModal.style.display = 'none';
        });
    }
    
    // Click outside to close
    importModal.addEventListener('click', (e) => {
        if (e.target === importModal) {
            importModal.style.display = 'none';
        }
    });
    
    // File input change
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const importData = JSON.parse(event.target.result);
                        if (importData && (importData.plants || importData.tasks)) {
                            // Show import options
                            document.getElementById('importCustomStatsMessage').textContent = `Found ${importData.plants?.length || 0} plants and ${importData.tasks?.length || 0} tasks to import.`;
                            optionsContainer.style.display = 'block';
                            
                            // Set up import options
                            importOptions[0].onclick = () => {
                                handleCustomImport(importData, false); // Merge
                            };
                            
                            importOptions[1].onclick = () => {
                                handleCustomImport(importData, true); // Replace
                            };
                        } else {
                            alert('Invalid custom entries file format.');
                        }
                    } catch (error) {
                        console.error('Error parsing import file:', error);
                        alert('Error parsing import file. Please make sure it is a valid JSON file.');
                    }
                };
                reader.readAsText(file);
            }
        });
    }
}

/**
 * Show the import modal
 */
function showImportModal() {
    const importModal = document.getElementById('customEntriesImportModal');
    const fileInput = document.getElementById('customEntriesFileInput');
    const optionsContainer = document.getElementById('importOptionsContainer');
    
    // Reset the file input
    if (fileInput) {
        fileInput.value = '';
    }
    
    // Hide options until file is selected
    if (optionsContainer) {
        optionsContainer.style.display = 'none';
    }
    
    // Reset the message
    document.getElementById('importCustomStatsMessage').textContent = 'Select a file to import custom plants and tasks.';
    
    // Show modal
    importModal.style.display = 'flex';
}

/**
 * Handle custom entries import
 * @param {Object} importData - The import data object
 * @param {boolean} replaceExisting - Whether to replace existing entries
 */
function handleCustomImport(importData, replaceExisting) {
    // Import the data
    const result = importCustomEntries(importData, replaceExisting);
    
    // Hide modal
    const importModal = document.getElementById('customEntriesImportModal');
    importModal.style.display = 'none';
    
    // Refresh calendar to show imported entries
    if (window.renderCalendar) {
        window.renderCalendar(activeMonth);
    }
    
    // Show success message
    const total = (result.plants?.length || 0) + (result.tasks?.length || 0);
    alert(`Successfully imported ${total} custom entries.`);
}

/**
 * Open plant modal for adding or editing a plant
 * @param {string} plantId - Plant ID for editing, null for adding
 */
export function openPlantModal(plantId = null) {
    const modal = document.getElementById('customPlantModal');
    const form = document.getElementById('customPlantForm');
    const title = document.getElementById('plantModalTitle');
    const deleteBtn = document.getElementById('deletePlantBtn');
    
    // Reset form
    form.reset();
    
    // Set default values
    document.getElementById('plantEntryId').value = '';
    
    // Check the current active month by default
    const monthCheckboxes = form.querySelectorAll('input[name="plantMonth"]');
    monthCheckboxes.forEach(checkbox => {
        checkbox.checked = checkbox.value === activeMonth;
    });
    
    if (plantId) {
        // Edit mode
        title.textContent = 'Edit Custom Plant';
        deleteBtn.style.display = 'block';
        
        // Get plant data
        const entries = getCustomEntries();
        const plant = entries.plants.find(p => p.id === plantId);
        
        if (plant) {
            // Populate form
            document.getElementById('plantEntryId').value = plant.id;
            document.getElementById('plantName').value = plant.name || '';
            document.getElementById('plantDescription').value = plant.description || '';
            
            // Set category
            if (plant.category) {
                const categorySelect = document.getElementById('plantCategory');
                for (let i = 0; i < categorySelect.options.length; i++) {
                    if (categorySelect.options[i].value === plant.category) {
                        categorySelect.selectedIndex = i;
                        break;
                    }
                }
            }
            
            // Check months
            if (plant.months && Array.isArray(plant.months)) {
                monthCheckboxes.forEach(checkbox => {
                    checkbox.checked = plant.months.includes(checkbox.value);
                });
            }
        }
    } else {
        // Add mode
        title.textContent = 'Add Custom Plant';
        deleteBtn.style.display = 'none';
    }
    
    // Show modal
    modal.style.display = 'flex';
}

/**
 * Open task modal for adding or editing a task
 * @param {string} taskId - Task ID for editing, null for adding
 */
export function openTaskModal(taskId = null) {
    const modal = document.getElementById('customTaskModal');
    const form = document.getElementById('customTaskForm');
    const title = document.getElementById('taskModalTitle');
    const deleteBtn = document.getElementById('deleteTaskBtn');
    
    // Reset form
    form.reset();
    
    // Set default values
    document.getElementById('taskEntryId').value = '';
    
    // Check the current active month by default
    const monthCheckboxes = form.querySelectorAll('input[name="taskMonth"]');
    monthCheckboxes.forEach(checkbox => {
        checkbox.checked = checkbox.value === activeMonth;
    });
    
    if (taskId) {
        // Edit mode
        title.textContent = 'Edit Custom Task';
        deleteBtn.style.display = 'block';
        
        // Get task data
        const entries = getCustomEntries();
        const task = entries.tasks.find(t => t.id === taskId);
        
        if (task) {
            // Populate form
            document.getElementById('taskEntryId').value = task.id;
            document.getElementById('taskName').value = task.name || '';
            document.getElementById('taskDescription').value = task.description || '';
            
            // Check months
            if (task.months && Array.isArray(task.months)) {
                monthCheckboxes.forEach(checkbox => {
                    checkbox.checked = task.months.includes(checkbox.value);
                });
            }
        }
    } else {
        // Add mode
        title.textContent = 'Add Custom Task';
        deleteBtn.style.display = 'none';
    }
    
    // Show modal
    modal.style.display = 'flex';
}

/**
 * Save plant entry from form
 */
function savePlantEntry() {
    const form = document.getElementById('customPlantForm');
    const plantId = document.getElementById('plantEntryId').value;
    
    // Get form values
    const name = document.getElementById('plantName').value.trim();
    const description = document.getElementById('plantDescription').value.trim();
    const category = document.getElementById('plantCategory').value;
    
    // Get selected months
    const monthCheckboxes = form.querySelectorAll('input[name="plantMonth"]:checked');
    const months = Array.from(monthCheckboxes).map(checkbox => checkbox.value);
    
    if (!name) {
        alert('Please enter a plant name.');
        return;
    }
    
    if (months.length === 0) {
        alert('Please select at least one growing period.');
        return;
    }
    
    // Prepare plant data
    const plantData = {
        name,
        description,
        category,
        months
    };
    
    if (plantId) {
        // Update existing plant
        updateCustomPlant(plantId, plantData);
    } else {
        // Add new plant
        addCustomPlant(plantData);
    }
    
    // Close modal
    customPlantModal.style.display = 'none';
    
    // Refresh calendar to show new plant
    if (window.renderCalendar) {
        window.renderCalendar(activeMonth);
    }
}

/**
 * Save task entry from form
 */
function saveTaskEntry() {
    const form = document.getElementById('customTaskForm');
    const taskId = document.getElementById('taskEntryId').value;
    
    // Get form values
    const name = document.getElementById('taskName').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    
    // Get selected months
    const monthCheckboxes = form.querySelectorAll('input[name="taskMonth"]:checked');
    const months = Array.from(monthCheckboxes).map(checkbox => checkbox.value);
    
    if (!name) {
        alert('Please enter a task description.');
        return;
    }
    
    if (months.length === 0) {
        alert('Please select at least one month when this task should be performed.');
        return;
    }
    
    // Prepare task data
    const taskData = {
        name,
        description,
        months
    };
    
    if (taskId) {
        // Update existing task
        updateCustomTask(taskId, taskData);
    } else {
        // Add new task
        addCustomTask(taskData);
    }
    
    // Close modal
    customTaskModal.style.display = 'none';
    
    // Refresh calendar to show new task
    if (window.renderCalendar) {
        window.renderCalendar(activeMonth);
    }
}

/**
 * Delete plant entry
 */
function deletePlantEntry() {
    const plantId = document.getElementById('plantEntryId').value;
    
    if (!plantId) {
        return;
    }
    
    if (confirm('Are you sure you want to delete this custom plant? This action cannot be undone.')) {
        deleteCustomPlant(plantId);
        
        // Close modal
        customPlantModal.style.display = 'none';
        
        // Refresh calendar
        if (window.renderCalendar) {
            window.renderCalendar(activeMonth);
        }
    }
}

/**
 * Delete task entry
 */
function deleteTaskEntry() {
    const taskId = document.getElementById('taskEntryId').value;
    
    if (!taskId) {
        return;
    }
    
    if (confirm('Are you sure you want to delete this custom task? This action cannot be undone.')) {
        deleteCustomTask(taskId);
        
        // Close modal
        customTaskModal.style.display = 'none';
        
        // Refresh calendar
        if (window.renderCalendar) {
            window.renderCalendar(activeMonth);
        }
    }
}

/**
 * Load custom entries from storage and add to calendar data
 */
export function loadCustomEntries() {
    const entries = getCustomEntries();
    
    // If we have entries, add them to the calendar data
    window.calendarData = window.calendarData || {};
    
    // First, clean all custom entries from calendar data
    Object.keys(window.calendarData).forEach(month => {
        // Clean custom plants from all categories
        Object.keys(window.calendarData[month] || {}).forEach(category => {
            if (window.calendarData[month][category] && Array.isArray(window.calendarData[month][category])) {
                window.calendarData[month][category] = window.calendarData[month][category].filter(
                    item => !item.custom
                );
            }
        });
        
        // Reset custom categories to empty arrays
        if (window.calendarData[month]) {
            window.calendarData[month]['custom_plants'] = [];
            window.calendarData[month]['custom_tasks'] = [];
        }
    });
    
    // Load plants
    if (entries.plants && entries.plants.length > 0) {
        entries.plants.forEach(plant => {
            if (plant.months && Array.isArray(plant.months)) {
                plant.months.forEach(month => {
                    const category = plant.category || 'custom_plants';
                    
                    // Make sure month and category exist
                    if (!window.calendarData[month]) {
                        window.calendarData[month] = {};
                    }
                    
                    if (!window.calendarData[month][category]) {
                        window.calendarData[month][category] = [];
                    }
                    
                    // Add to calendar
                    window.calendarData[month][category].push({
                        en: plant.name,
                        description: plant.description,
                        custom: true,
                        customId: plant.id
                    });
                });
            }
        });
    }
    
    // Load tasks
    if (entries.tasks && entries.tasks.length > 0) {
        entries.tasks.forEach(task => {
            if (task.months && Array.isArray(task.months)) {
                task.months.forEach(month => {
                    // Always use custom_tasks category
                    const category = 'custom_tasks';
                    
                    // Make sure month and category exist
                    if (!window.calendarData[month]) {
                        window.calendarData[month] = {};
                    }
                    
                    if (!window.calendarData[month][category]) {
                        window.calendarData[month][category] = [];
                    }
                    
                    // Add to calendar
                    window.calendarData[month][category].push({
                        en: task.name,
                        description: task.description,
                        custom: true,
                        customId: task.id
                    });
                });
            }
        });
    }
    
    console.log('Custom entries loaded and calendar data updated');
}

// Expose the custom entries API
export default {
    initCustomEntries,
    openPlantModal,
    openTaskModal,
    loadCustomEntries,
    exportCustomEntries,
    importCustomEntries
}; 