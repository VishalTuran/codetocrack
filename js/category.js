// Updated category.js - Clean URL Integration
import { PostManager, CategoryManager } from './firebase-integration.js';
import { loadSidebarContent } from './sidebar.js';
import { URLManager } from './url-manager.js';

// Get category and subcategory from clean URL
function getCategoryFromUrl() {
    const route = URLManager.parseCurrentURL();

    if (route.type === 'category') {
        return {
            category: route.category,
            subcategory: route.subcategory || null
        };
    }

    // Fallback to query parameters for backward compatibility
    const urlParams = URLManager.getURLParams();
    return {
        category: urlParams.get('category'),
        subcategory: urlParams.get('subcategory')
    };
}

// Load category page content
async function loadCategoryContent() {
    try {
        const { category, subcategory } = getCategoryFromUrl();
        console.log(`Loading category page for: category=${category}, subcategory=${subcategory}`);

        if (!category) {
            console.warn('No category specified in URL');
            // Redirect to homepage if no category
            window.location.href = '/';
            return;
        }

        // Update page title and meta tags
        await updateCategoryPageMeta(category, subcategory);

        // Update page header
        await updateCategoryHeader(category, subcategory);

        // Load posts for this category
        await loadCategoryPosts(category, subcategory);

        // Load sidebar content
        await loadSidebarContent();

    } catch (error) {
        console.error('Error loading category content:', error);
        showErrorPage();
    }
}

// Update page meta tags and title
async function updateCategoryPageMeta(categorySlug, subcategorySlug) {
    try {
        const categories = await CategoryManager.getCategories();
        const currentCategory = categories.find(cat =>
            cat.slug && cat.slug.toLowerCase() === categorySlug.toLowerCase()
        );

        if (currentCategory) {
            let pageTitle = currentCategory.name;
            let description = currentCategory.description || `Articles about ${currentCategory.name}`;

            if (subcategorySlug && currentCategory.subcategories) {
                const subcategory = currentCategory.subcategories.find(sub =>
                    sub.slug && sub.slug.toLowerCase() === subcategorySlug.toLowerCase()
                );

                if (subcategory) {
                    pageTitle = `${subcategory.name} - ${currentCategory.name}`;
                    description = subcategory.description ||
                        `${subcategory.name} articles in ${currentCategory.name}`;
                }
            }

            // Update page title
            URLManager.updatePageTitle(pageTitle);

            // Update meta tags
            URLManager.updateMetaTags({
                title: `${pageTitle} - Code to Crack`,
                description: description,
                url: URLManager.generateCanonicalURL()
            });

            // Update breadcrumbs
            updateBreadcrumbs(currentCategory, subcategorySlug);
        }
    } catch (error) {
        console.error('Error updating category page meta:', error);
    }
}

// Update category header
async function updateCategoryHeader(categorySlug, subcategorySlug) {
    try {
        console.log('Updating category header for:', categorySlug);
        const categories = await CategoryManager.getCategories();

        if (!categories || categories.length === 0) {
            console.warn('No categories found in database');
            return;
        }

        // Find the current category (case-insensitive)
        const currentCategory = categories.find(cat =>
            cat.slug && cat.slug.toLowerCase() === categorySlug.toLowerCase()
        );

        if (currentCategory) {
            console.log('Found category:', currentCategory.name);

            let headerTitle = currentCategory.name;
            let description = currentCategory.description || '';

            if (subcategorySlug && currentCategory.subcategories) {
                const subcategory = currentCategory.subcategories.find(sub =>
                    sub.slug && sub.slug.toLowerCase() === subcategorySlug.toLowerCase()
                );

                if (subcategory) {
                    console.log('Found subcategory:', subcategory.name);
                    headerTitle = subcategory.name;
                    description = subcategory.description || description;
                }
            }

            // Update page header
            const pageHeader = document.querySelector('.page-header h1');
            if (pageHeader) {
                pageHeader.textContent = headerTitle;
            }

            // Update description
            const categoryDescription = document.getElementById('category-description');
            if (categoryDescription) {
                categoryDescription.textContent = description;
            }
        } else {
            console.warn(`Category not found: ${categorySlug}`);
            showErrorPage();
        }
    } catch (error) {
        console.error('Error updating category header:', error);
    }
}

