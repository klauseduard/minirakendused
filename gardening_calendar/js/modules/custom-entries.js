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
    exportCustomEntries, importCustomEntries,
    getAllPeriods
} from './storage.js';
import { renderCalendar } from './calendar.js';

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
    
    // Find existing export/import buttons
    const exportBtn = document.getElementById('exportCustomEntriesBtn');
    const importBtn = document.getElementById('importCustomEntriesBtn');
    const dataManagementContainer = monthNav.querySelector('.data-management-buttons');
    
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
    
    // Move export/import buttons to our new container if they exist
    if (exportBtn && importBtn) {
        // Create new buttons instead of cloning to avoid event listener issues
        const newExportBtn = document.createElement('button');
        newExportBtn.id = 'customToolbarExportBtn';
        newExportBtn.className = 'toolbar-btn';
        newExportBtn.innerHTML = exportBtn.innerHTML;

        const newImportBtn = document.createElement('button');
        newImportBtn.id = 'customToolbarImportBtn';
        newImportBtn.className = 'toolbar-btn';
        newImportBtn.innerHTML = importBtn.innerHTML;
        
        // Add the new buttons to our container
        customButtonsContainer.appendChild(newExportBtn);
        customButtonsContainer.appendChild(newImportBtn);
        
        // Hide the originals (but don't remove them to avoid breaking functionality)
        exportBtn.style.display = 'none';
        importBtn.style.display = 'none';
        
        // Set up new event listeners for the new buttons
        newExportBtn.addEventListener('click', () => {
            exportCustomEntries();
        });
        
        newImportBtn.addEventListener('click', () => {
            showImportModal();
        });
    }
    
    // Insert the custom buttons container between monthNav and calendarContent
    if (calendarContent && calendarContent.parentNode) {
        calendarContent.parentNode.insertBefore(customButtonsContainer, calendarContent);
    } else {
        // Fallback if we can't find calendarContent
        monthNav.parentNode.insertBefore(customButtonsContainer, monthNav.nextSibling);
    }
    
    // calendarNav styling handled by CSS
    
    // If the data management container is now empty, hide it
    if (dataManagementContainer && exportBtn && importBtn) {
        dataManagementContainer.style.display = 'none';
    }
    
    // Update UI to reflect that we have export/import buttons in the toolbar
    exportCustomEntriesBtn = exportBtn;
    importCustomEntriesBtn = importBtn;
    
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
 * (No-op: the import modal is now created dynamically in showImportModal)
 */
function setupImportModalListeners() {
    // Import modal is created dynamically - no hardcoded listeners needed
}

/**
 * Show the import modal (dynamically created)
 */
