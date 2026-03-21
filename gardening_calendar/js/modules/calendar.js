/**
 * Calendar Module for Gardening Calendar
 * Handles all calendar rendering and interaction functionality
 */

import { calendarData, translations, categoryIcons, categoryNames } from './data.js';
import { getSelectedItems, isItemSelected, toggleItemSelection,
         getAllPeriods, addCustomPeriod, renameCustomPeriod, deleteCustomPeriod,
         movePeriod, initializeCustomPeriodData, getSelectionCount,
         addCustomPlant, addCustomTask, reorderCustomEntry, getCustomEntries } from './storage.js';
import { showNotification } from './ui.js';
import { openPlantModal, openTaskModal, loadCustomEntries } from './custom-entries.js';
import { initSocialSharing, shareContent } from './social.js';
import { getCurrentClimateZone, getZoneGroup, getPhaseCalendarDates } from './climate.js';

const ICON_EDIT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`;
const ICON_DELETE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
const ICON_PLUS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
const ICON_SORT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h8"/><path d="M3 12h5"/><path d="M3 18h3"/><path d="M16 4l-4 4h3v8h2V8h3l-4-4z"/></svg>`;
const ICON_DRAG = `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>`;

const SORT_STORAGE_KEY = 'gardening_custom_sort_alpha';

function isAlphaSortEnabled() {
    return localStorage.getItem(SORT_STORAGE_KEY) === 'true';
}

