/**
 * Sync Module for Gardening Calendar
 * Handles user authentication and cloud sync of app state.
 */

import {
    getJournalEntries, saveJournalEntries,
    getCustomEntries, importCustomEntries,
    getSelectedItems, getCustomPeriods,
    getTodoItems, saveTodoItems,
    getTemperatureUnit, saveTemperatureUnit,
    getPrecipitationUnit, savePrecipitationUnit,
    getWindUnit, saveWindUnit,
    getLastLocation, saveLastLocation,
    getClimateZoneOverride, saveClimateZoneOverride,
    getLanguage, saveLanguage,
    STORAGE_KEYS
} from './storage.js';
import { showOptionsModal, showNotification } from './ui.js';
import { getAllPhotosRaw, clearAllPhotos, savePhotos } from './photo-storage.js';

const TOKEN_KEY = 'gardening_sync_token';
const USERNAME_KEY = 'gardening_sync_username';
const DISPLAY_NAME_KEY = 'gardening_sync_display_name';
const LAST_SYNC_KEY = 'gardening_last_sync';
const API_URL_KEY = 'gardening_sync_api_url';
const BUILTIN_ORDER_KEY = 'gardenCal_builtinPeriodOrders';
const DEFAULT_API_URL = 'https://klauseduard.duckdns.org/garden-api';

/**
 * Get the configured API base URL
 */
function getApiUrl() {
    return localStorage.getItem(API_URL_KEY) || DEFAULT_API_URL;
}

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function getUsername() {
    return localStorage.getItem(USERNAME_KEY);
}

function getDisplayName() {
    return localStorage.getItem(DISPLAY_NAME_KEY) || getUsername();
}

function isLoggedIn() {
    return !!getToken() && !!getApiUrl();
}

/**
 * Collect all app state into a single object (mirrors backup module logic)
 */
function collectState() {
    const journal = getJournalEntries();
    const customEntries = getCustomEntries();
    const customPeriods = getCustomPeriods();
    const todoItems = getTodoItems();
    const selectedItems = getSelectedItems();

    return {
        settings: {
            temperatureUnit: getTemperatureUnit(),
            precipitationUnit: getPrecipitationUnit(),
            windUnit: getWindUnit(),
            lastLocation: getLastLocation(),
            climateZoneOverride: getClimateZoneOverride(),
            language: getLanguage(),
            activePeriod: localStorage.getItem('gardening_active_period') || null,
            builtinPeriodOrders: localStorage.getItem(BUILTIN_ORDER_KEY)
                ? JSON.parse(localStorage.getItem(BUILTIN_ORDER_KEY))
                : null,
            onboardingDismissed: localStorage.getItem('onboarding-dismissed') || null
        },
        journal,
        customEntries: {
            plants: customEntries.plants || [],
            tasks: customEntries.tasks || [],
            customPeriods: customPeriods.periods || []
        },
        todo: todoItems,
        selectedItems
    };
}

/**
 * Apply state from server to local storage (replace mode)
 */
function applyState(state) {
    if (!state || typeof state !== 'object') return;

    // Settings
    if (state.settings) {
        const s = state.settings;
        if (s.temperatureUnit) saveTemperatureUnit(s.temperatureUnit);
        if (s.precipitationUnit) savePrecipitationUnit(s.precipitationUnit);
        if (s.windUnit) saveWindUnit(s.windUnit);
        if (s.lastLocation) saveLastLocation(s.lastLocation);
        if (s.climateZoneOverride) saveClimateZoneOverride(s.climateZoneOverride);
        if (s.language) saveLanguage(s.language);
        if (s.activePeriod) localStorage.setItem('gardening_active_period', s.activePeriod);
        if (s.builtinPeriodOrders) localStorage.setItem(BUILTIN_ORDER_KEY, JSON.stringify(s.builtinPeriodOrders));
        if (s.onboardingDismissed) localStorage.setItem('onboarding-dismissed', s.onboardingDismissed);
    }

    // Journal
    if (Array.isArray(state.journal)) {
        saveJournalEntries(state.journal);
    }

    // Custom entries
    if (state.customEntries) {
        importCustomEntries(state.customEntries);
    }

    // TODO
    if (Array.isArray(state.todo)) {
        saveTodoItems(state.todo);
    }

    // Selected items
    if (state.selectedItems && typeof state.selectedItems === 'object') {
        localStorage.setItem(STORAGE_KEYS.SELECTED_ITEMS, JSON.stringify(state.selectedItems));
    }
}

