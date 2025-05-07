/**
 * Custom Entries Loader
 * 
 * Initializes the custom entries functionality
 */

// Import the custom entries module
import { 
    initCustomEntries, 
    openPlantModal, 
    openTaskModal,
    loadCustomEntries
} from './modules/custom-entries.js';

// Import storage module functions for deletion
import {
    deleteCustomPlant as deleteCustomPlantFunc,
    deleteCustomTask as deleteCustomTaskFunc
} from './modules/storage.js';

// Register global handlers and export functionality for other modules to use
window.customEntriesInit = function(activeMonth) {
    initCustomEntries(activeMonth);
    
    // Force calendar re-render after loading custom entries
    if (window.renderCalendar) {
        window.renderCalendar(activeMonth);
    }
};

window.openCustomPlantModal = function(plantId) {
    openPlantModal(plantId);
};

window.openCustomTaskModal = function(taskId) {
    openTaskModal(taskId);
};

// Add delete functions to window scope
window.deleteCustomPlant = function(plantId) {
    // Delete the plant
    const success = deleteCustomPlantFunc(plantId);
    
    if (success) {
        // Reload custom entries to update calendarData
        loadCustomEntries();
        
        // Get current active month
        const activeMonth = window.GardeningApp?.activeMonth || 
                           document.querySelector('.month-btn.active')?.dataset?.month || 
                           'april';
        
        // Force calendar re-render 
        if (window.renderCalendar) {
            window.renderCalendar(activeMonth);
        }
        
        // Show notification
        if (window.showNotification) {
            window.showNotification('Custom plant deleted successfully', 'success');
        }
    }
    
    return success;
};

window.deleteCustomTask = function(taskId) {
    // Delete the task
    const success = deleteCustomTaskFunc(taskId);
    
    if (success) {
        // Reload custom entries to update calendarData
        loadCustomEntries();
        
        // Get current active month
        const activeMonth = window.GardeningApp?.activeMonth || 
                           document.querySelector('.month-btn.active')?.dataset?.month || 
                           'april';
        
        // Force calendar re-render
        if (window.renderCalendar) {
            window.renderCalendar(activeMonth);
        }
        
        // Show notification
        if (window.showNotification) {
            window.showNotification('Custom task deleted successfully', 'success');
        }
    }
    
    return success;
};

// Export functionality
export {
    initCustomEntries,
    openPlantModal,
    openTaskModal
}; 