function setAlphaSort(enabled) {
    localStorage.setItem(SORT_STORAGE_KEY, String(enabled));
}

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

    // Zone filtering: determine current zone group
    const currentZone = getCurrentClimateZone();
    const currentZoneGroup = getZoneGroup(currentZone);

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

        // Apply zone filter: hide built-in entries whose zones don't match
        if (currentZoneGroup && filteredItems) {
            filteredItems = filteredItems.filter(item => {
                // Custom entries are never filtered
                if (item.custom) return true;
                // Items without zones array are always shown
                if (!item.zones || !Array.isArray(item.zones)) return true;
                return item.zones.includes(currentZoneGroup);
            });
        }

        // Apply filter if search term exists
        if (searchTerm) {
            filteredItems = filteredItems.filter(item => {
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

        // Sort custom entries alphabetically if enabled
        const alphaSort = isAlphaSortEnabled();
        if (isCustomCategory && alphaSort && filteredItems.length > 1) {
            filteredItems = [...filteredItems].sort((a, b) => {
                const aText = (a[currentLang] || a.en).toLowerCase();
                const bText = (b[currentLang] || b.en).toLowerCase();
                return aText.localeCompare(bText);
            });
        }

        const sortToggle = isCustomCategory ? `
            <button class="custom-sort-btn${alphaSort ? ' active' : ''}" data-category="${category}"
                aria-label="${alphaSort ? 'Sort by date added' : 'Sort alphabetically'}"
                title="${alphaSort ? 'Sorted A→Z (click for added order)' : 'Sort A→Z'}">
                ${ICON_SORT}
            </button>
        ` : '';

        categoryCard.innerHTML = `
            <div class="category-header">
                <div class="category-icon">${categoryIcons[category] || '🌿'}</div>
                <h2 class="category-title">${categoryDisplayName}</h2>
                ${sortToggle}
            </div>
            <div class="select-all-container">
                <label class="select-all-label">
                    <input type="checkbox" class="select-all-checkbox" data-category="${category}">
                    <span>Select All ${isTaskCategory ? 'Tasks' : 'Plants'}</span>
                </label>
            </div>
            <ul class="plant-list${isCustomCategory && alphaSort ? ' alpha-sorted' : ''}"${isCustomCategory ? ` data-custom-type="${isTaskCategory ? 'task' : 'plant'}"` : ''}>
                ${filteredItems.map(item => {
                    const itemText = item[currentLang] || item.en;
                    const itemId = JSON.stringify(item); // Store the full item object
                    const displayText = searchTerm ? highlightText(itemText, searchTerm) : itemText;
                    
                    // Add edit button for custom items
                    const editButton = item.custom ? `
                        <div class="custom-item-actions">
                            <button class="custom-item-btn custom-item-btn-edit custom-item-edit-btn" data-id="${item.customId}" data-type="${isTaskCategory ? 'task' : 'plant'}"
                                aria-label="Edit ${isTaskCategory ? 'task' : 'plant'}">
                                ${ICON_EDIT}
                            </button>
                            <button class="custom-item-btn custom-item-btn-delete custom-item-delete-btn" data-id="${item.customId}" data-type="${isTaskCategory ? 'task' : 'plant'}"
                                aria-label="Delete ${isTaskCategory ? 'task' : 'plant'}">
                                ${ICON_DELETE}
                            </button>
                        </div>
                    ` : '';
                    
                    const dragHandle = item.custom && !alphaSort ? `
                        <span class="custom-item-drag-handle" aria-label="Drag to reorder">${ICON_DRAG}</span>
                    ` : '';

                    return `
                        <li class="${isTaskCategory ? 'task-item' : 'plant-item'}${item.custom ? ' custom-item' : ''}" data-item-id="${encodeURIComponent(itemId)}"${item.custom ? ` data-custom-id="${item.customId}"` : ''}>
                            ${dragHandle}
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
                        ${category === 'custom_plants' ? 'No custom plants yet — type below to add one quickly.' : 'No custom tasks yet — type below to add one quickly.'}
                    </li>
                ` : ''}
            </ul>
            ${isCustomCategory ? `
                <div class="quick-add-container" data-category="${category}">
                    <input type="text" class="quick-add-input"
                        placeholder="${isTaskCategory ? 'Add a task...' : 'Add a plant...'}"
                        aria-label="${isTaskCategory ? 'Quick add task' : 'Quick add plant'}">
                    <button class="quick-add-btn" disabled aria-label="Add">
                        ${ICON_PLUS}
                    </button>
                </div>
            ` : ''}
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
        
        // Quick-add event listeners for custom categories
        const quickAddContainer = categoryCard.querySelector('.quick-add-container');
        if (quickAddContainer) {
            const input = quickAddContainer.querySelector('.quick-add-input');
            const addBtn = quickAddContainer.querySelector('.quick-add-btn');
            const quickCategory = quickAddContainer.dataset.category;

            input.addEventListener('input', () => {
                addBtn.disabled = !input.value.trim();
            });

            const handleQuickAdd = () => {
                const name = input.value.trim();
                if (!name) return;

                if (quickCategory === 'custom_plants') {
                    addCustomPlant({ name, category: 'custom_plants', months: [month] });
                } else {
                    addCustomTask({ name, category: 'custom_tasks', months: [month] });
                }

                loadCustomEntries();
                renderCalendar(month, searchTerm);
                showNotification(`"${name}" added`, 'success');

                // Re-focus the quick-add input after re-render
                requestAnimationFrame(() => {
                    const newInput = document.querySelector(`.quick-add-container[data-category="${quickCategory}"] .quick-add-input`);
                    if (newInput) newInput.focus();
                });
            };

            addBtn.addEventListener('click', handleQuickAdd);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleQuickAdd();
                }
            });
        }

        // Sort toggle event listener
        const sortBtn = categoryCard.querySelector('.custom-sort-btn');
        if (sortBtn) {
            sortBtn.addEventListener('click', () => {
                setAlphaSort(!isAlphaSortEnabled());
                renderCalendar(month, searchTerm);
            });
        }

        // Drag-to-reorder for custom items
        if (isCustomCategory && !alphaSort) {
            const plantList = categoryCard.querySelector('.plant-list');
            const entryType = isTaskCategory ? 'task' : 'plant';
            initDragReorder(plantList, entryType, month, searchTerm);
        }

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

    periods.forEach((period, idx) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'period-btn-wrapper';

        const btn = document.createElement('button');
        btn.className = `month-btn${period.id === activeMonth ? ' active' : ''}`;
        btn.dataset.month = period.id;

        // Two-line button: phase name + date range (if available)
        const phaseDates = getPhaseCalendarDates(period.id);
        const nameSpan = document.createElement('span');
        nameSpan.className = 'period-name';
        nameSpan.textContent = period.name;
        btn.appendChild(nameSpan);
        if (phaseDates) {
            const dateSpan = document.createElement('span');
            dateSpan.className = 'period-dates';
            dateSpan.textContent = phaseDates.label;
            btn.appendChild(dateSpan);
        }

        btn.addEventListener('click', () => handlePeriodClick(period.id));

        // All periods get a ⋮ menu (for move + rename/delete on custom)
        const actionsBtn = document.createElement('button');
        actionsBtn.className = 'period-actions-btn';
        actionsBtn.textContent = '\u22EE';
        actionsBtn.title = 'Period options';
        actionsBtn.setAttribute('aria-label', `Options for ${period.name}`);

        const menu = document.createElement('div');
        menu.className = 'period-actions-menu';

        // Move Left (if not first)
        if (idx > 0) {
            const moveLeftBtn = document.createElement('button');
            moveLeftBtn.textContent = '\u2190 Move Left';
            moveLeftBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.style.display = 'none';
                handleMovePeriod(period.id, 'left');
            });
            menu.appendChild(moveLeftBtn);
        }

        // Move Right (if not last)
        if (idx < periods.length - 1) {
            const moveRightBtn = document.createElement('button');
            moveRightBtn.textContent = 'Move Right \u2192';
            moveRightBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.style.display = 'none';
                handleMovePeriod(period.id, 'right');
            });
            menu.appendChild(moveRightBtn);
        }

        // Rename + Delete only for custom periods
        if (!period.builtin) {
            const renameBtn = document.createElement('button');
            renameBtn.textContent = 'Rename';
            renameBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.style.display = 'none';
                handleRenamePeriod(period);
            });
            menu.appendChild(renameBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.style.color = '#f44336';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.style.display = 'none';
                handleDeletePeriod(period);
            });
            menu.appendChild(deleteBtn);
        }

        actionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.period-actions-menu').forEach(m => {
                if (m !== menu) m.style.display = 'none';
            });
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        });

        wrapper.appendChild(btn);
        wrapper.appendChild(actionsBtn);
        wrapper.appendChild(menu);
        calendarNav.appendChild(wrapper);
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
    localStorage.setItem('gardening_active_period', periodId);
    renderCalendar(periodId);
    document.dispatchEvent(new CustomEvent('periodChanged', { detail: { periodId } }));
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
            localStorage.setItem('gardening_active_period', window.GardeningApp.activeMonth);
            renderCalendar(window.GardeningApp.activeMonth);
        }

        // Re-render buttons
        const periods = getAllPeriods();
        renderPeriodButtons(periods, window.GardeningApp.activeMonth);
        showNotification(`Period "${period.name}" deleted`, 'success');
    }
}

/**
 * Handle moving a period left or right
 * @param {string} periodId - The period to move
 * @param {string} direction - 'left' or 'right'
 */
function handleMovePeriod(periodId, direction) {
    if (movePeriod(periodId, direction)) {
        const periods = getAllPeriods();
        renderPeriodButtons(periods, window.GardeningApp.activeMonth);
    }
}

/**
 * Handle adding a new custom period — opens a modal with name + position
 */
function handleAddPeriod() {
    const previouslyFocused = document.activeElement;
    const allPeriods = getAllPeriods();

    // Build modal
    const overlay = document.createElement('div');
    overlay.className = 'weather-modal-overlay';
    overlay.style.display = 'flex';
    overlay.style.zIndex = '1000';

    const modal = document.createElement('div');
    modal.className = 'weather-modal';
    modal.style.maxWidth = '420px';
    modal.style.padding = '25px';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    const closeBtn = document.createElement('button');
    closeBtn.className = 'weather-modal-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Close');

    const title = document.createElement('div');
    title.className = 'modal-title';
    title.textContent = 'Add Growing Period';

    // Name field
    const nameGroup = document.createElement('div');
    nameGroup.className = 'modal-field-group';
    const nameLabel = document.createElement('label');
    nameLabel.className = 'modal-field-label';
    nameLabel.textContent = 'Period name';
    nameLabel.setAttribute('for', 'addPeriodName');
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'addPeriodName';
    nameInput.className = 'modal-field-input';
    nameInput.placeholder = 'e.g. March';
    nameInput.required = true;
    nameGroup.appendChild(nameLabel);
    nameGroup.appendChild(nameInput);

    // Position field
    const posGroup = document.createElement('div');
    posGroup.className = 'modal-field-group';
    const posLabel = document.createElement('label');
    posLabel.className = 'modal-field-label';
    posLabel.textContent = 'Position';
    posLabel.setAttribute('for', 'addPeriodPosition');
    const posSelect = document.createElement('select');
    posSelect.id = 'addPeriodPosition';
    posSelect.className = 'modal-field-input';

    allPeriods.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `Before ${p.name}`;
        posSelect.appendChild(opt);
    });
    const endOpt = document.createElement('option');
    endOpt.value = '';
    endOpt.textContent = 'At the end';
    posSelect.appendChild(endOpt);
    posSelect.value = ''; // default to end
    posGroup.appendChild(posLabel);
    posGroup.appendChild(posSelect);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    actions.style.marginTop = '20px';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'modal-btn-cancel';
    cancelBtn.textContent = 'Cancel';
    const addBtn = document.createElement('button');
    addBtn.className = 'modal-btn-confirm';
    addBtn.textContent = 'Add';
    actions.appendChild(cancelBtn);
    actions.appendChild(addBtn);

    modal.appendChild(closeBtn);
    modal.appendChild(title);
    modal.appendChild(nameGroup);
    modal.appendChild(posGroup);
    modal.appendChild(actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function closeModal() {
        overlay.remove();
        if (previouslyFocused) previouslyFocused.focus();
    }

    function submit() {
        const name = nameInput.value.trim();
        if (!name) { nameInput.focus(); return; }
        const insertBeforeId = posSelect.value || undefined;
        const newPeriod = addCustomPeriod(name, insertBeforeId);
        closeModal();

        window.GardeningApp.activeMonth = newPeriod.id;
        localStorage.setItem('gardening_active_period', newPeriod.id);
        const periods = getAllPeriods();
        renderPeriodButtons(periods, newPeriod.id);
        renderCalendar(newPeriod.id);
        showNotification(`Period "${name}" added`, 'success');
    }

    addBtn.addEventListener('click', submit);
    nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    cancelBtn.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    setTimeout(() => nameInput.focus(), 50);
}

/**
 * Set up pointer-event-based drag-to-reorder on a custom items list
 * @param {HTMLUListElement} list - The <ul> containing custom items
 * @param {string} entryType - 'plant' or 'task'
 * @param {string} month - Current month/period ID
 * @param {string} searchTerm - Current search filter
 */
function initDragReorder(list, entryType, month, searchTerm) {
    const handles = list.querySelectorAll('.custom-item-drag-handle');
    if (!handles.length) return;

    handles.forEach(handle => {
        handle.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            e.preventDefault();

            const draggedLi = handle.closest('li');
            if (!draggedLi) return;

            draggedLi.classList.add('dragging');

            const onMove = (ev) => {
                const siblings = [...list.querySelectorAll('li.custom-item')];
                for (const sibling of siblings) {
                    if (sibling === draggedLi) continue;
                    const rect = sibling.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;

                    if (ev.clientY < midY && draggedLi.compareDocumentPosition(sibling) & Node.DOCUMENT_POSITION_PRECEDING) {
                        // Pointer moved above a sibling that precedes us — move up
                        list.insertBefore(draggedLi, sibling);
                        break;
                    } else if (ev.clientY > midY && draggedLi.compareDocumentPosition(sibling) & Node.DOCUMENT_POSITION_FOLLOWING) {
                        // Pointer moved below a sibling that follows us — move down
                        sibling.after(draggedLi);
                        break;
                    }
                }
            };

            const onUp = () => {
                draggedLi.classList.remove('dragging');
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('pointerup', onUp);
                document.removeEventListener('pointercancel', onUp);

                // Persist new order from DOM
                const orderedIds = [...list.querySelectorAll('li.custom-item')]
                    .map(li => li.dataset.customId)
                    .filter(Boolean);

                orderedIds.forEach((id, i) => {
                    reorderCustomEntry(entryType, id, i);
                });

                loadCustomEntries();
                renderCalendar(month, searchTerm);
            };

            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
            document.addEventListener('pointercancel', onUp);
        });
    });
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

    // Validate saved period still exists, fall back to first period
    if (!periods.some(p => p.id === initialMonth)) {
        initialMonth = periods[0]?.id || 'april';
        window.GardeningApp.activeMonth = initialMonth;
    }

    renderPeriodButtons(periods, initialMonth);

    // Set up the "Add Period" button
    const addPeriodBtn = document.getElementById('addPeriodBtn');
    if (addPeriodBtn) {
        addPeriodBtn.addEventListener('click', handleAddPeriod);
    }

    // Re-render when climate zone changes (updates date ranges + zone filtering)
    document.addEventListener('climateZoneUpdated', () => {
        const currentPeriods = getAllPeriods();
        renderPeriodButtons(currentPeriods, window.GardeningApp.activeMonth);
        renderCalendar(window.GardeningApp.activeMonth);
    });

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