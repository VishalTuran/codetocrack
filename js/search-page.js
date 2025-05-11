// search-page.js
import { PostManager } from './firebase-integration.js';
import { renderPost, loadPopularPosts } from './renderPosts.js';
import { CategoryManager } from './firebase-integration.js';

// Get search query from URL
function getSearchQuery() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('q');
}

// Perform search
async function performSearch(query, page = 1) {
    if (!query) return { results: [], total: 0, pages: 0 };

    try {
        // Get all posts
        const posts = await PostManager.getPosts({
            pageSize: 100 // Get more posts to search through
        });

        // Filter posts based on search query
        const searchResults = posts.filter(post => {
            const searchTerm = query.toLowerCase();
            return (
                post.title.toLowerCase().includes(searchTerm) ||
                post.excerpt.toLowerCase().includes(searchTerm) ||
                post.content.toLowerCase().includes(searchTerm) ||
                (post.tags && post.tags.some(tag => tag.toLowerCase().includes(searchTerm))) ||
                post.category.toLowerCase().includes(searchTerm)
            );
        });

        // Apply pagination to search results
        const pageSize = 10;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedResults = searchResults.slice(startIndex, endIndex);

        return {
            results: paginatedResults,
            total: searchResults.length,
            pages: Math.ceil(searchResults.length / pageSize)
        };
    } catch (error) {
        console.error('Error performing search:', error);
        return { results: [], total: 0, pages: 0 };
    }
}

// Load search results
async function loadSearchResults() {
    const query = getSearchQuery();

    if (!query) {
        window.location.href = 'index.html';
        return;
    }

    try {
        showLoader();

        // Update page title
        document.title = `Search Results for "${query}" - Code to Crack`;

        // Update page header
        updateSearchHeader(query);

        // Update search input value
        const searchInputs = document.querySelectorAll('input[type="search"]');
        searchInputs.forEach(input => {
            input.value = query;
        });

        // Perform search
        const { results, total, pages } = await performSearch(query);

        // Render results
        renderSearchResults(results, total);

        // Initialize pagination
        if (pages > 1) {
            initializeSearchPagination(query, pages);
        } else {
            // Hide pagination if only one page
            const paginationElement = document.querySelector('.pagination');
            if (paginationElement) {
                paginationElement.style.display = 'none';
            }
        }

        // Load sidebar content
        loadSidebarContent();

        hideLoader();
    } catch (error) {
        console.error('Error loading search results:', error);
        showError('Failed to load search results.');
    }
}

// Update search header
function updateSearchHeader(query) {
    const pageHeader = document.querySelector('.page-header h1');
    if (pageHeader) {
        pageHeader.textContent = `Search Results for "${query}"`;
    }
}

// Render search results
function renderSearchResults(results, total) {
    const resultsContainer = document.querySelector('.col-lg-8 .row');

    if (resultsContainer) {
        resultsContainer.innerHTML = '';

        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info">
                        <h4 class="alert-heading">No results found</h4>
                        <p>Try different keywords or check your spelling.</p>
                    </div>
                </div>
            `;
        } else {
            // Add results summary
            const summaryDiv = document.createElement('div');
            summaryDiv.className = 'col-12 mb-4';
            summaryDiv.innerHTML = `
                <p class="text-muted">Found ${total} result${total !== 1 ? 's' : ''}</p>
            `;
            resultsContainer.appendChild(summaryDiv);

            // Render each result
            results.forEach(post => {
                const postHtml = renderPost(post, 'grid');
                resultsContainer.innerHTML += postHtml;
            });
        }
    }
}

// Initialize search pagination
function initializeSearchPagination(query, totalPages) {
    const paginationElement = document.querySelector('.pagination');

    if (paginationElement) {
        // Create pagination HTML
        let paginationHtml = '';
        for (let i = 1; i <= totalPages; i++) {
            paginationHtml += `
                <li class="page-item ${i === 1 ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }
        paginationElement.innerHTML = paginationHtml;

        // Add click event listener
        paginationElement.addEventListener('click', async (e) => {
            const target = e.target.closest('.page-link');

            if (target) {
                e.preventDefault();

                const pageNum = parseInt(target.dataset.page);
                const currentPage = document.querySelector('.page-item.active .page-link')?.dataset.page;

                if (pageNum !== parseInt(currentPage)) {
                    // Update active state
                    document.querySelectorAll('.page-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    target.parentElement.classList.add('active');

                    // Load results for current page
                    showLoader();

                    const { results, total } = await performSearch(query, pageNum);
                    renderSearchResults(results, total);

                    hideLoader();

                    // Scroll to top of results
                    document.querySelector('.main-content').scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
        });
    }
}

// Load sidebar content
async function loadSidebarContent() {
    try {
        // Load popular posts
        await loadPopularPosts();

        // Load topics (categories)
        const categories = await CategoryManager.getCategories();

        // Render categories in sidebar
        const topicsList = document.querySelector('#topics-list');
        if (topicsList && categories) {
            topicsList.innerHTML = '';

            categories.forEach(category => {
                const count = category.postCount || 0;
                const listItem = document.createElement('li');

                listItem.innerHTML = `
                    <a href="category.html?category=${category.slug}">${category.name}</a>
                    <span>(${count})</span>
                `;

                topicsList.appendChild(listItem);
            });
        }

        // Initialize search forms
        initializeSearchForms();

    } catch (error) {
        console.error('Error loading sidebar content:', error);
    }
}

// Initialize search forms
function initializeSearchForms() {
    const searchForms = document.querySelectorAll('.search-form');

    searchForms.forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const searchInput = form.querySelector('input[type="search"]');
            const query = searchInput.value.trim();

            if (query) {
                window.location.href = `search.html?q=${encodeURIComponent(query)}`;
            }
        });
    });
}

// Utility functions
function showLoader() {
    const loaderDiv = document.createElement('div');
    loaderDiv.id = 'search-loader';
    loaderDiv.className = 'text-center my-5';
    loaderDiv.innerHTML = `
        <div class="spinner-border" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    `;

    const resultsContainer = document.querySelector('.col-lg-8 .row');
    if (resultsContainer) {
        resultsContainer.innerHTML = '';
        resultsContainer.appendChild(loaderDiv);
    }
}

function hideLoader() {
    const loader = document.getElementById('search-loader');
    if (loader) {
        loader.remove();
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger';
    errorDiv.textContent = message;

    const resultsContainer = document.querySelector('.col-lg-8 .row');
    if (resultsContainer) {
        resultsContainer.innerHTML = '';
        resultsContainer.appendChild(errorDiv);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', loadSearchResults);

// Export functions
export {
    loadSearchResults,
    performSearch,
    getSearchQuery
};