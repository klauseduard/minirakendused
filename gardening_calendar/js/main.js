/**
 * Main Entry Point for Gardening Calendar Application
 * 
 * This file imports and initializes all modules in the correct order,
 * replacing the individual loader files with a single entry point.
 */

// Import all modules
import * as dataModule from './modules/data.js';
import * as storageModule from './modules/storage.js';
import * as uiModule from './modules/ui.js';
import * as weatherModule from './modules/weather.js';
import * as climateModule from './modules/climate.js';
import * as calendarModule from './modules/calendar.js';
import * as searchModule from './modules/search.js';
import * as journalModule from './modules/journal.js';
import * as customEntriesModule from './modules/custom-entries.js';
import * as socialModule from './modules/social.js';
import * as photoStorage from './modules/photo-storage.js';
import * as todoModule from './modules/todo.js';
import * as backupModule from './modules/backup.js';

// Global state for sharing data between modules
window.GardeningApp = {
    activeMonth: localStorage.getItem('gardening_active_period') || 'april',
    currentLang: 'en',
    modules: {
        data: dataModule,
        storage: storageModule,
        ui: uiModule,
        weather: weatherModule,
        climate: climateModule,
        calendar: calendarModule,
        search: searchModule,
        journal: journalModule,
        customEntries: customEntriesModule,
        social: socialModule,
        photoStorage: photoStorage,
        todo: todoModule,
        backup: backupModule
    },
    state: {
        currentMonth: null,
        location: null,
        weather: null
    }
};

// Note: All cross-module references now use proper ES6 imports.
// Only window.GardeningApp remains as the intentional shared state container.

/**
 * Map a period ID to a seasonal illustration set
 */
const PERIOD_SEASON_MAP = {
    'april': 'spring',
    'may': 'summer',
    'early_june': 'summer',
};

function getSeasonForPeriod(periodId) {
    return PERIOD_SEASON_MAP[periodId] || 'default';
}

function updateHeaderIllustration(periodId) {
    const season = getSeasonForPeriod(periodId);
    const el = document.getElementById('headerIllustration');
    if (el) el.className = 'header-illustration season-' + season;

    // Propagate season to container for CSS-driven decorative elements
    const container = document.querySelector('.container');
    if (container) {
        container.className = container.className.replace(/\bseason-\S+/g, '');
        container.classList.add('season-' + season);
    }
}

/**
 * Initialize all modules in the correct order
 */
