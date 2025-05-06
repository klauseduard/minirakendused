/**
 * Storage Loader Module
 * Imports the storage module and exposes its functions globally
 */
import * as storageModule from './modules/storage.js';

// Expose storage functions to the global scope for backward compatibility
window.storageUtils = storageModule;

// Create specific named exports for direct access
window.getSelectedItems = storageModule.getSelectedItems;
window.isItemSelected = storageModule.isItemSelected;
window.toggleItemSelection = storageModule.toggleItemSelection;
window.loadPreferences = storageModule.loadPreferences;

// Mark that the storage module is loaded
document.dispatchEvent(new CustomEvent('storageModuleLoaded'));

// For debugging
console.log('Storage module loaded and exposed to window.storageUtils'); 