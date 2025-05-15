// Create a new file: seo-analytics.js

/**
 * SEO Analytics Integration for Code to Crack
 * This script integrates analytics tracking and monitors SEO performance
 */

// Initialize analytics tracking
function initAnalytics() {
    // Google Analytics initialization
    // This should be placed in the <head> section of your HTML
    const gaScript = `
    <!-- Google Analytics -->
    <!-- Google tag (gtag.js) -->
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-SR2910X57Z"></script>
        <script>
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
        
          gtag('config', 'G-SR2910X57Z');
        </script>
    <!-- End Google Analytics -->
  `;

    // Only add if not already present
    if (!document.querySelector('script[src*="googletagmanager"]')) {
        document.head.insertAdjacentHTML('beforeend', gaScript);
    }
}

// Track pageviews
function trackPageview(pagePath, pageTitle) {
    if (window.gtag) {
        gtag('event', 'page_view', {
            page_path: pagePath || window.location.pathname,
            page_title: pageTitle || document.title
        });
    }
}

// Track content engagement
function trackContentEngagement() {
    // Track scroll depth
    let scrollDepthMarkers = [25, 50, 75, 90, 100];
    let markersSent = new Set();

    const getScrollDepth = () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.offsetHeight,
            document.body.clientHeight,
            document.documentElement.clientHeight
        ) - window.innerHeight;

        return scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0;
    };

    window.addEventListener('scroll', () => {
        const depth = getScrollDepth();

        for (const marker of scrollDepthMarkers) {
            if (depth >= marker && !markersSent.has(marker)) {
                markersSent.add(marker);

                if (window.gtag) {
                    gtag('event', 'scroll_depth', {
                        percent: marker,
                        page_path: window.location.pathname + window.location.search
                    });
                }
            }
        }
    }, { passive: true });

    // Track time on page
    let timeMarkers = [10, 30, 60, 120, 300]; // seconds
    let timeMarkersSent = new Set();
    let startTime = Date.now();

    const checkTimeOnPage = () => {
        const timeOnPage = Math.round((Date.now() - startTime) / 1000);

        for (const marker of timeMarkers) {
            if (timeOnPage >= marker && !timeMarkersSent.has(marker)) {
                timeMarkersSent.add(marker);

                if (window.gtag) {
                    gtag('event', 'time_on_page', {
                        seconds: marker,
                        page_path: window.location.pathname + window.location.search
                    });
                }
            }
        }
    };

    // Check time every 5 seconds
    setInterval(checkTimeOnPage, 5000);
}

// Track social sharing
function trackSocialSharing() {
    // Add click event listeners to social share buttons
    document.addEventListener('click', (e) => {
        const shareLink = e.target.closest('.social-share .icons a');
        if (shareLink) {
            const platform = shareLink.getAttribute('data-platform') ||
                shareLink.querySelector('i')?.className.replace('fab fa-', '').replace('far fa-', '') ||
                'unknown';

            if (window.gtag) {
                gtag('event', 'social_share', {
                    method: platform,
                    content_type: 'post',
                    item_id: findPostId(shareLink)
                });
            }
        }
    });
}

// Helper to find post ID
function findPostId(element) {
    const postElement = element.closest('[data-post-id]') ||
        element.closest('article.post');

    if (postElement) {
        return postElement.getAttribute('data-post-id') ||
            new URLSearchParams(window.location.search).get('id') ||
            'unknown';
    }

    return 'unknown';
}

// Initialize all tracking
function initSEOTracking() {
    initAnalytics();

    // Wait for page to load fully
    window.addEventListener('load', () => {
        trackPageview();
        trackContentEngagement();
        trackSocialSharing();
    });
}

// Export functions
export {
    initSEOTracking,
    trackPageview,
    trackContentEngagement,
    trackSocialSharing
};