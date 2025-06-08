/**
 * Enhanced Widget Loader for Code to Crack
 *
 * This script provides a robust system for loading and initializing widgets
 * dynamically on pages with dependency management and event handling.
 */

class EnhancedWidgetLoader {
    /**
     * Initialize the widget loader
     */
    constructor(options = {}) {
        this.config = {
            widgetPath: 'widgets/',
            debug: false,
            autoInit: true,
            ...options
        };

        this.widgetsLoaded = 0;
        this.totalWidgets = 0;
        this.widgetRegistry = new Map();
        this.pageType = this.detectPageType();

        if (this.config.debug) {
            console.log(`Page type detected: ${this.pageType}`);
        }

        if (this.config.autoInit) {
            this.init();
        }
    }

    /**
     * Detect the current page type based on URL or page structure
     * @returns {string} Page type identifier
     */
    detectPageType() {
        const path = window.location.pathname;
        const filename = path.substring(path.lastIndexOf('/') + 1);

        if (filename === 'index.html' || filename === '') {
            return 'home';
        } else if (filename === 'category.html') {
            return 'category';
        } else if (filename === 'single-post.html') {
            return 'post';
        } else if (filename === 'search.html') {
            return 'search';
        }

        return 'unknown';
    }

    /**
     * Load a single widget from file
     * @param {string} widgetName - Name of the widget file (without path/extension)
     * @param {string} targetSelector - CSS selector for the target element
     * @returns {Promise} Promise that resolves when widget is loaded
     */
    loadCommonWidgets() {
        const promises = [];

        // Header widget
        if (document.querySelector('header')) {
            promises.push(this.loadWidget('header', 'header'));
        }

        // Footer widget
        if (document.querySelector('footer')) {
            promises.push(this.loadWidget('footer', 'footer'));
        }

        // Cookie consent banner
        if (document.querySelector('.cookie-consent-placeholder')) {
            promises.push(this.loadWidget('cookie-consent', '.cookie-consent-placeholder'));
        }

        // Sidebar widgets
        if (document.querySelector('.sidebar')) {
            // Check if sidebar has designated placeholders
            const sidebar = document.querySelector('.sidebar');

            if (sidebar.querySelector('.popular-posts-placeholder')) {
                promises.push(this.loadWidget('popular-posts', '.popular-posts-placeholder'));
            }

            if (sidebar.querySelector('.newsletter-placeholder')) {
                promises.push(this.loadWidget('newsletter', '.newsletter-placeholder'));
            }

            if (sidebar.querySelector('.topics-placeholder')) {
                promises.push(this.loadWidget('topics', '.topics-placeholder'));
            }
        }

        // Search popup
        if (document.querySelector('.search-popup-placeholder')) {
            promises.push(this.loadWidget('search-popup', '.search-popup-placeholder'));
        }

        // Canvas menu
        if (document.querySelector('.canvas-menu-placeholder')) {
            promises.push(this.loadWidget('canvas-menu', '.canvas-menu-placeholder'));
        }

        return Promise.all(promises);
    }

    /**
     * Load all common widgets used across the site
     * @returns {Promise} Promise that resolves when all widgets are loaded
     */
    loadCommonWidgets() {
        const promises = [];

        // Header widget
        if (document.querySelector('header')) {
            promises.push(this.loadWidget('header', 'header'));
        }

        // Footer widget
        if (document.querySelector('footer')) {
            promises.push(this.loadWidget('footer', 'footer'));
        }

        // Sidebar widgets
        if (document.querySelector('.sidebar')) {
            // Check if sidebar has designated placeholders
            const sidebar = document.querySelector('.sidebar');

            if (sidebar.querySelector('.popular-posts-placeholder')) {
                promises.push(this.loadWidget('popular-posts', '.popular-posts-placeholder'));
            }

            if (sidebar.querySelector('.newsletter-placeholder')) {
                promises.push(this.loadWidget('newsletter', '.newsletter-placeholder'));
            }

            if (sidebar.querySelector('.topics-placeholder')) {
                promises.push(this.loadWidget('topics', '.topics-placeholder'));
            }
        }

        // Search popup
        if (document.querySelector('.search-popup-placeholder')) {
            promises.push(this.loadWidget('search-popup', '.search-popup-placeholder'));
        }

        // Canvas menu
        if (document.querySelector('.canvas-menu-placeholder')) {
            promises.push(this.loadWidget('canvas-menu', '.canvas-menu-placeholder'));
        }

        return Promise.all(promises);
    }

    /**
     * Load page-specific widgets based on the detected page type
     * @returns {Promise} Promise that resolves when all page-specific widgets are loaded
     */
    loadPageSpecificWidgets() {
        const promises = [];

        switch (this.pageType) {
            case 'home':
                // Home page specific widgets (if any)
                break;

            case 'category':
                // Category page specific widgets (if any)
                break;

            case 'post':
                // Single post page specific widgets (if any)
                break;

            case 'search':
                // Search page specific widgets (if any)
                break;
        }

        return Promise.all(promises);
    }

    /**
     * Initialize widgets when DOM is ready
     */
    init() {
        document.addEventListener('DOMContentLoaded', () => {
            // Load common widgets first
            this.loadCommonWidgets()
                .then(() => {
                    // Then load page-specific widgets
                    return this.loadPageSpecificWidgets();
                })
                .then(() => {
                    // Initialize event handlers for all widgets
                    this.initWidgetEventHandlers();
                })
                .catch(error => {
                    console.error('Error loading widgets:', error);
                });
        });
    }

