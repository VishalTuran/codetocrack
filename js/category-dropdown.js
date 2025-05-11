// This script ensures categories are properly loaded in the New Post form
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, setting up category dropdown handlers");

    // Initial load of categories
    loadCategoriesForNewPost();

    // Add a refresh button next to the category dropdown
    addCategoryRefreshButton();

    // Monitor for section changes to reload categories when needed
    enhanceNavigation();
});

// Load categories for the New Post form
async function loadCategoriesForNewPost() {
    console.log("Loading categories for New Post form");

    const categorySelect = document.getElementById('post-category');
    if (!categorySelect) {
        console.error("Category select element not found");
        return;
    }

    try {
        // Show loading state
        categorySelect.innerHTML = '<option value="">Loading categories...</option>';
        categorySelect.disabled = true;

        // Import Firebase integration dynamically
        const { CategoryManager } = await import('./firebase-integration.js');

        if (!CategoryManager) {
            throw new Error('CategoryManager is not available');
        }

        // Get categories from Firebase
        const categories = await CategoryManager.getCategories();
        console.log("Categories loaded:", categories ? categories.length : 0);

        // Reset dropdown
        categorySelect.innerHTML = '<option value="">Select Category</option>';

        // Populate dropdown
        if (categories && categories.length > 0) {
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.slug;
                option.textContent = category.name;
                categorySelect.appendChild(option);
            });
        } else {
            // If no categories exist, add a default option
            const option = document.createElement('option');
            option.value = "uncategorized";
            option.textContent = "Uncategorized";
            categorySelect.appendChild(option);
        }

        // Re-enable the dropdown
        categorySelect.disabled = false;

        // Set up category change handler for subcategories
        setupCategoryChangeHandler(categories);

        // Show notification if successful
        showNotification("Categories loaded successfully", "success");

    } catch (error) {
        console.error('Error loading categories:', error);

        // Add a default category in case of error
        categorySelect.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "Select Category";
        categorySelect.appendChild(defaultOption);

        const option = document.createElement('option');
        option.value = "uncategorized";
        option.textContent = "Uncategorized";
        categorySelect.appendChild(option);

        // Re-enable the dropdown
        categorySelect.disabled = false;

        // Show error notification
        showNotification("Error loading categories: " + error.message, "danger");
    }
}

// Setup category change handler for subcategories
function setupCategoryChangeHandler(categories) {
    const categorySelect = document.getElementById('post-category');
    const subcategorySelect = document.getElementById('post-subcategory');

    if (!categorySelect || !subcategorySelect) return;

    categorySelect.addEventListener('change', function() {
        const categorySlug = this.value;

        // Reset subcategory dropdown
        subcategorySelect.innerHTML = '<option value="">Select Subcategory</option>';
        subcategorySelect.disabled = !categorySlug;

        if (!categorySlug) return;

        // Find the selected category
        const selectedCategory = categories.find(cat => cat.slug === categorySlug);

        // Add subcategories if available
        if (selectedCategory && selectedCategory.subcategories && selectedCategory.subcategories.length > 0) {
            selectedCategory.subcategories.forEach(sub => {
                const option = document.createElement('option');
                option.value = sub.slug;
                option.textContent = sub.name;
                subcategorySelect.appendChild(option);
            });
        }
    });
}

// Add a refresh button next to the category dropdown
function addCategoryRefreshButton() {
    const categoryLabel = document.querySelector('label[for="post-category"]');
    if (!categoryLabel) return;

    // Create a refresh button
    const refreshButton = document.createElement('button');
    refreshButton.type = 'button';
    refreshButton.className = 'btn btn-sm btn-outline-secondary ms-2';
    refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i>';
    refreshButton.title = 'Refresh Categories';
    refreshButton.style.padding = '0.25rem 0.5rem';
    refreshButton.style.lineHeight = '1';

    // Add click handler
    refreshButton.addEventListener('click', function(e) {
        e.preventDefault();
        loadCategoriesForNewPost();
    });

    // Insert after label
    categoryLabel.insertAdjacentElement('afterend', refreshButton);
}

// Enhance navigation to reload categories when needed
function enhanceNavigation() {
    // Enhance showSection function to load categories when needed
    const originalShowSection = window.showSection;
    if (typeof originalShowSection === 'function') {
        window.showSection = function(sectionId) {
            // Call the original showSection function
            originalShowSection(sectionId);

            // If navigating to new-post, load categories
            if (sectionId === 'new-post') {
                console.log("New Post section activated, loading categories");
                setTimeout(function() {
                    loadCategoriesForNewPost();
                }, 200); // Small delay to ensure the section is visible
            }
        };
    }
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} position-fixed top-0 end-0 m-3`;
    notification.style.zIndex = '9999';
    notification.style.maxWidth = '400px';
    notification.innerHTML = `
        <div class="d-flex align-items-center">
            <div>${message}</div>
            <button type="button" class="btn-close ms-2" aria-label="Close"></button>
        </div>
    `;

    document.body.appendChild(notification);

    // Add event listener to close button
    notification.querySelector('.btn-close').addEventListener('click', () => {
        notification.remove();
    });

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Export functions for use in other modules
window.loadCategoriesForNewPost = loadCategoriesForNewPost;