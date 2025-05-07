/**
 * Calendar Loader Module
 * Imports the calendar module and exposes its functions globally
 */
import * as calendarModule from './modules/calendar.js';

// Store the active month
let activeMonth = 'april';

// Expose calendar functions to the global scope for backward compatibility
window.calendarUtils = calendarModule;

// Create specific named exports for direct access
window.renderCalendar = calendarModule.renderCalendar;
window.searchCalendar = (searchTerm) => calendarModule.searchCalendar(activeMonth, searchTerm);
window.highlightText = calendarModule.highlightText;
window.escapeRegExp = calendarModule.escapeRegExp;
window.updateSelectAllCheckbox = calendarModule.updateSelectAllCheckbox;

// Initialize calendar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize with the default month
    calendarModule.initCalendar(activeMonth);
    
    // Update calendar when data module is loaded
    document.addEventListener('dataModuleLoaded', () => {
        calendarModule.renderCalendar(activeMonth);
    });
    
    // Listen for month button clicks to update activeMonth
    document.querySelectorAll('.month-btn').forEach(button => {
        button.addEventListener('click', () => {
            activeMonth = button.dataset.month;
        });
    });
});

// Mark that the calendar module is loaded
document.dispatchEvent(new CustomEvent('calendarModuleLoaded')); 