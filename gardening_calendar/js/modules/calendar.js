/**
 * Calendar Module for Gardening Calendar
 * Handles all calendar rendering and interaction functionality
 */

import { calendarData, translations, categoryIcons, categoryNames } from './data.js';
import { getSelectedItems, isItemSelected, toggleItemSelection,
         getAllPeriods, addCustomPeriod, renameCustomPeriod, deleteCustomPeriod,
         initializeCustomPeriodData, getSelectionCount } from './storage.js';
import { showNotification } from './ui.js';
import { openPlantModal, openTaskModal, loadCustomEntries } from './custom-entries.js';
import { initSocialSharing, shareContent } from './social.js';

/**
 * Update the selection badge with the current count of selected items
 */
export function updateSelectionBadge() {
    const badge = document.getElementById('selectionBadge');
    if (!badge) return;
    const count = getSelectionCount();
    if (count > 0) {
        badge.textContent = `${count} selected`;
        badge.classList.remove('hidden-default');
    } else {
        badge.classList.add('hidden-default');
    }
}

/**
 * Render the calendar for the specified month with optional search filtering
 * @param {string} month - The month to render (e.g., 'april', 'may', 'early_june')
 * @param {string} searchTerm - Optional search term to filter calendar items
 */
export function renderCalendar(month, searchTerm = '') {
    // Get the calendar content element
    const calendarContent = document.getElementById('calendarContent');
    
    // Ensure grid display
    calendarContent.style.display = 'grid';
    
    // Clear content
    calendarContent.innerHTML = '';
    
    // Get current language from shared app state
    const currentLang = window.GardeningApp?.currentLang || 'en';
    
    // Check if month has data
    if (!calendarData[month]) {
        calendarContent.innerHTML = `<div class="no-results">${translations[currentLang].no_data_available || 'No data available'}</div>`;
        return;
    }
    
    // Ensure custom entries categories exist
    if (!calendarData[month]['custom_plants']) {
        calendarData[month]['custom_plants'] = [];
    }
    if (!calendarData[month]['custom_tasks']) {
        calendarData[month]['custom_tasks'] = [];
    }
    
    // Show categories
    const categories = Object.keys(calendarData[month]);
    
    // Filter for search
    let hasResults = false;
    let delay = 0;
    
    categories.forEach(category => {
        const items = calendarData[month][category];
        let filteredItems = items;
        
        // Skip empty categories, except for custom entries categories
        if ((!items || items.length === 0) && category !== 'custom_plants' && category !== 'custom_tasks') {
            return;
        }
        
        // Apply filter if search term exists
        if (searchTerm) {
            filteredItems = items.filter(item => {
                const itemText = item[currentLang] || item.en;
                return itemText.toLowerCase().includes(searchTerm.toLowerCase());
            });
        }
        
        // Don't show category if no results after filtering and it's not a custom category
        if (filteredItems.length === 0 && searchTerm && category !== 'custom_plants' && category !== 'custom_tasks') {
            return;
        }
        
        hasResults = true;
        
        // Create category card
        const categoryCard = document.createElement('div');
        const categoryClass = 'category-card';
        categoryCard.className = `${categoryClass} fade-in`;
        categoryCard.style.animationDelay = `${delay}ms`;
        delay += 100;
        
        // Icon and title
        const isTaskCategory = category === 'garden_tasks' || category === 'custom_tasks';
        const isCustomCategory = category === 'custom_plants' || category === 'custom_tasks';
        const categoryDisplayName = translations[currentLang][category] || categoryNames[category] || category;
        
        categoryCard.innerHTML = `
            <div class="category-header">
                <div class="category-icon">${categoryIcons[category] || '🌿'}</div>
                <h2 class="category-title">${categoryDisplayName}</h2>
            </div>
            <div class="select-all-container">
                <label class="select-all-label">
                    <input type="checkbox" class="select-all-checkbox" data-category="${category}">
                    <span>Select All ${isTaskCategory ? 'Tasks' : 'Plants'}</span>
                </label>
            </div>
            <ul class="plant-list">
                ${filteredItems.map(item => {
                    const itemText = item[currentLang] || item.en;
                    const itemId = JSON.stringify(item); // Store the full item object
                    const displayText = searchTerm ? highlightText(itemText, searchTerm) : itemText;
                    
                    // Add edit button for custom items
                    const editButton = item.custom ? `
                        <div class="custom-item-actions">
                            <button class="custom-item-edit-btn" data-id="${item.customId}" data-type="${isTaskCategory ? 'task' : 'plant'}" 
                                aria-label="Edit ${isTaskCategory ? 'task' : 'plant'}">
                                <span>✏️</span>
                            </button>
                            <button class="custom-item-delete-btn" data-id="${item.customId}" data-type="${isTaskCategory ? 'task' : 'plant'}"
                                aria-label="Delete ${isTaskCategory ? 'task' : 'plant'}">
                                <span>❌</span>
                            </button>
                        </div>
                    ` : '';
                    
                    return `
                        <li class="${isTaskCategory ? 'task-item' : 'plant-item'}${item.custom ? ' custom-item' : ''}" data-item-id="${encodeURIComponent(itemId)}">
                            <label class="item-label">
                                <input type="checkbox" class="item-checkbox" 
                                    ${isItemSelected(month, category, item) ? 'checked' : ''}>
                                <span class="item-text">${displayText}</span>
                                ${editButton}
                            </label>
                        </li>
                    `;
                }).join('')}
                ${(category === 'custom_plants' || category === 'custom_tasks') && filteredItems.length === 0 ? `
                    <li class="empty-custom-entries" style="padding: 15px; color: #666; text-align: center; font-style: italic;">
                        ${category === 'custom_plants' ? 'No custom plants added yet. Use the "Add Custom Plant" button above.' : 'No custom tasks added yet. Use the "Add Custom Task" button above.'}
                    </li>
                ` : ''}
            </ul>
        `;

        // Add event listeners for checkboxes
        categoryCard.querySelectorAll('.item-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const itemJson = decodeURIComponent(e.target.closest('li').dataset.itemId);
                const item = JSON.parse(itemJson);
                toggleItemSelection(month, category, item, e.target.checked);
                // Update the "Select All" checkbox status
                updateSelectAllCheckbox(month, category);
                updateSelectionBadge();
            });
        });
        
        // Add click event for custom items 
        categoryCard.querySelectorAll('.custom-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Only handle direct clicks on the item, not on buttons or checkboxes
                if (e.target.closest('.custom-item-actions') || e.target.closest('.item-checkbox')) {
                    return;
                }
                
                const editBtn = item.querySelector('.custom-item-edit-btn');
                if (editBtn) {
                    const id = editBtn.dataset.id;
                    const type = editBtn.dataset.type;
                    
                    if (type === 'plant') {
                        openPlantModal(id);
                    } else if (type === 'task') {
                        openTaskModal(id);
                    }
                }
            });
        });

        // Add edit buttons for custom items
        categoryCard.querySelectorAll('.custom-item-edit-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent the checkbox from being toggled
                e.stopPropagation(); // Stop event bubbling

                const id = button.dataset.id;
                const type = button.dataset.type;

                if (type === 'plant') {
                    openPlantModal(id);
                } else if (type === 'task') {
                    openTaskModal(id);
                }
            });
        });
        
        // Add delete buttons for custom items
        categoryCard.querySelectorAll('.custom-item-delete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent the checkbox from being toggled
                e.stopPropagation(); // Stop event bubbling
                
                const id = button.dataset.id;
                const type = button.dataset.type;
                
                // Visual feedback before confirmation
                const itemLi = button.closest('li');
                
                try {
                    if (type === 'plant') {
                        if (confirm('Are you sure you want to delete this custom plant? This action cannot be undone.')) {
                            // Visual feedback
                            if (itemLi) {
                                itemLi.style.opacity = '0.5';
                                itemLi.style.pointerEvents = 'none';
                            }

                            // Import function directly
                            import('../modules/storage.js').then(module => {
                                const success = module.deleteCustomPlant(id);

                                if (success) {
                                    // Clean all custom entries and reload them
                                    loadCustomEntries();

                                    // Re-render the calendar
                                    renderCalendar(month, searchTerm);

                                    showNotification('Custom plant deleted successfully', 'success');
                                } else {
                                    // Restore the item if deletion failed
                                    if (itemLi) {
                                        itemLi.style.opacity = '';
                                        itemLi.style.pointerEvents = '';
                                    }
                                }
                            });
                        }
                    } else if (type === 'task') {
                        if (confirm('Are you sure you want to delete this custom task? This action cannot be undone.')) {
                            // Visual feedback
                            if (itemLi) {
                                itemLi.style.opacity = '0.5';
                                itemLi.style.pointerEvents = 'none';
                            }

                            // Import function directly
                            import('../modules/storage.js').then(module => {
                                const success = module.deleteCustomTask(id);

                                if (success) {
                                    // Clean all custom entries and reload them
                                    loadCustomEntries();

                                    // Re-render the calendar
                                    renderCalendar(month, searchTerm);

                                    showNotification('Custom task deleted successfully', 'success');
                                } else {
                                    // Restore the item if deletion failed
                                    if (itemLi) {
                                        itemLi.style.opacity = '';
                                        itemLi.style.pointerEvents = '';
                                    }
                                }
                            });
                        }
                    }
                } catch (error) {
                    console.error('Error during delete operation:', error);
                    // Restore the item if an error occurred
                    if (itemLi) {
                        itemLi.style.opacity = '';
                        itemLi.style.pointerEvents = '';
                    }
                }
            });
        });
        
        calendarContent.appendChild(categoryCard);
    });
    
    // If no results found
    if (!hasResults) {
        calendarContent.innerHTML = `<div class="no-results">${translations[currentLang].no_results || 'No results found for your search.'}</div>`;
    }

    // Add event listeners for "Select All" checkboxes
    const selectAllCheckboxes = document.querySelectorAll('.select-all-checkbox');
    selectAllCheckboxes.forEach(checkbox => {
        const category = checkbox.dataset.category;
        
        // Initial state: check if all items are selected
        const categoryItems = calendarData[month][category] || [];
        if (categoryItems.length > 0) {
            // Check if ALL items in this category are selected
            let allSelected = true;
            for (let i = 0; i < categoryItems.length; i++) {
                if (!isItemSelected(month, category, categoryItems[i])) {
                    allSelected = false;
                    break;
                }
            }
            checkbox.checked = allSelected;
        }
        
        // Add change event
        checkbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            const categoryCard = e.target.closest('.category-card');
            const checkboxes = categoryCard.querySelectorAll('.item-checkbox');
            
            // Update all checkboxes in this category
            checkboxes.forEach(itemCheckbox => {
                if (itemCheckbox.checked !== isChecked) {
                    itemCheckbox.checked = isChecked;
                    
                    // Get and update the item
                    const itemLi = itemCheckbox.closest('li');
                    const itemJson = decodeURIComponent(itemLi.dataset.itemId);
                    const item = JSON.parse(itemJson);
                    toggleItemSelection(month, category, item, isChecked);
                }
            });
            
            // Update the "Select All" checkbox status once after all items are processed
            updateSelectAllCheckbox(month, category);
            updateSelectionBadge();
        });
    });
}

