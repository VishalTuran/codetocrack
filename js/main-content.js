import {
    loadPosts,
    loadFeaturedPosts,
} from './renderPosts.js';

import {
    loadSidebarContent
} from './sidebar.js'

import { PostManager } from './firebase-integration.js';

// Load home page content
async function loadHomeContent() {
    try {
        // Load featured posts
        await loadFeaturedPosts();

        setTimeout(() => {
            initializeCarouselNavigation();
        }, 500);

        // Load regular posts
        await loadPosts({
            page: 1,
            pageSize: 10,
            orderField: 'publishDate',
            orderDirection: 'desc'
        });

        // Load sidebar content
        await loadSidebarContent();

        // Initialize pagination
        await initializePagination();

    } catch (error) {
        console.error('Error loading home content:', error);
    }
}

// This fix needs to be added to the main-content.js file after the loadHomeContent function

// Enhanced carousel navigation for featured posts
function initCarousel() {
    const carousel = document.getElementById('featured-posts');
    const prevButton = document.getElementById('carousel-prev');
    const nextButton = document.getElementById('carousel-next');

    if (!carousel || !prevButton || !nextButton) return;

    // Set scroll amount (width of one card + gap)
    const scrollAmount = 370; // Approximate width of card + padding

    // Add click event to previous button
    prevButton.addEventListener('click', () => {
        carousel.scrollBy({
            left: -scrollAmount,
            behavior: 'smooth'
        });
    });

    // Add click event to next button
    nextButton.addEventListener('click', () => {
        carousel.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
        });
    });

    // Hide navigation buttons when at the beginning or end
    carousel.addEventListener('scroll', () => {
        const isAtStart = carousel.scrollLeft <= 10;
        const isAtEnd = carousel.scrollLeft >= (carousel.scrollWidth - carousel.clientWidth - 10);

        prevButton.style.opacity = isAtStart ? '0.5' : '1';
        nextButton.style.opacity = isAtEnd ? '0.5' : '1';
    });

    // Initial check for button opacity
    const isAtStart = carousel.scrollLeft <= 10;
    prevButton.style.opacity = isAtStart ? '0.5' : '1';
}

// Initialize pagination
// In main-content.js, modify the initializePagination function:

// In main-content.js, modify the initializePagination function:

