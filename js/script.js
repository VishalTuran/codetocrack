// Create a new file: script.js

/**
 * Main script to load all SEO components
 */

import { initSEOTracking } from './seo-analytics.js';

// Initialize SEO components when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize SEO tracking
    initSEOTracking();

    // Add script to detect and handle deeplinks
    handleDeepLinks();

    // Log page loading performance
    logPagePerformance();
});

// Handle deep links from social media or search engines
function handleDeepLinks() {
    // Check if there's a hash in the URL
    if (window.location.hash) {
        const hash = window.location.hash.substring(1);
        // Try to find the element with that ID
        const element = document.getElementById(hash);
        if (element) {
            // Scroll to the element after a short delay to ensure page is loaded
            setTimeout(() => {
                element.scrollIntoView({
                    behavior: 'smooth'
                });
            }, 500);
        }
    }
}

// Log page performance metrics
function logPagePerformance() {
    // Wait for page to fully load
    window.addEventListener('load', () => {
        // Use Performance API if available
        if (window.performance) {
            // Get navigation timing
            const perfData = window.performance.timing;
            const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
            const domReadyTime = perfData.domComplete - perfData.domLoading;

            console.log(`Page load time: ${pageLoadTime}ms`);
            console.log(`DOM ready time: ${domReadyTime}ms`);

            // Report to analytics if it's slow
            if (pageLoadTime > 3000 && window.gtag) {
                gtag('event', 'performance_issue', {
                    event_category: 'Performance',
                    event_label: 'Slow page load',
                    value: pageLoadTime
                });
            }
        }
    });
}

// Initialize everything
initSEOTracking();