/**
 * Search the calendar for the specified term
 * @param {string} searchTerm - Term to search for
 * @param {string} activeMonth - The current active month
 */
export function searchCalendar(activeMonth, searchTerm) {
    renderCalendar(activeMonth, searchTerm);
}

/**
 * Highlight search term in text
 * @param {string} text - Text to highlight search term in
 * @param {string} searchTerm - Term to highlight
 * @returns {string} Text with highlighted search term
 */
export function highlightText(text, searchTerm) {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

/**
 * Escape special characters in regular expression
 * @param {string} string - String to escape
 * @returns {string} Escaped string
 */
export function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Update the "Select All" checkbox status for a category
 * @param {string} month - Month name
 * @param {string} category - Category name
 */
export function updateSelectAllCheckbox(month, category) {
    const selectAllCheckbox = document.querySelector(`.select-all-checkbox[data-category="${category}"]`);
    if (!selectAllCheckbox) return;
    
    const categoryItems = calendarData[month][category] || [];
    if (categoryItems.length === 0) return;
    
    // Check if ALL items in this category are selected
    let allSelected = true;
    for (let i = 0; i < categoryItems.length; i++) {
        if (!isItemSelected(month, category, categoryItems[i])) {
            allSelected = false;
            break;
        }
    }
    
    selectAllCheckbox.checked = allSelected;
}

// Track whether the global menu close listener has been registered
let periodMenuListenerAdded = false;

/**
 * Render period buttons dynamically
 * @param {Array} periods - Array of period objects from getAllPeriods()
 * @param {string} activeMonth - The currently active month/period ID
 */
export function renderPeriodButtons(periods, activeMonth) {
    const calendarNav = document.getElementById('calendarNav');
    if (!calendarNav) return;

    calendarNav.innerHTML = '';

    // Close any open menus when clicking outside (register only once)
    if (!periodMenuListenerAdded) {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.period-btn-wrapper')) {
                document.querySelectorAll('.period-actions-menu').forEach(menu => {
                    menu.style.display = 'none';
                });
            }
        });
        periodMenuListenerAdded = true;
    }

    periods.forEach(period => {
        if (period.builtin) {
            // Simple button for built-in periods
            const btn = document.createElement('button');
            btn.className = `month-btn${period.id === activeMonth ? ' active' : ''}`;
            btn.dataset.month = period.id;
            btn.textContent = period.name;
            btn.addEventListener('click', () => handlePeriodClick(period.id));
            calendarNav.appendChild(btn);
        } else {
            // Wrapper with actions menu for custom periods
            const wrapper = document.createElement('div');
            wrapper.className = 'period-btn-wrapper';

            const btn = document.createElement('button');
            btn.className = `month-btn${period.id === activeMonth ? ' active' : ''}`;
            btn.dataset.month = period.id;
            btn.textContent = period.name;
            btn.addEventListener('click', () => handlePeriodClick(period.id));

            const actionsBtn = document.createElement('button');
            actionsBtn.className = 'period-actions-btn';
            actionsBtn.textContent = '\u22EE';
            actionsBtn.title = 'Period options';
            actionsBtn.setAttribute('aria-label', `Options for ${period.name}`);

            const menu = document.createElement('div');
            menu.className = 'period-actions-menu';

            const renameBtn = document.createElement('button');
            renameBtn.textContent = 'Rename';
            renameBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.style.display = 'none';
                handleRenamePeriod(period);
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.style.color = '#f44336';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.style.display = 'none';
                handleDeletePeriod(period);
            });

            menu.appendChild(renameBtn);
            menu.appendChild(deleteBtn);

            actionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close all other menus
                document.querySelectorAll('.period-actions-menu').forEach(m => {
                    if (m !== menu) m.style.display = 'none';
                });
                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
            });

            wrapper.appendChild(btn);
            wrapper.appendChild(actionsBtn);
            wrapper.appendChild(menu);
            calendarNav.appendChild(wrapper);
        }
    });
}