async function initApp() {
    console.log('Initializing Gardening Calendar App...');

    // Step 1: Dispatch data module loaded event
    document.dispatchEvent(new CustomEvent('dataModuleLoaded'));
    console.log('Data module initialized');

    // Step 2: Initialize UI module
    uiModule.initUI();
    document.dispatchEvent(new CustomEvent('uiModuleLoaded'));
    console.log('UI module initialized');

    // Step 3: Initialize storage module
    storageModule.initStorage();
    document.dispatchEvent(new CustomEvent('storageModuleLoaded'));
    console.log('Storage module initialized');

    // Step 3b: Initialize photo storage (IndexedDB) and run one-time migration
    try {
        await photoStorage.initPhotoStorage();
        console.log('Photo storage (IndexedDB) initialized');
        const migrationResult = await photoStorage.migrateFromLocalStorage();
        if (migrationResult.migrated > 0) {
            console.log(`Photo migration: ${migrationResult.migrated} entries migrated from localStorage to IndexedDB`);
        }
    } catch (e) {
        console.error('Failed to initialize photo storage:', e);
    }

    // Step 4: Initialize weather module
    weatherModule.initWeather();
    document.dispatchEvent(new CustomEvent('weatherModuleLoaded'));
    console.log('Weather module initialized');

    // Step 5: Initialize climate module (depends on weather)
    climateModule.initClimateZone();
    document.dispatchEvent(new CustomEvent('climateModuleLoaded'));
    console.log('Climate module initialized');

    // Step 5b: Initialize custom period data structures before loading entries
    storageModule.initializeCustomPeriodData();
    console.log('Custom period data initialized');

    // Step 6: Initialize custom entries module (moved before calendar)
    customEntriesModule.initCustomEntries(window.GardeningApp.activeMonth);
    document.dispatchEvent(new CustomEvent('customEntriesModuleLoaded'));
    console.log('Custom Entries module initialized');

    // Step 7: Initialize calendar module (now after custom entries are loaded)
    calendarModule.initCalendar(window.GardeningApp.activeMonth);
    document.dispatchEvent(new CustomEvent('calendarModuleLoaded'));
    console.log('Calendar module initialized');

    // Step 8: Initialize search module
    const searchBox = document.getElementById('searchBox');
    if (searchBox) {
        searchModule.initSearch({
            searchBox,
            onSearch: (searchTerm) => {
                searchModule.searchCalendar(
                    searchTerm,
                    window.GardeningApp.activeMonth,
                    calendarModule.renderCalendar
                );
            }
        });
    }
    document.dispatchEvent(new CustomEvent('searchModuleLoaded'));
    console.log('Search module initialized');

    // Step 9: Initialize journal module
    journalModule.initJournal();
    document.dispatchEvent(new CustomEvent('journalModuleLoaded'));
    console.log('Journal module initialized');
    
    // Step 9b: Initialize TODO module
    todoModule.initTodo();
    console.log('TODO module initialized');

    // Step 10: Initialize social sharing module - only for footer
    socialModule.initSocialSharing({
        selector: '#footerShareContainer',
        defaultTitle: 'Garden Planner',
        defaultDescription: 'A helpful tool for planning your gardening activities!'
    });
    
    document.dispatchEvent(new CustomEvent('socialModuleLoaded'));
    console.log('Social sharing module initialized');

    // Step 11: Initialize backup module
    backupModule.initBackup();
    console.log('Backup module initialized');
    
    // Set up header illustration with seasonal swapping
    updateHeaderIllustration(window.GardeningApp.activeMonth);
    document.addEventListener('periodChanged', (e) => {
        updateHeaderIllustration(e.detail.periodId);
    });

    // Set up navigation and remaining event listeners
    setupNavigation();

    // Journal close button
    const journalCloseBtn = document.getElementById('journalCloseBtn');
    if (journalCloseBtn) {
        journalCloseBtn.addEventListener('click', () => {
            closeJournalPanel();
            // Remove active state from journal nav buttons
            document.querySelectorAll('.quick-jump-btn, .bottom-nav-btn').forEach(b => {
                if (b.dataset.section === 'garden-journal') b.classList.remove('active');
            });
        });
    }
    
    // Check for hash in URL to navigate to specific section on load
    if (window.location.hash) {
        const sectionId = window.location.hash.substring(1); // Remove the # symbol
        const navButton = document.querySelector(`.quick-jump-btn[data-section="${sectionId}"]`);
        if (navButton) {
            // Simulate a click on the navigation button
            setTimeout(() => navButton.click(), 100);
        }
    } else {
        // Ensure calendar content has grid display on initial load
        const calendarContent = document.getElementById('calendarContent');
        if (calendarContent) {
            calendarContent.style.display = 'grid';
        }
    }
    
    // Initialize onboarding hints
    initOnboardingHints();

    // Weather callout dismiss button
    const weatherCalloutDismiss = document.getElementById('weatherCalloutDismiss');
    if (weatherCalloutDismiss) {
        weatherCalloutDismiss.addEventListener('click', () => {
            const callout = document.getElementById('weatherCallout');
            if (callout) callout.classList.add('hidden-default');
        });
    }

    console.log('Gardening Calendar App initialization complete');
}

/**
 * Show contextual onboarding hints for first-time users.
 * Hints disappear once the user interacts and don't return.
 */