async function initializePagination() {
    try {
        const totalPosts = await getTotalPostCount();
        const postsPerPage = 10;
        const totalPages = Math.max(1, Math.ceil(totalPosts / postsPerPage));

        console.log(`Pagination: Total posts: ${totalPosts}, Posts per page: ${postsPerPage}, Total pages: ${totalPages}`);

        const paginationElement = document.querySelector('.pagination');
        if (!paginationElement) return;

        // Clear existing pagination
        paginationElement.innerHTML = '';

        // Hide pagination if only one page exists
        if (totalPages <= 1) {
            paginationElement.style.display = 'none';
            return;
        } else {
            paginationElement.style.display = 'flex';
        }

        // Get current page from URL if available, otherwise default to 1
        const urlParams = new URLSearchParams(window.location.search);
        let currentPage = parseInt(urlParams.get('page')) || 1;

        // Make sure currentPage is valid
        if (currentPage < 1 || currentPage > totalPages) {
            currentPage = 1;
        }

        // Create pagination items
        for (let i = 1; i <= totalPages; i++) {
            const pageItem = document.createElement('li');
            pageItem.className = `page-item${i === currentPage ? ' active' : ''}`;

            const pageLink = document.createElement('a'); // Always create an 'a' element for all pages
            pageLink.className = 'page-link';
            pageLink.textContent = i;
            pageLink.dataset.page = i;
            pageLink.href = `?page=${i}`;  // Add proper URL with page parameter

            if (i === currentPage) {
                pageItem.setAttribute('aria-current', 'page');
            }

            // Add click event to ALL page links including page 1
            pageLink.addEventListener('click', async (e) => {
                e.preventDefault();

                const pageNum = parseInt(e.target.dataset.page);

                if (!isNaN(pageNum)) {
                    console.log(`Navigating to page ${pageNum}`); // Debug log

                    // Always update URL
                    if (pageNum === 1) {
                        // For page 1, remove the page parameter for cleaner URLs
                        window.history.pushState({}, '', window.location.pathname);
                    } else {
                        window.history.pushState({}, '', `?page=${pageNum}`);
                    }

                    // Update currentPage
                    currentPage = pageNum;

                    // Update active state in pagination
                    updatePaginationState(currentPage);

                    // Load posts for the selected page
                    await loadPosts({
                        page: currentPage,
                        pageSize: postsPerPage,
                        orderField: 'publishDate',
                        orderDirection: 'desc'
                    });

                    // Scroll to top of posts section
                    document.querySelector('#main-posts-container').scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            });

            pageItem.appendChild(pageLink);
            paginationElement.appendChild(pageItem);
        }
    } catch (error) {
        console.error('Error initializing pagination:', error);
    }
}

async function getTotalPostCount() {
    try {
        const allPosts = await PostManager.getPosts({
            pageSize: 1000, // Large number to get all posts
            orderField: 'publishDate',
            orderDirection: 'desc'
        });
        console.log('Total posts:', allPosts.length);

        return allPosts.length;
    } catch (error) {
        console.error('Error getting post count:', error);
        return 0;
    }
}

// Update pagination state
function updatePaginationState(activePage) {
    const pageItems = document.querySelectorAll('.pagination .page-item');

    console.log(`Updating pagination state, active page: ${activePage}`); // Debug log

    pageItems.forEach(item => {
        const link = item.querySelector('.page-link');
        if (!link) return;

        const pageNum = parseInt(link.dataset.page);
        if (isNaN(pageNum)) return;

        if (pageNum === activePage) {
            item.classList.add('active');
            item.setAttribute('aria-current', 'page');
        } else {
            item.classList.remove('active');
            item.removeAttribute('aria-current');
        }
    });
}

// Initialize search functionality
function initializeSearch() {
    const searchButton = document.querySelector('.search');

    // Check if search popup exists
    const searchPopup = document.querySelector('.search-popup');
    if (!searchPopup) {
        console.warn('Search popup not found. Search functionality not initialized.');
        return; // Exit early if search popup isn't found
    }

    const searchForm = document.querySelector('.search-form');
    if (!searchForm) {
        console.warn('Search form not found. Search functionality not initialized.');
        return; // Exit early if search form isn't found
    }

    const searchInput = searchForm.querySelector('input[type="search"]');
    if (!searchInput) {
        console.warn('Search input not found. Search functionality not initialized.');
        return; // Exit early if search input isn't found
    }

    const closeButton = searchPopup.querySelector('.btn-close');

    // Open search popup
    if (searchButton) {
        searchButton.addEventListener('click', () => {
            searchPopup.classList.add('visible');
            searchInput.focus();
        });
    }

    // Close search popup
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            searchPopup.classList.remove('visible');
        });
    }

    // Close search popup on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && searchPopup.classList.contains('visible')) {
            searchPopup.classList.remove('visible');
        }
    });

    // Handle search form submission
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const searchTerm = searchInput.value.trim();

            if (searchTerm) {
                // Redirect to search results page
                window.location.href = `search.html?q=${encodeURIComponent(searchTerm)}`;
            }
        });
    }
}

// Initialize back to top button
function initializeBackToTop() {
    const backToTopButton = document.getElementById('return-to-top');

    if (backToTopButton) {
        // Show/hide button based on scroll position
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 100) {
                backToTopButton.style.display = 'inline-block';
            } else {
                backToTopButton.style.display = 'none';
            }
        });

        // Smooth scroll to top
        backToTopButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

// Main initialization function
function initializeMainContent() {
    loadHomeContent();
    initializeBackToTop();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only handle back to top and content initially
    loadHomeContent();
    initializeBackToTop();

    // Wait for all widgets to be loaded before initializing search
    document.addEventListener('widgets-complete', () => {
        console.log('All widgets loaded, initializing search functionality...');
        initializeSearch();
    });
});

function initializeCarouselNavigation() {
    console.log("Initializing carousel navigation");
    const carousel = document.getElementById('featured-posts');
    const prevButton = document.getElementById('carousel-prev');
    const nextButton = document.getElementById('carousel-next');

    if (!carousel || !prevButton || !nextButton) {
        console.error("Missing carousel elements:",
            !carousel ? "carousel container" : "",
            !prevButton ? "prev button" : "",
            !nextButton ? "next button" : "");
        return;
    }

    console.log("Carousel elements found, attaching event listeners");

    // Set scroll amount (width of one card + gap)
    const scrollAmount = 350; // Approximate width of card + padding

    // Add click event to previous button
    prevButton.addEventListener('click', () => {
        console.log("Previous button clicked, scrolling left");
        carousel.scrollBy({
            left: -scrollAmount,
            behavior: 'smooth'
        });
    });

    // Add click event to next button
    nextButton.addEventListener('click', () => {
        console.log("Next button clicked, scrolling right");
        carousel.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
        });
    });

    // Make buttons visible and cursor pointer
    prevButton.style.display = 'flex';
    nextButton.style.display = 'flex';
    prevButton.style.cursor = 'pointer';
    nextButton.style.cursor = 'pointer';

    console.log("Carousel navigation initialized successfully");
}


// Export functions
export {
    loadHomeContent,
    loadSidebarContent,
    initializeSearch,
    initializePagination,
    initCarousel,
    initializeCarouselNavigation
};