/**
 * Handle clicking a period button
 * @param {string} periodId - The period ID to switch to
 */
function handlePeriodClick(periodId) {
    // Update active state on all month buttons
    document.querySelectorAll('.month-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.month-btn[data-month="${periodId}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    window.GardeningApp.activeMonth = periodId;
    renderCalendar(periodId);
}

/**
 * Handle renaming a custom period
 * @param {Object} period - The period to rename
 */
function handleRenamePeriod(period) {
    const newName = prompt('Enter new name for this period:', period.name);
    if (newName && newName.trim() && newName.trim() !== period.name) {
        renameCustomPeriod(period.id, newName.trim());
        // Re-render buttons
        const periods = getAllPeriods();
        renderPeriodButtons(periods, window.GardeningApp.activeMonth);
        showNotification(`Period renamed to "${newName.trim()}"`, 'success');
    }
}

/**
 * Handle deleting a custom period
 * @param {Object} period - The period to delete
 */
function handleDeletePeriod(period) {
    if (confirm(`Delete period "${period.name}"? All plants and tasks in this period will be lost. This cannot be undone.`)) {
        const wasActive = window.GardeningApp.activeMonth === period.id;
        deleteCustomPeriod(period.id);

        // If the deleted period was active, switch to the first available period
        if (wasActive) {
            const periods = getAllPeriods();
            window.GardeningApp.activeMonth = periods[0]?.id || 'april';
            renderCalendar(window.GardeningApp.activeMonth);
        }

        // Re-render buttons
        const periods = getAllPeriods();
        renderPeriodButtons(periods, window.GardeningApp.activeMonth);
        showNotification(`Period "${period.name}" deleted`, 'success');
    }
}

/**
 * Handle adding a new custom period
 */
function handleAddPeriod() {
    const name = prompt('Enter a name for the new growing period:');
    if (name && name.trim()) {
        const newPeriod = addCustomPeriod(name.trim());

        // Switch to the new period
        window.GardeningApp.activeMonth = newPeriod.id;

        // Re-render buttons and calendar
        const periods = getAllPeriods();
        renderPeriodButtons(periods, newPeriod.id);
        renderCalendar(newPeriod.id);

        showNotification(`Period "${name.trim()}" added`, 'success');
    }
}

/**
 * Initialize the calendar module
 * @param {string} initialMonth - The initial month to display
 */
export function initCalendar(initialMonth) {
    console.log('Initializing calendar module...');

    // Initialize calendar data for custom periods
    initializeCustomPeriodData();

    // Render period buttons dynamically
    const periods = getAllPeriods();
    renderPeriodButtons(periods, initialMonth);

    // Set up the "Add Period" button
    const addPeriodBtn = document.getElementById('addPeriodBtn');
    if (addPeriodBtn) {
        addPeriodBtn.addEventListener('click', handleAddPeriod);
    }

    // Initialize share button for calendar selections
    const shareContainer = document.getElementById('calendarShareContainer');
    if (shareContainer) {
        initSocialSharing({
            selector: '#calendarShareContainer',
            defaultTitle: 'My Garden Planner Selections',
            defaultDescription: 'Check out my garden planning!',
            addShareCallback: () => shareCalendarSelections()
        });
    }

    // Render the calendar with the initial month
    renderCalendar(initialMonth);

    // Initialize the selection badge
    updateSelectionBadge();
}

/**
 * Share the current calendar selections
 */
function shareCalendarSelections() {
    const selections = getSelectedItems();
    const currentMonth = window.GardeningApp.activeMonth;
    const monthSelections = selections[currentMonth];
    
    if (!monthSelections) {
        alert("You don't have any selections to share. Please select some plants or tasks first.");
        return;
    }
    
    // Collect all selected items across categories
    const selectedItems = [];
    
    for (const category in monthSelections) {
        const items = monthSelections[category];
        
        items.forEach(item => {
            if (typeof item === 'object' && item.en) {
                selectedItems.push(item.en);
            } else {
                selectedItems.push(item);
            }
        });
    }
    
    // Only share if there are items
    if (selectedItems.length > 0) {
        // Use the shareContent function from social module
        shareContent('selection', {
            items: selectedItems,
            month: currentMonth
        });
    } else {
        alert("You don't have any selections to share. Please select some plants or tasks first.");
    }
} 