    /**
     * Initialize event handlers for interactive widgets
     */
    initWidgetEventHandlers() {
        // Search button
        document.querySelectorAll('.search.icon-button').forEach(button => {
            button.addEventListener('click', () => {
                const searchPopup = document.querySelector('.search-popup');
                if (searchPopup) {
                    searchPopup.classList.add('visible');
                }
            });
        });

        // Close search popup
        const searchCloseButton = document.querySelector('.search-popup .btn-close');
        if (searchCloseButton) {
            searchCloseButton.addEventListener('click', () => {
                document.querySelector('.search-popup').classList.remove('visible');
            });
        }

        // ESC key to close search
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const visiblePopup = document.querySelector('.search-popup.visible');
                if (visiblePopup) {
                    visiblePopup.classList.remove('visible');
                }
            }
        });

        // Burger menu toggle
        document.querySelectorAll('.burger-menu').forEach(button => {
            button.addEventListener('click', () => {
                const canvasMenu = document.querySelector('.canvas-menu');
                if (canvasMenu) {
                    canvasMenu.classList.add('visible');
                }
            });
        });

        // Close canvas menu
        const canvasCloseButton = document.querySelector('.canvas-menu .btn-close');
        if (canvasCloseButton) {
            canvasCloseButton.addEventListener('click', () => {
                document.querySelector('.canvas-menu').classList.remove('visible');
            });
        }

        // Back to top button
        const backToTopButton = document.getElementById('return-to-top');
        if (backToTopButton) {
            window.addEventListener('scroll', () => {
                if (window.pageYOffset > 300) {
                    backToTopButton.classList.add('visible');
                } else {
                    backToTopButton.classList.remove('visible');
                }
            });

            backToTopButton.addEventListener('click', (e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        // Page-specific event handlers
        this.initPageSpecificHandlers();
    }

    /**
     * Initialize page-specific event handlers
     */
    initPageSpecificHandlers() {
        switch (this.pageType) {
            case 'home':
                // Home page event handlers
                this.initHomePageHandlers();
                break;

            case 'category':
                // Category page event handlers
                this.initCategoryPageHandlers();
                break;

            case 'post':
                // Single post page event handlers
                this.initPostPageHandlers();
                break;

            case 'search':
                // Search page event handlers
                this.initSearchPageHandlers();
                break;
        }
    }

    /**
     * Initialize home page specific handlers
     */
    initHomePageHandlers() {
        // Featured posts carousel initialization
        const featuredCarousel = document.getElementById('featured-posts');
        if (featuredCarousel && typeof $.fn.slick !== 'undefined') {
            $(featuredCarousel).slick({
                dots: false,
                arrows: true,
                prevArrow: $('#carousel-prev'),
                nextArrow: $('#carousel-next'),
                slidesToShow: 3,
                slidesToScroll: 1,
                responsive: [
                    {
                        breakpoint: 991,
                        settings: {
                            slidesToShow: 2,
                        }
                    },
                    {
                        breakpoint: 575,
                        settings: {
                            slidesToShow: 1,
                        }
                    }
                ]
            });
        }
    }

    /**
     * Initialize category page specific handlers
     */
    initCategoryPageHandlers() {
        // Pagination handling
        document.querySelectorAll('.pagination .page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.getAttribute('data-page');
                if (page) {
                    // Handle page change
                    console.log(`Changing to page ${page}`);

                    // Update active page
                    document.querySelectorAll('.pagination .page-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    e.target.closest('.page-item').classList.add('active');
                }
            });
        });
    }

    /**
     * Initialize single post page specific handlers
     */
    initPostPageHandlers() {
        // Comment form handling
        const commentForm = document.getElementById('comment-form');
        if (commentForm) {
            commentForm.addEventListener('submit', (e) => {
                e.preventDefault();

                // Get form values
                const comment = document.getElementById('InputComment').value.trim();
                const email = document.getElementById('InputEmail').value.trim();
                const name = document.getElementById('InputName').value.trim();
                const website = document.getElementById('InputWeb').value.trim();

                if (comment && email && name) {
                    console.log('Form submitted:', { comment, email, name, website });
                    // This would normally be handled by your single-post.js to save the comment
                    // submitComment(postId, { comment, email, name, website });

                    // Clear form
                    commentForm.reset();

                    // Show success message
                    const messagesContainer = commentForm.querySelector('.messages');
                    messagesContainer.innerHTML = '<div class="alert alert-success">Comment submitted successfully and awaiting approval.</div>';

                    // Hide success message after 3 seconds
                    setTimeout(() => {
                        messagesContainer.innerHTML = '';
                    }, 3000);
                }
            });
        }
    }

    /**
     * Initialize search page specific handlers
     */
    initSearchPageHandlers() {
        // Search form handling
        const searchForm = document.getElementById('search-again-form');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const query = document.getElementById('search-input').value.trim();
                if (query) {
                    window.location.href = `search.html?q=${encodeURIComponent(query)}`;
                }
            });
        }
    }
}

// Create and initialize the widget loader
const widgetLoader = new EnhancedWidgetLoader({
    debug: false, // Set to true to see debug messages
    autoInit: true
});

// Export the loader instance for use in other modules
window.widgetLoader = widgetLoader;