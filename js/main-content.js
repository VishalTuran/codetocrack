// main-content.js
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

// Initialize pagination
async function initializePagination() {
    try {
        // Get total post count from Firebase or use a function to calculate it
        const totalPosts = await getTotalPostCount();

        // Calculate number of pages based on posts per page
        const postsPerPage = 10; // This should match your loadPosts pageSize parameter
        const totalPages = Math.max(1, Math.ceil(totalPosts / postsPerPage));

        console.log(`Pagination: Total posts: ${totalPosts}, Posts per page: ${postsPerPage}, Total pages: ${totalPages}`);

        // Get pagination element
        const paginationElement = document.querySelector('.pagination');

        if (paginationElement) {
            // Clear existing pagination
            paginationElement.innerHTML = '';

            // Hide pagination if only one page exists
            if (totalPages <= 1) {
                paginationElement.style.display = 'none';
                return;
            } else {
                paginationElement.style.display = 'flex';
            }

            let currentPage = 1;

            // Create pagination items
            for (let i = 1; i <= totalPages; i++) {
                const pageItem = document.createElement('li');
                pageItem.className = 'page-item' + (i === currentPage ? ' active' : '');

                const pageLink = document.createElement(i === currentPage ? 'span' : 'a');
                pageLink.className = 'page-link';
                pageLink.textContent = i;
                pageLink.dataset.page = i;

                if (i !== currentPage) {
                    pageLink.href = '#';
                    pageLink.addEventListener('click', async (e) => {
                        e.preventDefault();

                        // Get page number from link
                        const pageNum = parseInt(e.target.dataset.page);

                        if (!isNaN(pageNum) && pageNum !== currentPage) {
                            currentPage = pageNum;

                            // Update active state
                            updatePaginationState(currentPage);

                            // Load posts for current page
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
                } else {
                    pageItem.setAttribute('aria-current', 'page');
                }

                pageItem.appendChild(pageLink);
                paginationElement.appendChild(pageItem);
            }

            // Add event listener for pagination
            paginationElement.addEventListener('click', async (e) => {
                const target = e.target.closest('.page-link');

                if (target && !target.parentNode.classList.contains('active')) {
                    e.preventDefault();

                    // Get page number from data attribute
                    const pageNum = parseInt(target.dataset.page);

                    if (!isNaN(pageNum) && pageNum !== currentPage) {
                        currentPage = pageNum;

                        // Update active state
                        updatePaginationState(currentPage);

                        // Load posts for current page
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
                }
            });
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
    const pageItems = document.querySelectorAll('.page-item');

    pageItems.forEach(item => {
        const link = item.querySelector('.page-link');
        const pageNum = parseInt(link.dataset.page);

        if (pageNum === activePage) {
            item.classList.add('active');
            item.setAttribute('aria-current', 'page');
            if (link.tagName.toLowerCase() === 'a') {
                // Convert a to span for active page
                const span = document.createElement('span');
                span.className = 'page-link';
                span.textContent = link.textContent;
                span.dataset.page = link.dataset.page;
                item.replaceChild(span, link);
            }
        } else {
            item.classList.remove('active');
            item.removeAttribute('aria-current');
            if (link.tagName.toLowerCase() === 'span') {
                // Convert span to a for inactive pages
                const a = document.createElement('a');
                a.className = 'page-link';
                a.textContent = link.textContent;
                a.dataset.page = link.dataset.page;
                a.href = '#';
                item.replaceChild(a, link);
            }
        }
    });
}

// Initialize search functionality
function initializeSearch() {
    const searchButton = document.querySelector('.search');
    const searchPopup = document.querySelector('.search-popup');
    const searchForm = document.querySelector('.search-form');
    const searchInput = searchForm.querySelector('input[type="search"]');
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    loadHomeContent();
    initializeSearch();
    initializeBackToTop();
});

// Export functions
export {
    loadHomeContent,
    loadSidebarContent,
    initializeSearch,
    initializePagination
};