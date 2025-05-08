/**
 * Social Sharing Module for Gardening Calendar
 * Handles social media sharing functionality
 */

// Define available platforms with their display names and sharing URLs
const SHARE_PLATFORMS = {
    facebook: {
        name: 'Facebook',
        icon: '📘',
        shareUrl: 'https://www.facebook.com/sharer/sharer.php?u={url}'
    },
    twitter: {
        name: 'Twitter',
        icon: '🐦',
        shareUrl: 'https://twitter.com/intent/tweet?text={title}&url={url}'
    },
    email: {
        name: 'Email',
        icon: '✉️',
        shareUrl: 'mailto:?subject={title}&body={description}%20{url}'
    }
};

/**
 * Initialize social sharing functionality
 * @param {Object} options - Configuration options
 */
export function initSocialSharing(options = {}) {
    console.log('Initializing social sharing module...');
    
    const {
        selector = '.social-share-container',
        platforms = ['facebook', 'twitter', 'email'],
        defaultTitle = 'Check out this Spring Gardening and Planting Calendar!',
        defaultDescription = 'A handy tool for planning your gardening activities with weather forecast integration.',
        addShareCallback = null
    } = options;
    
    // Find the container for social share buttons
    const container = document.querySelector(selector);
    if (!container) {
        console.warn('Social sharing container not found:', selector);
        return;
    }
    
    // Setup share button UI
    setupShareUI(container, platforms, addShareCallback);
    
    // Add click event for native share button
    document.querySelectorAll('.social-native-share').forEach(button => {
        button.addEventListener('click', () => {
            shareNative({
                title: defaultTitle,
                text: defaultDescription,
                url: window.location.href
            });
        });
    });
    
    // Add click events for platform-specific share buttons
    document.querySelectorAll('.social-platform-btn').forEach(button => {
        const platform = button.dataset.platform;
        
        button.addEventListener('click', () => {
            shareToPlatform(platform, {
                title: defaultTitle,
                description: defaultDescription,
                url: window.location.href
            });
        });
    });
}

/**
 * Set up share UI elements
 * @param {HTMLElement} container - Container element
 * @param {Array} platforms - List of platform IDs to include
 * @param {Function} addShareCallback - Optional callback when share button is clicked
 */
function setupShareUI(container, platforms, addShareCallback) {
    // Create UI structure
    const shareUI = document.createElement('div');
    shareUI.className = 'social-share-wrapper';
    
    // Main share button
    const mainButton = document.createElement('button');
    mainButton.className = 'social-share-btn';
    mainButton.innerHTML = `
        <span class="share-icon">🔗</span>
        <span class="share-text">Share</span>
    `;
    
    // Native share container (for mobile)
    const nativeContainer = document.createElement('div');
    nativeContainer.className = 'social-native-share';
    nativeContainer.style.display = 'none';  // Ensure hidden by default
    
    const nativeButton = document.createElement('button');
    nativeButton.className = 'social-platform-btn native-share-btn';
    nativeButton.innerHTML = `
        <span class="platform-icon">📲</span>
        <span class="platform-name">Share</span>
    `;
    
    nativeContainer.appendChild(nativeButton);
    
    // Custom share container (for desktop or fallback)
    const customContainer = document.createElement('div');
    customContainer.className = 'social-custom-share';
    customContainer.style.display = 'none';  // Ensure hidden by default
    
    // Create buttons for each platform
    platforms.forEach(platformId => {
        if (!SHARE_PLATFORMS[platformId]) return;
        
        const platform = SHARE_PLATFORMS[platformId];
        const button = document.createElement('button');
        button.className = 'social-platform-btn';
        button.dataset.platform = platformId;
        button.innerHTML = `
            <span class="platform-icon">${platform.icon}</span>
            <span class="platform-name">${platform.name}</span>
        `;
        
        customContainer.appendChild(button);
    });
    
    // Put it all together
    shareUI.appendChild(mainButton);
    shareUI.appendChild(nativeContainer);
    shareUI.appendChild(customContainer);
    container.appendChild(shareUI);
    
    // Add toggle behavior
    mainButton.addEventListener('click', () => {
        const isExpanded = nativeContainer.style.display === 'flex' || customContainer.style.display === 'flex';
        
        if (isExpanded) {
            // Collapse
            nativeContainer.style.display = 'none';
            customContainer.style.display = 'none';
        } else {
            // Expand
            if (isNativeShareAvailable()) {
                nativeContainer.style.display = 'flex';
            } else {
                customContainer.style.display = 'flex';
            }
            
            // Call the callback if provided
            if (typeof addShareCallback === 'function') {
                addShareCallback();
            }
        }
    });
    
    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!shareUI.contains(e.target)) {
            nativeContainer.style.display = 'none';
            customContainer.style.display = 'none';
        }
    });
}

/**
 * Check if the native share API is available
 * @returns {boolean} True if native sharing is supported
 */
function isNativeShareAvailable() {
    return typeof navigator !== 'undefined' && navigator.share;
}

/**
 * Share using the native share API (mobile)
 * @param {Object} shareData - Share data object
 * @returns {Promise} Share promise
 */
function shareNative(shareData) {
    if (isNativeShareAvailable()) {
        return navigator.share(shareData)
            .catch(error => {
                console.error('Error sharing:', error);
            });
    }
    return Promise.reject(new Error('Native sharing not supported'));
}

/**
 * Share to a specific platform
 * @param {string} platformId - Platform identifier
 * @param {Object} shareData - Share data object
 */
function shareToPlatform(platformId, shareData) {
    const platform = SHARE_PLATFORMS[platformId];
    if (!platform) {
        console.error('Unknown platform:', platformId);
        return;
    }
    
    // Get the current URL if not provided
    const url = shareData.url || window.location.href;
    
    // Format the share URL with data
    let shareUrl = platform.shareUrl
        .replace('{url}', encodeURIComponent(url))
        .replace('{title}', encodeURIComponent(shareData.title || ''))
        .replace('{description}', encodeURIComponent(shareData.description || ''));
    
    // Open share window
    window.open(shareUrl, '_blank', 'width=600,height=400');
}

/**
 * Share the current journal entry or calendar selection
 * @param {string} type - Type of content to share ('journal' or 'selection')
 * @param {Object} data - Data to include in share
 */
export function shareContent(type, data = {}) {
    if (type === 'journal' && data.entry) {
        // Create a share text for journal entry
        const title = `My Garden Journal: ${data.entry.date} - ${data.entry.type}`;
        const description = `Plants: ${data.entry.plants || 'None'}\n${data.entry.notes || ''}`;
        
        if (isNativeShareAvailable()) {
            shareNative({
                title,
                text: description,
                url: window.location.href
            });
        } else {
            // Open share dialog with first platform
            const firstPlatform = Object.keys(SHARE_PLATFORMS)[0];
            shareToPlatform(firstPlatform, {
                title,
                description,
                url: window.location.href
            });
        }
    } else if (type === 'selection' && data.items) {
        // Create a share text for selected plants/tasks
        const title = 'My Garden Planner Selections';
        const description = `I've selected the following garden tasks and plants:\n${data.items.join(', ')}`;
        
        if (isNativeShareAvailable()) {
            shareNative({
                title,
                text: description,
                url: window.location.href
            });
        } else {
            // Open share dialog with first platform
            const firstPlatform = Object.keys(SHARE_PLATFORMS)[0];
            shareToPlatform(firstPlatform, {
                title,
                description,
                url: window.location.href
            });
        }
    }
} 