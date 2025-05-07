/**
 * Calendar Module for Gardening Calendar
 * Handles all calendar rendering and interaction functionality
 */

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
    
    // Make sure necessary globals are available
    const calendarData = window.calendarData;
    const isItemSelected = window.isItemSelected;
    const toggleItemSelection = window.toggleItemSelection;
    const translations = window.translations;
    const currentLang = window.currentLang || 'en';
    const categoryIcons = window.categoryIcons;
    const categoryNames = window.categoryNames;
    
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
                    
                    if (type === 'plant' && window.openCustomPlantModal) {
                        window.openCustomPlantModal(id);
                    } else if (type === 'task' && window.openCustomTaskModal) {
                        window.openCustomTaskModal(id);
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
                
                if (type === 'plant' && window.openCustomPlantModal) {
                    window.openCustomPlantModal(id);
                } else if (type === 'task' && window.openCustomTaskModal) {
                    window.openCustomTaskModal(id);
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
                                    if (window.loadCustomEntries) {
                                        window.loadCustomEntries();
                                    }
                                    
                                    // Re-render the calendar
                                    renderCalendar(month, searchTerm);
                                    
                                    if (window.showNotification) {
                                        window.showNotification('Custom plant deleted successfully', 'success');
                                    }
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
                                    if (window.loadCustomEntries) {
                                        window.loadCustomEntries();
                                    }
                                    
                                    // Re-render the calendar
                                    renderCalendar(month, searchTerm);
                                    
                                    if (window.showNotification) {
                                        window.showNotification('Custom task deleted successfully', 'success');
                                    }
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
    
    const calendarData = window.calendarData;
    const isItemSelected = window.isItemSelected;
    
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

/**
 * Initialize calendar functionality
 * @param {string} activeMonth - Initial month to display
 */
export function initCalendar(activeMonth) {
    // Get DOM elements
    const monthButtons = document.querySelectorAll('.month-btn');
    const searchBox = document.getElementById('searchBox');
    
    // Listen for month button clicks
    monthButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            monthButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Update active month
            activeMonth = button.dataset.month;
            
            // Dispatch month changed event
            document.dispatchEvent(new CustomEvent('monthChanged', { 
                detail: { month: activeMonth } 
            }));
            
            // Show calendar
            searchBox.value = ''; // Reset search
            renderCalendar(activeMonth);
        });
    });
    
    // Listen for search input
    searchBox.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim();
        searchCalendar(activeMonth, searchTerm);
    });
    
    // Show initial calendar
    renderCalendar(activeMonth);
} 