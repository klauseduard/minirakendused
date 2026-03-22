/**
 * Custom Entries Module for Gardening Calendar
 * Handles adding, editing, and removing custom plants and tasks
 */

// Import necessary modules
import { calendarData } from './data.js';
import {
    getCustomEntries, saveCustomEntries,
    addCustomPlant, addCustomTask,
    updateCustomPlant, updateCustomTask,
    deleteCustomPlant, deleteCustomTask,
    getAllPeriods
} from './storage.js';
import { renderCalendar } from './calendar.js';

// DOM Elements
let addCustomPlantBtn;
let addCustomTaskBtn;
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
                    <div id="plantMonthCheckboxes" style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <!-- Period checkboxes generated dynamically -->
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
                    <div id="taskMonthCheckboxes" style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <!-- Period checkboxes generated dynamically -->
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
    // Get the month navigation section and calendar content
    const monthNav = document.querySelector('.month-navigation');
    const calendarContent = document.getElementById('calendarContent');
    const calendarNav = monthNav.querySelector('.calendar-nav');
    
    // Create custom entry buttons container
    const customButtonsContainer = document.createElement('div');
    customButtonsContainer.className = 'custom-entries-toolbar';
    customButtonsContainer.id = 'customEntriesToolbar';

    // Create add plant button
    addCustomPlantBtn = document.createElement('button');
    addCustomPlantBtn.id = 'addCustomPlantBtn';
    addCustomPlantBtn.className = 'toolbar-btn toolbar-btn-add';
    addCustomPlantBtn.innerHTML = '<span>🌸</span><span>Add Custom Plant</span>';

    // Create add task button
    addCustomTaskBtn = document.createElement('button');
    addCustomTaskBtn.id = 'addCustomTaskBtn';
    addCustomTaskBtn.className = 'toolbar-btn toolbar-btn-add';
    addCustomTaskBtn.innerHTML = '<span>📝</span><span>Add Custom Task</span>';
    
    // Add buttons to container
    customButtonsContainer.appendChild(addCustomPlantBtn);
    customButtonsContainer.appendChild(addCustomTaskBtn);
    
    // Insert the custom buttons container between monthNav and calendarContent
    if (calendarContent && calendarContent.parentNode) {
        calendarContent.parentNode.insertBefore(customButtonsContainer, calendarContent);
    } else {
        // Fallback if we can't find calendarContent
        monthNav.parentNode.insertBefore(customButtonsContainer, monthNav.nextSibling);
    }
    
    // calendarNav styling handled by CSS

    // Add a MutationObserver to ensure the toolbar remains visible when switching views
    setupToolbarVisibilityObserver(customButtonsContainer);
}

/**
 * Ensure the custom entries toolbar remains visible when switching views
 * @param {HTMLElement} toolbar - The custom entries toolbar element
 */
function setupToolbarVisibilityObserver(toolbar) {
    // Listen for clicks on the navigation buttons that might affect visibility
    document.querySelectorAll('.quick-jump-btn').forEach(button => {
        button.addEventListener('click', () => {
            // The journal button will hide the toolbar, but the monthly-calendar button should show it
            if (button.dataset.section === 'monthly-calendar') {
                // Short delay to ensure DOM updates are processed
                setTimeout(() => {
                    if (toolbar && toolbar.style.display === 'none') {
                        toolbar.style.display = 'flex';
                    }
                }, 100);
            }
        });
    });
    
    // Also listen for the document event that signals the calendar module is loaded/initialized
    document.addEventListener('calendarModuleLoaded', () => {
        if (toolbar && toolbar.style.display === 'none') {
            toolbar.style.display = 'flex';
        }
    });
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
    
    // Listen for activeMonth changes from calendar module
    // The month buttons are now rendered dynamically, so we use a MutationObserver
    // and also track activeMonth via the global GardeningApp state
    const calendarNav = document.getElementById('calendarNav');
    if (calendarNav) {
        calendarNav.addEventListener('click', (e) => {
            const btn = e.target.closest('.month-btn');
            if (btn && btn.dataset.month) {
                activeMonth = btn.dataset.month;
            }
        });
    }
    
}

/**
 * Populate a checkbox container with all available periods
 * @param {string} containerId - The ID of the container element
 * @param {string} inputName - The name attribute for the checkboxes (e.g., 'plantMonth' or 'taskMonth')
 */
function populatePeriodCheckboxes(containerId, inputName) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    const periods = getAllPeriods();

    periods.forEach(period => {
        const label = document.createElement('label');
        label.style.cssText = 'display: flex; align-items: center; cursor: pointer;';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = inputName;
        checkbox.value = period.id;
        checkbox.style.marginRight = '5px';

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(period.name));
        container.appendChild(label);
    });
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

    // Populate period checkboxes dynamically
    populatePeriodCheckboxes('plantMonthCheckboxes', 'plantMonth');

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

    // Populate period checkboxes dynamically
    populatePeriodCheckboxes('taskMonthCheckboxes', 'taskMonth');

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
    renderCalendar(activeMonth);
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
    renderCalendar(activeMonth);
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
        renderCalendar(activeMonth);
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
        renderCalendar(activeMonth);
    }
}

/**
 * Load custom entries from storage and add to calendar data
 */
export function loadCustomEntries() {
    const entries = getCustomEntries();
    
    // First, clean all custom entries from calendar data
    Object.keys(calendarData).forEach(month => {
        // Clean custom plants from all categories
        Object.keys(calendarData[month] || {}).forEach(category => {
            if (calendarData[month][category] && Array.isArray(calendarData[month][category])) {
                calendarData[month][category] = calendarData[month][category].filter(
                    item => !item.custom
                );
            }
        });
        
        // Reset custom categories to empty arrays
        if (calendarData[month]) {
            calendarData[month]['custom_plants'] = [];
            calendarData[month]['custom_tasks'] = [];
        }
    });
    
    // Load plants
    if (entries.plants && entries.plants.length > 0) {
        entries.plants.forEach(plant => {
            if (plant.months && Array.isArray(plant.months)) {
                plant.months.forEach(month => {
                    const category = plant.category || 'custom_plants';
                    
                    // Make sure month and category exist
                    if (!calendarData[month]) {
                        calendarData[month] = {};
                    }
                    
                    if (!calendarData[month][category]) {
                        calendarData[month][category] = [];
                    }
                    
                    // Add to calendar
                    calendarData[month][category].push({
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
                    if (!calendarData[month]) {
                        calendarData[month] = {};
                    }
                    
                    if (!calendarData[month][category]) {
                        calendarData[month][category] = [];
                    }
                    
                    // Add to calendar
                    calendarData[month][category].push({
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
    loadCustomEntries
}; 