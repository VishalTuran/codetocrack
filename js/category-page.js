// category-page.js
import { loadPosts, loadPopularPosts } from './renderPosts.js';
import { CategoryManager } from './firebase-integration.js';

// Get category and subcategory from URL
function getCategoryFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        category: urlParams.get('category'),
        subcategory: urlParams.get('subcategory')
    };
}

// Load category page content
async function loadCategoryContent() {
    const { category, subcategory } = getCategoryFromUrl();

    if (!category) {
        window.location.href = 'index.html';
        return;
    }

    try {
        // Update page title and header
        await updateCategoryHeader(category, subcategory);

        // Load posts for this category
        await loadCategoryPosts(category, subcategory);

        // Load sidebar content
        loadCategorySidebar();

        // Initialize pagination
        initializeCategoryPagination(category, subcategory);

    } catch (error) {
        console.error('Error loading category content:', error);
    }
}

// Update category header
async function updateCategoryHeader(categorySlug, subcategorySlug) {
    try {
        const categories = await CategoryManager.getCategories();
        const currentCategory = categories.find(cat => cat.slug === categorySlug);

        if (currentCategory) {
            // Update page title
            let pageTitle = currentCategory.name;
            let headerTitle = currentCategory.name;

            if (subcategorySlug && currentCategory.subcategories) {
                const subcategory = currentCategory.subcategories.find(sub => sub.slug === subcategorySlug);
                if (subcategory) {
                    pageTitle = `${currentCategory.name} - ${subcategory.name}`;
                    headerTitle = subcategory.name;
                }
            }

            document.title = `${pageTitle} - Code to Crack`;

            // Update page header
            const pageHeader = document.querySelector('.page-header h1');
            if (pageHeader) {
                pageHeader.textContent = headerTitle;
            }
        }
    } catch (error) {
        console.error('Error updating category header:', error);
    }
}

// Load category posts
async function loadCategoryPosts(category, subcategory, page = 1) {
    try {
        const options = {
            page: page,
            pageSize: 10,
            orderField: 'publishDate',
            orderDirection: 'desc'
        };

        if (category) options.category = category;
        if (subcategory) options.subcategory = subcategory;

        await loadPosts(options);
    } catch (error) {
        console.error('Error loading category posts:', error);
    }
}

// Load category sidebar
async function loadCategorySidebar() {
    try {
        // Load popular posts
        await loadPopularPosts();

        // Load categories for sidebar
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

    } catch (error) {
        console.error('Error loading category sidebar:', error);
    }
}

// Initialize category pagination
function initializeCategoryPagination(category, subcategory) {
    const paginationElement = document.querySelector('.pagination');

    if (paginationElement) {
        let currentPage = 1;

        paginationElement.addEventListener('click', async (e) => {
            const target = e.target.closest('.page-link');

            if (target) {
                e.preventDefault();

                const pageNum = parseInt(target.dataset.page || target.textContent);

                if (!isNaN(pageNum) && pageNum !== currentPage) {
                    currentPage = pageNum;

                    // Update active state
                    updatePaginationState(currentPage);

                    // Load posts for current page
                    await loadCategoryPosts(category, subcategory, currentPage);

                    // Scroll to top of posts section
                    document.querySelector('.main-content').scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
        });
    }
}

// Update pagination state
function updatePaginationState(activePage) {
    const pageItems = document.querySelectorAll('.page-item');

    pageItems.forEach(item => {
        const link = item.querySelector('.page-link');
        if (link) {
            const pageNum = parseInt(link.dataset.page || link.textContent);

            if (pageNum === activePage) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        }
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', loadCategoryContent);

// Export functions
export {
    loadCategoryContent,
    getCategoryFromUrl,
    loadCategoryPosts
};