/**
 * Make an authenticated API request
 */
async function apiRequest(path, options = {}) {
    const apiUrl = getApiUrl();
    if (!apiUrl) throw new Error('No API URL configured');

    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const resp = await fetch(`${apiUrl}${path}`, {
        ...options,
        headers,
    });

    if (resp.status === 401) {
        // Token expired — log out
        logout();
        throw new Error('Session expired. Please log in again.');
    }

    if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.detail || `Request failed (${resp.status})`);
    }

    return resp.json();
}

/**
 * Register a new account
 */
async function register(apiUrl, username, password, displayName) {
    localStorage.setItem(API_URL_KEY, apiUrl.replace(/\/+$/, ''));

    const data = await apiRequest('/api/register', {
        method: 'POST',
        body: JSON.stringify({ username, password, display_name: displayName || username }),
    });

    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(USERNAME_KEY, data.username);
    localStorage.setItem(DISPLAY_NAME_KEY, data.display_name);
    updateSyncUI();
    return data;
}

/**
 * Log in to an existing account
 */
async function login(apiUrl, username, password) {
    localStorage.setItem(API_URL_KEY, apiUrl.replace(/\/+$/, ''));

    const data = await apiRequest('/api/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });

    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(USERNAME_KEY, data.username);
    localStorage.setItem(DISPLAY_NAME_KEY, data.display_name);
    updateSyncUI();
    return data;
}

/**
 * Log out — clear auth tokens
 */
function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
    localStorage.removeItem(DISPLAY_NAME_KEY);
    updateSyncUI();
}

/**
 * Push local state to server
 */
async function pushState() {
    const state = collectState();
    const result = await apiRequest('/api/sync', {
        method: 'PUT',
        body: JSON.stringify({ data: state }),
    });
    localStorage.setItem(LAST_SYNC_KEY, result.updated_at);
    return result;
}

/**
 * Pull state from server
 */
async function pullState() {
    const result = await apiRequest('/api/sync');
    return result;
}

/**
 * Sync photos: push local photos missing on server, pull server photos missing locally.
 * Runs after state sync to keep photos in sync.
 */
