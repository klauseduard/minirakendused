/**
 * UI Loader Module
 * Imports the UI module and exposes its functions globally
 */
import * as uiModule from './modules/ui.js';

// Expose UI functions to the global scope for backward compatibility
window.uiUtils = uiModule;

// Create specific named exports for direct access
window.showConfirmDialog = uiModule.showConfirmDialog;
window.showModal = uiModule.showModal;
window.showNotification = uiModule.showNotification;
window.scrollToElement = uiModule.scrollToElement;

// Initialize UI features
document.addEventListener('DOMContentLoaded', () => {
    uiModule.initUI();
});

// Mark that the UI module is loaded
document.dispatchEvent(new CustomEvent('uiModuleLoaded'));

// For debugging
console.log('UI module loaded and exposed to window.uiUtils'); 