// Update breadcrumbs
function updateBreadcrumbs(category, subcategorySlug) {
    const breadcrumbs = URLManager.generateBreadcrumbs();

    // Update breadcrumb names with actual category data
    breadcrumbs.forEach(crumb => {
        if (crumb.url === `/${category.slug}/`) {
            crumb.name = category.name;
        }

        if (subcategorySlug && category.subcategories) {
            const subcategory = category.subcategories.find(sub =>
                sub.slug === subcategorySlug
            );
            if (subcategory && crumb.url === `/${category.slug}/${subcategorySlug}/`) {
                crumb.name = subcategory.name;
            }
        }
    });

    // Update breadcrumb HTML if breadcrumb container exists
    const breadcrumbContainer = document.querySelector('.breadcrumb, .breadcrumbs');
    if (breadcrumbContainer) {
        breadcrumbContainer.innerHTML = breadcrumbs.map((crumb, index) => {
            if (index === breadcrumbs.length - 1) {
                return `<span class="current">${crumb.name}</span>`;
            }
            return `<a href="${crumb.url}">${crumb.name}</a>`;
        }).join(' / ');
    }
}

// Load category posts with clean URL support
async function loadCategoryPosts(categorySlug, subcategorySlug, page = 1) {
    try {
        console.log(`Loading posts for category: ${categorySlug}, subcategory: ${subcategorySlug || 'all'}`);

        // Show loading indicator
        const postsContainer = document.getElementById('main-posts-container');
        if (postsContainer) {
            postsContainer.innerHTML = `
                <div class="col-12 text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `;
        }

        let allPosts = [];

        if (subcategorySlug) {
            // If subcategory is specified, only show posts from that subcategory
            const subcategoryPosts = await PostManager.getPosts({
                page: page,
                pageSize: 50,
                category: categorySlug,
                subcategory: subcategorySlug,
                status: 'published',
                orderField: 'publishDate',
                orderDirection: 'desc'
            });

            allPosts = subcategoryPosts;
        } else {
            // If no subcategory is specified, get all category posts
            const categoryPosts = await PostManager.getPosts({
                page: page,
                pageSize: 50,
                category: categorySlug,
                status: 'published',
                orderField: 'publishDate',
                orderDirection: 'desc'
            });

            allPosts = categoryPosts;

            // Get all subcategories for this category
            const categories = await CategoryManager.getCategories();
            const currentCategory = categories.find(cat =>
                cat.slug && cat.slug.toLowerCase() === categorySlug.toLowerCase()
            );

            if (currentCategory && currentCategory.subcategories && currentCategory.subcategories.length > 0) {
                console.log(`Category has ${currentCategory.subcategories.length} subcategories, fetching their posts too`);

                // Get posts for each subcategory
                for (const subcategory of currentCategory.subcategories) {
                    console.log(`Fetching posts for subcategory: ${subcategory.name}`);
                    const subcategoryPosts = await PostManager.getPosts({
                        page: 1,
                        pageSize: 50,
                        category: categorySlug,
                        subcategory: subcategory.slug,
                        status: 'published',
                        orderField: 'publishDate',
                        orderDirection: 'desc'
                    });

                    console.log(`Found ${subcategoryPosts.length} posts in subcategory ${subcategory.name}`);

                    // Add posts to the combined array, avoiding duplicates
                    subcategoryPosts.forEach(post => {
                        if (!allPosts.some(p => p.id === post.id)) {
                            allPosts.push(post);
                        }
                    });
                }
            }

            // Sort combined posts by publish date (newest first)
            allPosts.sort((a, b) => {
                const dateA = a.publishDate?.seconds ? a.publishDate.seconds : new Date(a.publishDate).getTime() / 1000;
                const dateB = b.publishDate?.seconds ? b.publishDate.seconds : new Date(b.publishDate).getTime() / 1000;
                return dateB - dateA;
            });
        }

        console.log(`Total posts found: ${allPosts.length}`);

        // Render posts
        renderCategoryPosts(allPosts);

        // Initialize pagination if needed
        if (allPosts.length > 10) {
            initializePagination(allPosts, page);
        } else {
            // Hide pagination if not enough posts
            const paginationElement = document.querySelector('.pagination');
            if (paginationElement) {
                paginationElement.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading category posts:', error);
        showErrorMessage('There was a problem loading posts. Please try again later.');
    }
}

// Render category posts
function renderCategoryPosts(posts, postsPerPage = 10, currentPage = 1) {
    const postsContainer = document.getElementById('main-posts-container');

    if (!postsContainer) return;

    postsContainer.innerHTML = '';

    if (!posts || posts.length === 0) {
        postsContainer.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info">
                    <h4 class="alert-heading">No posts found</h4>
                    <p>There are no posts in this category yet. <a href="/">Browse other categories</a></p>
                </div>
            </div>
        `;
        return;
    }

    // Calculate pagination
    const startIndex = (currentPage - 1) * postsPerPage;
    const endIndex = startIndex + postsPerPage;
    const paginatedPosts = posts.slice(startIndex, endIndex);

    // Import renderPost from renderPosts.js
    import('./renderPosts.js').then(module => {
        // Render each post
        paginatedPosts.forEach(post => {
            const postHtml = module.renderPost(post, 'grid');
            postsContainer.innerHTML += postHtml;
        });
    }).catch(error => {
        console.error('Error importing renderPosts module:', error);
        showErrorMessage('There was a problem displaying the posts. Please try again later.');
    });
}

// Initialize pagination with clean URL support
function initializePagination(allPosts, currentPage = 1, postsPerPage = 10) {
    const paginationElement = document.querySelector('.pagination');
    if (!paginationElement) return;

    // Calculate total pages
    const totalPages = Math.ceil(allPosts.length / postsPerPage);

    // Don't show pagination if only one page
    if (totalPages <= 1) {
        paginationElement.style.display = 'none';
        return;
    }

    paginationElement.innerHTML = '';

    // Create pagination items
    for (let i = 1; i <= totalPages; i++) {
        const pageItem = document.createElement('li');
        pageItem.className = `page-item ${i === currentPage ? 'active' : ''}`;

        const pageLink = document.createElement('a');
        pageLink.className = 'page-link';
        pageLink.href = '#';
        pageLink.textContent = i;
        pageLink.dataset.page = i;

        pageItem.appendChild(pageLink);
        paginationElement.appendChild(pageItem);
    }

    // Add click event for pagination
    paginationElement.addEventListener('click', (e) => {
        const target = e.target.closest('.page-link');
        if (!target) return;

        e.preventDefault();

        const pageNum = parseInt(target.dataset.page);
        if (pageNum === currentPage) return;

        // Update pagination UI
        document.querySelectorAll('.pagination .page-item').forEach(item => {
            item.classList.remove('active');
        });
        target.parentElement.classList.add('active');

        // Render the selected page
        renderCategoryPosts(allPosts, postsPerPage, pageNum);

        // Scroll to top of posts
        document.getElementById('main-posts-container').scrollIntoView({
            behavior: 'smooth'
        });
    });
}

// Show error page
function showErrorPage() {
    const postsContainer = document.getElementById('main-posts-container');
    if (postsContainer) {
        postsContainer.innerHTML = `
            <div class="col-12">
                <div class="alert alert-warning">
                    <h4 class="alert-heading">Category not found</h4>
                    <p>The requested category could not be found. <a href="/">Return to homepage</a></p>
                </div>
            </div>
        `;
    }

    // Update page header
    const pageHeader = document.querySelector('.page-header h1');
    if (pageHeader) {
        pageHeader.textContent = 'Category Not Found';
    }
}

// Show error message
function showErrorMessage(message) {
    const postsContainer = document.getElementById('main-posts-container');
    if (postsContainer) {
        postsContainer.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    <h4 class="alert-heading">Error loading posts</h4>
                    <p>${message}</p>
                </div>
            </div>
        `;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', loadCategoryContent);

export {
    loadCategoryContent,
    getCategoryFromUrl,
    loadCategoryPosts
};