async function syncPhotos() {
    try {
        const remoteList = await apiRequest('/api/photos');
        const remoteIds = new Set(remoteList.photo_ids || []);
        const localPhotos = await getAllPhotosRaw();
        const localIds = new Set(localPhotos.map(p => p.id));

        // Push local photos not on server
        const toPush = localPhotos.filter(p => !remoteIds.has(p.id));
        for (const photo of toPush) {
            await apiRequest(`/api/photos/${photo.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    id: photo.id,
                    entryId: photo.entryId,
                    data: photo.data,
                    thumbnail: photo.thumbnail || '',
                }),
            });
        }

        // Pull server photos not local
        const toPull = [...remoteIds].filter(id => !localIds.has(id));
        // Group by entryId for batch save
        const pullByEntry = {};
        for (const id of toPull) {
            const photo = await apiRequest(`/api/photos/${id}`);
            const entryId = photo.entryId;
            if (!pullByEntry[entryId]) pullByEntry[entryId] = [];
            pullByEntry[entryId].push(photo);
        }
        for (const [entryId, photos] of Object.entries(pullByEntry)) {
            await savePhotos(entryId, photos);
        }

        const total = toPush.length + toPull.length;
        if (total > 0) {
            console.log(`Photo sync: ${toPush.length} pushed, ${toPull.length} pulled`);
        }
    } catch (err) {
        console.error('Photo sync failed:', err);
    }
}

/**
 * Sync: compare timestamps and push/pull accordingly
 */
async function sync() {
    if (!isLoggedIn()) return;

    const statusEl = document.getElementById('syncStatus');
    if (statusEl) statusEl.textContent = 'Syncing...';

    try {
        const remote = await pullState();
        const localSyncTime = localStorage.getItem(LAST_SYNC_KEY);
        const remoteTime = remote.updated_at;
        const remoteHasData = remote.data && Object.keys(remote.data).length > 0;

        if (!remoteHasData && !localSyncTime) {
            // First sync — push local data up
            await pushState();
            await syncPhotos();
            showNotification('Data synced to cloud.', 'success');
        } else if (!remoteHasData) {
            // Server empty, push
            await pushState();
            await syncPhotos();
            showNotification('Data pushed to cloud.', 'success');
        } else if (!localSyncTime) {
            // Never synced locally but server has data — ask user
            showSyncConflictDialog(remote);
        } else if (remoteTime > localSyncTime) {
            // Server is newer — ask user
            showSyncConflictDialog(remote);
        } else {
            // Local is newer or same — push
            await pushState();
            await syncPhotos();
            showNotification('Data synced.', 'success');
        }

        if (statusEl) statusEl.textContent = '';
    } catch (err) {
        console.error('Sync failed:', err);
        showNotification(`Sync failed: ${err.message}`, 'error');
        if (statusEl) statusEl.textContent = '';
    }
}

/**
 * Show conflict resolution dialog
 */
function showSyncConflictDialog(remote) {
    const remoteDate = new Date(remote.updated_at).toLocaleString();

    showOptionsModal(
        'Sync Conflict',
        `The server has newer data (updated ${remoteDate}). Choose how to proceed:`,
        [
            {
                icon: '⬇️',
                title: 'Use Server Data',
                description: 'Replace local data with what is on the server, then reload.',
                onClick: async () => {
                    applyState(remote.data);
                    localStorage.setItem(LAST_SYNC_KEY, remote.updated_at);
                    await syncPhotos();
                    showNotification('Server data applied. Reloading...', 'success');
                    setTimeout(() => window.location.reload(), 1000);
                }
            },
            {
                icon: '⬆️',
                title: 'Push Local Data',
                description: 'Overwrite server data with your current local data.',
                onClick: async () => {
                    await pushState();
                    await syncPhotos();
                    showNotification('Local data pushed to server.', 'success');
                }
            }
        ]
    );
}

/**
 * Show login/register modal
 */
function showAuthModal() {
    const content = document.createElement('div');
    content.className = 'sync-auth-form';

    // Tabs
    const tabs = document.createElement('div');
    tabs.className = 'sync-auth-tabs';

    const loginTab = document.createElement('button');
    loginTab.className = 'sync-auth-tab active';
    loginTab.setAttribute('data-tab', 'login');
    loginTab.textContent = 'Log In';

    const registerTab = document.createElement('button');
    registerTab.className = 'sync-auth-tab';
    registerTab.setAttribute('data-tab', 'register');
    registerTab.textContent = 'Register';

    tabs.appendChild(loginTab);
    tabs.appendChild(registerTab);

    // Fields
    const fields = document.createElement('div');
    fields.className = 'sync-auth-fields';

    const usernameLabel = document.createElement('label');
    usernameLabel.textContent = 'Username';
    const usernameInput = document.createElement('input');
    usernameInput.setAttribute('type', 'text');
    usernameInput.id = 'syncUsername';
    usernameInput.setAttribute('autocomplete', 'username');
    usernameLabel.appendChild(usernameInput);

    const passwordLabel = document.createElement('label');
    passwordLabel.textContent = 'Password';
    const passwordInput = document.createElement('input');
    passwordInput.setAttribute('type', 'password');
    passwordInput.id = 'syncPassword';
    passwordInput.setAttribute('autocomplete', 'current-password');
    passwordLabel.appendChild(passwordInput);

    const displayNameLabel = document.createElement('label');
    displayNameLabel.id = 'syncDisplayNameLabel';
    displayNameLabel.style.display = 'none';
    displayNameLabel.textContent = 'Display Name (optional)';
    const displayNameInput = document.createElement('input');
    displayNameInput.setAttribute('type', 'text');
    displayNameInput.id = 'syncDisplayName';
    displayNameInput.setAttribute('placeholder', 'How you want to be shown');
    displayNameLabel.appendChild(displayNameInput);

    fields.appendChild(usernameLabel);
    fields.appendChild(passwordLabel);
    fields.appendChild(displayNameLabel);

    // Error container
    const errorDiv = document.createElement('div');
    errorDiv.id = 'syncAuthError';
    errorDiv.className = 'sync-auth-error';

    // Action buttons
    const actions = document.createElement('div');
    actions.className = 'sync-auth-actions';

    const submitBtn = document.createElement('button');
    submitBtn.id = 'syncAuthSubmit';
    submitBtn.className = 'confirm-btn';
    submitBtn.textContent = 'Log In';

    const cancelBtn = document.createElement('button');
    cancelBtn.id = 'syncAuthCancel';
    cancelBtn.className = 'secondary-btn';
    cancelBtn.textContent = 'Cancel';

    actions.appendChild(submitBtn);
    actions.appendChild(cancelBtn);

    content.appendChild(tabs);
    content.appendChild(fields);
    content.appendChild(errorDiv);
    content.appendChild(actions);

    const overlay = document.createElement('div');
    overlay.className = 'weather-modal-overlay';
    overlay.style.display = 'flex';
    const modal = document.createElement('div');
    modal.className = 'weather-modal sync-auth-modal';
    modal.appendChild(content);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    let mode = 'login';
    const tabButtons = [loginTab, registerTab];

    tabButtons.forEach(tab => {
        tab.addEventListener('click', () => {
            mode = tab.dataset.tab;
            tabButtons.forEach(t => t.classList.toggle('active', t === tab));
            submitBtn.textContent = mode === 'login' ? 'Log In' : 'Register';
            displayNameLabel.style.display = mode === 'register' ? '' : 'none';
        });
    });

    submitBtn.addEventListener('click', async () => {
        const apiUrl = getApiUrl();
        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!username || !password) {
            errorDiv.textContent = 'All fields are required.';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Connecting...';
        errorDiv.textContent = '';

        try {
            if (mode === 'login') {
                await login(apiUrl, username, password);
            } else {
                const displayName = displayNameInput.value.trim();
                await register(apiUrl, username, password, displayName);
            }
            overlay.remove();
            showNotification(`Logged in as ${getDisplayName()}.`, 'success');
            // Auto-sync after login
            sync();
        } catch (err) {
            errorDiv.textContent = err.message;
            submitBtn.disabled = false;
            submitBtn.textContent = mode === 'login' ? 'Log In' : 'Register';
        }
    });

    cancelBtn.addEventListener('click', () => {
        overlay.remove();
    });

    // Focus username field
    setTimeout(() => usernameInput.focus(), 100);
}

/**
 * Update sync UI elements based on login state
 */
function updateSyncUI() {
    const loginBtn = document.getElementById('syncLoginBtn');
    const syncBtn = document.getElementById('syncNowBtn');
    const logoutBtn = document.getElementById('syncLogoutBtn');
    const statusEl = document.getElementById('syncUserStatus');
    const headerBtn = document.getElementById('headerUserBtn');
    const headerLabel = document.getElementById('headerUserLabel');
    const bottomNavBtn = document.getElementById('bottomNavUserBtn');
    const bottomNavLabel = document.getElementById('bottomNavUserLabel');

    if (isLoggedIn()) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (syncBtn) syncBtn.style.display = '';
        if (logoutBtn) logoutBtn.style.display = '';
        if (statusEl) statusEl.textContent = getDisplayName();
        if (headerLabel) headerLabel.textContent = getDisplayName();
        if (headerBtn) headerBtn.classList.add('logged-in');
        if (bottomNavLabel) bottomNavLabel.textContent = getDisplayName();
        if (bottomNavBtn) bottomNavBtn.classList.add('logged-in');
    } else {
        if (loginBtn) loginBtn.style.display = 'none';
        if (syncBtn) syncBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (statusEl) statusEl.textContent = '';
        if (headerLabel) headerLabel.textContent = 'Sign in';
        if (headerBtn) headerBtn.classList.remove('logged-in');
        if (bottomNavLabel) bottomNavLabel.textContent = 'Sign in';
        if (bottomNavBtn) bottomNavBtn.classList.remove('logged-in');
    }
}

/**
 * Initialize sync module: wire up buttons, update UI, auto-sync
 */
export function initSync() {
    const loginBtn = document.getElementById('syncLoginBtn');
    const syncBtn = document.getElementById('syncNowBtn');
    const logoutBtn = document.getElementById('syncLogoutBtn');
    const headerBtn = document.getElementById('headerUserBtn');
    const bottomNavBtn = document.getElementById('bottomNavUserBtn');

    if (loginBtn) loginBtn.addEventListener('click', showAuthModal);
    [headerBtn, bottomNavBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                if (isLoggedIn()) {
                    document.querySelector('.sync-controls')?.scrollIntoView({ behavior: 'smooth' });
                } else {
                    showAuthModal();
                }
            });
        }
    });
    if (syncBtn) syncBtn.addEventListener('click', sync);
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            logout();
            showNotification('Logged out.', 'info');
        });
    }

    updateSyncUI();

    // Auto-sync on load if logged in
    if (isLoggedIn()) {
        setTimeout(sync, 1000);
    }
}