function initOnboardingHints() {
    if (localStorage.getItem('onboarding-dismissed')) return;

    const locationHint = document.getElementById('locationHint');
    const calendarHint = document.getElementById('calendarHint');

    // Show location hint if no location is saved
    const lastLocation = localStorage.getItem('gardening_last_location');
    if (!lastLocation && locationHint) {
        locationHint.classList.remove('hidden-default');
    }

    // Show calendar hint if no items are selected in current period
    const selections = storageModule.getSelectedItems();
    const activeMonth = window.GardeningApp.activeMonth || 'april';
    const hasSelections = selections[activeMonth] && Object.keys(selections[activeMonth]).length > 0;
    if (!hasSelections && calendarHint) {
        calendarHint.classList.remove('hidden-default');
    }

    // Dismiss location hint when user searches or uses geolocation
    const searchLocationBtn = document.getElementById('searchLocationBtn');
    const useMyLocationBtn = document.getElementById('useMyLocationBtn');
    [searchLocationBtn, useMyLocationBtn].forEach(btn => {
        if (btn) btn.addEventListener('click', () => dismissHint(locationHint), { once: true });
    });

    // Dismiss calendar hint on first checkbox interaction
    const calendarContent = document.getElementById('calendarContent');
    if (calendarContent) {
        calendarContent.addEventListener('change', (e) => {
            if (e.target.classList.contains('item-checkbox') || e.target.classList.contains('select-all-checkbox')) {
                dismissHint(calendarHint);
                dismissAllHints();
            }
        }, { once: true });
    }
}

function dismissHint(el) {
    if (el) {
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.3s';
        setTimeout(() => el.classList.add('hidden-default'), 300);
    }
}

function dismissAllHints() {
    localStorage.setItem('onboarding-dismissed', 'true');
}

/**
 * Set up navigation and global event listeners
 */
function setupNavigation() {
    // Handle location input clear button
    const locationInput = document.getElementById('locationInput');
    const clearLocationBtn = document.getElementById('clearLocationBtn');
    
    if (locationInput && clearLocationBtn) {
        locationInput.addEventListener('input', function() {
            clearLocationBtn.style.opacity = this.value ? '0.7' : '0.2';
        });
        
        clearLocationBtn.addEventListener('click', function() {
            locationInput.value = '';
            locationInput.focus();
            clearLocationBtn.style.opacity = '0.2';
        });
        
        clearLocationBtn.style.opacity = locationInput.value ? '0.7' : '0.2';
    }
    
    // Desktop Navigation menu functionality
    setupDesktopNavigation();
    
    // Mobile Bottom Navigation
    setupMobileNavigation();
    
    // Month button clicks are handled dynamically by calendar.js renderPeriodButtons()
    // The activeMonth is updated via handlePeriodClick() in calendar.js

    // Hide scroll-to-top button when bottom nav is visible (mobile)
    const scrollToTopBtn = document.getElementById('scrollToTop');
    function updateScrollToTopVisibility() {
        if (window.innerWidth <= 768) {
            if (scrollToTopBtn) scrollToTopBtn.style.display = 'none';
        } else {
            // Existing logic (show/hide based on scroll)
            if (scrollToTopBtn) scrollToTopBtn.style.display = window.scrollY > 200 ? 'block' : 'none';
        }
    }
    window.addEventListener('resize', updateScrollToTopVisibility);
    window.addEventListener('orientationchange', updateScrollToTopVisibility);
    updateScrollToTopVisibility();
}

/**
 * Navigate to a section - shared logic for both desktop and mobile nav.
 * @param {string} sectionId - The section to navigate to
 * @param {Object} options - Navigation options
 * @param {boolean} options.isMobile - Whether this is mobile navigation
 */
function navigateToSection(sectionId, { isMobile = false } = {}) {
    if (sectionId === 'garden-journal') {
        // Full-width journal view on all screen sizes
        document.body.classList.add('journal-active');

        const journalSection = document.getElementById('garden-journal');
        if (journalSection) {
            journalSection.style.display = 'block';
            journalModule.renderJournal();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } else {
        // Leave journal view, restore main sections
        closeJournalPanel();

        // Re-render calendar/todo when navigating to schedule
        if (sectionId === 'monthly-calendar') {
            const activeTab = window.GardeningApp.state.activeScheduleTab || 'calendar';
            if (activeTab === 'todo') {
                todoModule.switchTab('todo');
            } else {
                const calendarContent = document.getElementById('calendarContent');
                if (calendarContent) calendarContent.style.display = 'grid';
                calendarModule.renderCalendar(window.GardeningApp.activeMonth || 'april');
            }
        }

        // Scroll to target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            if (isMobile && sectionId === 'search-section') {
                setTimeout(() => {
                    window.scrollTo({ top: targetSection.offsetTop - 20, behavior: 'smooth' });
                }, 100);
            } else if (isMobile) {
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                const offset = sectionId === 'search-section' ? 160 : 80;
                uiModule.scrollToElement(targetSection, offset);
            }
        }
    }
}

