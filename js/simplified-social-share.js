// simplified-social-share.js - A simpler implementation that won't crash the page

/**
 * Simple Social Sharing Implementation
 * This version focuses on stability and simplicity
 */

// Wait for document to be fully loaded before doing anything
document.addEventListener('DOMContentLoaded', function() {
    console.log("Social sharing script loaded");

    // Set up share toggle buttons - wait a moment to ensure posts are rendered
    setTimeout(function() {
        try {
            setupShareButtons();
        } catch (error) {
            console.error("Error setting up share buttons:", error);
        }
    }, 1000);

    // Also initialize when new content might be loaded
    document.addEventListener('widgets-complete', function() {
        setTimeout(function() {
            try {
                setupShareButtons();
            } catch (error) {
                console.error("Error setting up share buttons after widgets:", error);
            }
        }, 1000);
    });
});

/**
 * Set up all share buttons on the page
 */
function setupShareButtons() {
    // Find all toggle buttons
    const toggleButtons = document.querySelectorAll('.social-share .toggle-button');
    console.log(`Found ${toggleButtons.length} share toggle buttons`);

    // Add click handlers to each button
    toggleButtons.forEach(function(button) {
        // Skip if already initialized to prevent duplicate handlers
        if (button.getAttribute('data-share-initialized') === 'true') {
            return;
        }

        // Mark as initialized
        button.setAttribute('data-share-initialized', 'true');

        // Add click handler
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            // Find the icons container (sibling of this button)
            const iconsContainer = this.nextElementSibling;
            if (iconsContainer && iconsContainer.classList.contains('icons')) {
                // Toggle the visible class
                iconsContainer.classList.toggle('visible');

                // Set up share links if not already done
                if (!iconsContainer.getAttribute('data-share-initialized')) {
                    setupShareLinks(iconsContainer);
                    iconsContainer.setAttribute('data-share-initialized', 'true');
                }
            }
        });
    });

    // Close share icons when clicking elsewhere on the page
    document.addEventListener('click', function(e) {
        // Skip if clicking on a toggle button or share icon
        if (e.target.closest('.toggle-button') || e.target.closest('.icons')) {
            return;
        }

        // Hide all visible share icons
        document.querySelectorAll('.icons.visible').forEach(function(el) {
            el.classList.remove('visible');
        });
    });
}

/**
 * Set up share links for a specific post
 */
function setupShareLinks(iconsContainer) {
    try {
        // Find the post article this icons container belongs to
        const postElement = iconsContainer.closest('article.post') ||
            iconsContainer.closest('.post');

        if (!postElement) {
            console.log("Could not find post element");
            return;
        }

        // Get post URL and title
        let postUrl = '';
        let postTitle = '';

        // Try to find the link and title in various ways for flexibility
        const titleElement = postElement.querySelector('.post-title a') ||
            postElement.querySelector('.title a') ||
            postElement.querySelector('.title');

        if (titleElement) {
            // Get URL - either from href or construct from current page + post ID
            if (titleElement.hasAttribute('href')) {
                postUrl = titleElement.getAttribute('href');
            } else {
                // Try to find post ID from container
                const postId = postElement.getAttribute('data-post-id') ||
                    postElement.id ||
                    new URLSearchParams(window.location.search).get('id');

                if (postId) {
                    postUrl = `blog-single.html?id=${postId}`;
                }
            }

            // Get title text
            postTitle = titleElement.textContent || document.title;
        }

        // If we're on a single post page, use current URL
        if (window.location.pathname.includes('blog-single.html')) {
            postUrl = window.location.href;
        }

        // If we couldn't determine URL or title, use current page
        if (!postUrl) {
            postUrl = window.location.href;
        }

        if (!postTitle) {
            postTitle = document.title;
        }

        // Make sure URL is absolute
        if (!postUrl.includes('://')) {
            const baseUrl = window.location.origin;
            postUrl = baseUrl + (postUrl.startsWith('/') ? '' : '/') + postUrl;
        }

        // Encode URL and title for sharing
        const encodedUrl = encodeURIComponent(postUrl);
        const encodedTitle = encodeURIComponent(postTitle);

        // Find all share links in this container
        const links = iconsContainer.querySelectorAll('a');

        // Set up each link
        links.forEach(function(link) {
            // Determine which platform based on icon class or data attribute
            const icon = link.querySelector('i');
            if (!icon) return;

            let shareUrl = '';

            if (icon.classList.contains('fa-facebook-f')) {
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
            }
            else if (icon.classList.contains('fa-twitter')) {
                shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
            }
            else if (icon.classList.contains('fa-linkedin-in')) {
                shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
            }
            else if (icon.classList.contains('fa-pinterest')) {
                // Try to get image from post for Pinterest
                let imageUrl = '';
                const postImage = postElement.querySelector('.thumb img') ||
                    document.querySelector('.featured-image img');

                if (postImage && postImage.src) {
                    imageUrl = encodeURIComponent(postImage.src);
                }

                shareUrl = `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}&media=${imageUrl}`;
            }
            else if (icon.classList.contains('fa-telegram-plane')) {
                shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`;
            }
            else if (icon.classList.contains('fa-envelope')) {
                shareUrl = `mailto:?subject=${encodedTitle}&body=Check out this article: ${encodedUrl}`;
            }

            // Set href if we have a share URL
            if (shareUrl) {
                link.setAttribute('href', shareUrl);
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            }
        });

    } catch (error) {
        console.error("Error setting up share links:", error);
    }
}