function showImportModal() {
    // Remember previously focused element
    const previouslyFocused = document.activeElement;
    const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'weather-modal-overlay modal-overlay-high-z';
    overlay.style.display = 'flex';
    overlay.setAttribute('tabindex', '-1');

    // Create modal body
    const modalBody = document.createElement('div');
    modalBody.className = 'weather-modal modal-body-compact';
    modalBody.setAttribute('role', 'dialog');
    modalBody.setAttribute('aria-modal', 'true');

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'weather-modal-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Close import options');

    // Title
    const titleEl = document.createElement('div');
    titleEl.className = 'modal-title';
    titleEl.textContent = 'Import Custom Entries';

    // Stats message
    const messageEl = document.createElement('div');
    messageEl.className = 'modal-message';
    messageEl.textContent = 'Select a file to import custom plants and tasks.';

    // File input container
    const fileContainer = document.createElement('div');
    fileContainer.style.marginBottom = '15px';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.className = 'modal-file-input';
    fileContainer.appendChild(fileInput);

    // Options container (hidden until file is loaded)
    const optionsContainer = document.createElement('div');
    optionsContainer.style.display = 'none';

    // Merge option
    const mergeOption = document.createElement('div');
    mergeOption.className = 'import-option';

    const mergeIcon = document.createElement('div');
    mergeIcon.className = 'modal-option-icon';
    mergeIcon.textContent = '🔄';

    const mergeContent = document.createElement('div');
    mergeContent.className = 'modal-option-content';

    const mergeTitle = document.createElement('div');
    mergeTitle.className = 'modal-option-title';
    mergeTitle.textContent = 'Merge';

    const mergeDesc = document.createElement('div');
    mergeDesc.className = 'modal-option-desc';
    mergeDesc.textContent = 'Add new entries and update existing ones';

    mergeContent.appendChild(mergeTitle);
    mergeContent.appendChild(mergeDesc);
    mergeOption.appendChild(mergeIcon);
    mergeOption.appendChild(mergeContent);

    // Replace option
    const replaceOption = document.createElement('div');
    replaceOption.className = 'import-option';

    const replaceIcon = document.createElement('div');
    replaceIcon.className = 'modal-option-icon';
    replaceIcon.textContent = '♻️';

    const replaceContent = document.createElement('div');
    replaceContent.className = 'modal-option-content';

    const replaceTitle = document.createElement('div');
    replaceTitle.className = 'modal-option-title';
    replaceTitle.textContent = 'Replace All';

    const replaceDesc = document.createElement('div');
    replaceDesc.className = 'modal-option-desc';
    replaceDesc.textContent = 'Delete all existing entries and use imported ones';

    replaceContent.appendChild(replaceTitle);
    replaceContent.appendChild(replaceDesc);
    replaceOption.appendChild(replaceIcon);
    replaceOption.appendChild(replaceContent);

    optionsContainer.appendChild(mergeOption);
    optionsContainer.appendChild(replaceOption);

    // Cancel button row
    const actionsEl = document.createElement('div');
    actionsEl.className = 'modal-actions-end';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'button modal-btn-cancel';
    cancelBtn.textContent = 'Cancel';

    actionsEl.appendChild(cancelBtn);

    // Assemble modal
    modalBody.appendChild(closeBtn);
    modalBody.appendChild(titleEl);
    modalBody.appendChild(messageEl);
    modalBody.appendChild(fileContainer);
    modalBody.appendChild(optionsContainer);
    modalBody.appendChild(actionsEl);
    overlay.appendChild(modalBody);
    document.body.appendChild(overlay);

    // Close helper
    function closeModal() {
        overlay.remove();
        if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
            previouslyFocused.focus();
        }
    }

    // File input change handler
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importData = JSON.parse(event.target.result);
                    if (importData && (importData.plants || importData.tasks)) {
                        messageEl.textContent = `Found ${importData.plants?.length || 0} plants and ${importData.tasks?.length || 0} tasks to import.`;
                        optionsContainer.style.display = 'block';

                        mergeOption.onclick = () => {
                            handleCustomImport(importData, false, closeModal);
                        };

                        replaceOption.onclick = () => {
                            handleCustomImport(importData, true, closeModal);
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

    // Close handlers
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    // Keyboard: Escape to close, focus trap
    overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            return;
        }
        if (e.key === 'Tab') {
            const focusable = overlay.querySelectorAll(focusableSelectors);
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first || document.activeElement === overlay) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        }
    });

    // Focus the file input
    setTimeout(() => fileInput.focus(), 50);
}

/**
 * Handle custom entries import
 * @param {Object} importData - The import data object
 * @param {boolean} replaceExisting - Whether to replace existing entries
 * @param {Function} closeModal - Function to close the modal
 */
function handleCustomImport(importData, replaceExisting, closeModal) {
    // Import the data
    const result = importCustomEntries(importData, replaceExisting);

    // Close the modal
    if (typeof closeModal === 'function') closeModal();

    // Refresh calendar to show imported entries
    renderCalendar(activeMonth);

    // Show success message
    const total = (result.plants?.length || 0) + (result.tasks?.length || 0);
    alert(`Successfully imported ${total} custom entries.`);
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
    loadCustomEntries,
    exportCustomEntries,
    importCustomEntries
}; 