/**
 * Close the journal panel (works for both sidebar and fullscreen modes)
 */
function closeJournalPanel() {
    const journalSection = document.getElementById('garden-journal');
    if (journalSection) journalSection.style.display = 'none';
    showAllMainSections();
    document.body.classList.remove('journal-active');
}

/**
 * Set up a nav container (works for both desktop quick-jump and mobile bottom nav)
 * @param {string} containerSelector - CSS selector for the nav container
 * @param {string} buttonSelector - CSS selector for nav buttons within the container
 * @param {boolean} isMobile - Whether this is the mobile nav
 */
function setupNavContainer(containerSelector, buttonSelector, isMobile) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const navButtons = container.querySelectorAll(buttonSelector);

    container.addEventListener('click', (e) => {
        const btn = e.target.closest(buttonSelector);
        if (!btn) return;

        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        navigateToSection(btn.dataset.section, { isMobile });
    });

    // Mobile-only: scroll spy to highlight active section
    if (isMobile) {
        window.addEventListener('scroll', () => {
            const journalSection = document.getElementById('garden-journal');
            if (journalSection && journalSection.style.display === 'block') return;

            let visibleSections = [];
            navButtons.forEach(btn => {
                if (btn.dataset.section === 'garden-journal') return;
                const section = document.getElementById(btn.dataset.section);
                if (section) {
                    const rect = section.getBoundingClientRect();
                    if (rect.top < window.innerHeight / 2 && rect.bottom > 100) {
                        visibleSections.push({ btn, distance: Math.abs(rect.top) });
                    }
                }
            });

            visibleSections.sort((a, b) => a.distance - b.distance);
            navButtons.forEach(b => b.classList.remove('active'));
            if (visibleSections.length > 0) visibleSections[0].btn.classList.add('active');
        });
    }
}

/**
 * Set up desktop quick-jump navigation menu
 */
function setupDesktopNavigation() {
    setupNavContainer('#quickJumpMenu', '.quick-jump-btn', false);
}

/**
 * Set up mobile bottom navigation bar
 */
function setupMobileNavigation() {
    setupNavContainer('.bottom-nav', '.bottom-nav-btn', true);
}

/**
 * Helper function to show all main sections
 */
function showAllMainSections() {
    const activeTab = window.GardeningApp.state.activeScheduleTab || 'calendar';
    const calendarContent = document.getElementById('calendarContent');

    // Show all main sections and elements except journal
    document.querySelectorAll('.main-layout > *:not(#garden-journal):not(.bottom-nav):not(#scrollToTop)').forEach(el => {
        // When TODO tab is active, keep calendar-specific elements hidden
        if (activeTab === 'todo') {
            if (el.id === 'search-section' || el.id === 'calendarHint') {
                el.style.display = 'none';
                return;
            }
            if (el.classList.contains('custom-entries-toolbar')) {
                el.style.display = 'none';
                return;
            }
            if (el.id === 'todoContent') {
                el.style.display = 'block';
                return;
            }
        }

        if (el.id === 'todoContent') {
            el.style.display = activeTab === 'todo' ? 'block' : 'none';
        } else if (el.classList.contains('custom-entries-toolbar')) {
            el.style.display = activeTab === 'todo' ? 'none' : 'flex';
        } else {
            el.style.display = 'block';
        }
    });

    // Handle calendarContent separately due to !important CSS
    if (calendarContent) {
        calendarContent.classList.toggle('hidden-by-tab', activeTab === 'todo');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

console.log('Main module loaded');