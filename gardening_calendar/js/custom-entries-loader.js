/**
 * Custom Entries Loader
 * 
 * Initializes the custom entries functionality
 */

// Import the custom entries module
import { 
    initCustomEntries, 
    openPlantModal, 
    openTaskModal 
} from './modules/custom-entries.js';

// Register global handlers and export functionality for other modules to use
window.customEntriesInit = function(activeMonth) {
    initCustomEntries(activeMonth);
};

window.openCustomPlantModal = function(plantId) {
    openPlantModal(plantId);
};

window.openCustomTaskModal = function(taskId) {
    openTaskModal(taskId);
};

// Export functionality
export {
    initCustomEntries,
    openPlantModal,
    openTaskModal
}; 