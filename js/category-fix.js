// Immediately-invoked function expression to avoid variable collisions
(async function() {
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
        // Remove any existing event listeners by cloning and replacing the form
        const originalForm = document.getElementById('category-form');
        if (originalForm) {
            const newForm = originalForm.cloneNode(true);
            originalForm.parentNode.replaceChild(newForm, originalForm);

            // Now initialize our form
            initializeCategoryForm(newForm);
        }

        // Initialize subcategory functionality
        initializeSubcategoryUI();
    });

    // Initialize category form
    function initializeCategoryForm(form) {
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("Category form submitted");

            try {
                const categoryData = {
                    name: document.getElementById('category-name').value,
                    slug: document.getElementById('category-slug').value || slugify(document.getElementById('category-name').value),
                    description: document.getElementById('category-description').value,
                    subcategories: getSubcategoriesFromUI() // Get subcategories from UI
                };

                // Validate required fields
                if (!categoryData.name) {
                    throw new Error('Please enter a category name');
                }

                // Import the modules directly when needed
                const { CategoryManager } = await import('./firebase-integration.js');

                if (!CategoryManager) {
                    throw new Error('CategoryManager is not available');
                }

                // Check if we're editing an existing category or creating a new one
                const categoryId = form.getAttribute('data-category-id');

                if (categoryId) {
                    // Update existing category
                    await CategoryManager.updateCategory(categoryId, categoryData);
                    console.log("Category updated successfully");
                    showNotification('Category updated successfully!', 'success');
                } else {
                    // Create new category
                    await CategoryManager.createCategory(categoryData);
                    console.log("Category created successfully");
                    showNotification('Category created successfully!', 'success');
                }

                // Close modal
                const modalElement = document.getElementById('categoryModal');
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) {
                    modalInstance.hide();
                } else {
                    // Fallback if modal instance not found
                    modalElement.classList.remove('show');
                    modalElement.style.display = 'none';
                    modalElement.setAttribute('aria-hidden', 'true');
                    document.body.classList.remove('modal-open');
                    const modalBackdrops = document.querySelectorAll('.modal-backdrop');
                    modalBackdrops.forEach(backdrop => backdrop.remove());
                }

                // Reload categories
                loadCategories();

                // Reload categories dropdown
                loadCategoriesDropdown();

                // Reset form including category ID
                form.reset();
                form.removeAttribute('data-category-id');

                // Reset submit button text
                const submitButton = document.querySelector('#categoryModal .modal-footer button[type="submit"]');
                if (submitButton) {
                    submitButton.textContent = 'Save';
                }

                // Clear subcategories
                clearSubcategoriesUI();

            } catch (error) {
                console.error('Error saving category:', error);
                showNotification('Error saving category: ' + error.message, 'danger');
            }
        });

        // Auto-generate slug from name
        const nameInput = document.getElementById('category-name');
        const slugInput = document.getElementById('category-slug');

        if (nameInput && slugInput) {
            nameInput.addEventListener('input', () => {
                slugInput.value = slugify(nameInput.value);
            });
        }
    }

    // Initialize subcategory UI and functionality
    function initializeSubcategoryUI() {
        // Add subcategory section to the category modal if it doesn't exist
        const modalBody = document.querySelector('#categoryModal .modal-body');
        if (!modalBody || document.getElementById('subcategories-section')) return;

        // Create and append subcategory section
        const subcategoriesSection = document.createElement('div');
        subcategoriesSection.id = 'subcategories-section';
        subcategoriesSection.innerHTML = `
            <h5 class="mt-4 mb-3">Subcategories</h5>
            <div id="subcategories-list" class="mb-3">
                <!-- Subcategories will be added here -->
            </div>
            <div class="input-group mb-3">
                <input type="text" id="subcategory-name" class="form-control" placeholder="Subcategory Name">
                <button class="btn btn-outline-secondary" type="button" id="add-subcategory-btn">Add</button>
            </div>
        `;

        modalBody.appendChild(subcategoriesSection);

        // Add event listener for adding subcategories
        document.getElementById('add-subcategory-btn').addEventListener('click', () => {
            addSubcategoryToUI();
        });

        // Also allow pressing Enter to add subcategory
        document.getElementById('subcategory-name').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addSubcategoryToUI();
            }
        });
    }

    // Add a subcategory to the UI
    function addSubcategoryToUI() {
        const subcategoryInput = document.getElementById('subcategory-name');
        const subcategoryName = subcategoryInput.value.trim();

        if (!subcategoryName) return;

        const subcategorySlug = slugify(subcategoryName);
        const subcategoriesList = document.getElementById('subcategories-list');

        // Check if subcategory with this slug already exists
        const existingSubcategories = subcategoriesList.querySelectorAll('.subcategory-item');
        for (let i = 0; i < existingSubcategories.length; i++) {
            if (existingSubcategories[i].getAttribute('data-slug') === subcategorySlug) {
                showNotification('Subcategory with this name already exists', 'warning');
                return;
            }
        }

        // Create subcategory element
        const subcategoryElement = document.createElement('div');
        subcategoryElement.className = 'subcategory-item badge bg-light text-dark border d-flex align-items-center mb-2 me-2 p-2';
        subcategoryElement.setAttribute('data-name', subcategoryName);
        subcategoryElement.setAttribute('data-slug', subcategorySlug);
        subcategoryElement.style.display = 'inline-flex';

        subcategoryElement.innerHTML = `
            ${subcategoryName}
            <input type="hidden" name="subcategory-names[]" value="${subcategoryName}">
            <input type="hidden" name="subcategory-slugs[]" value="${subcategorySlug}">
            <button type="button" class="btn-close ms-2" style="font-size: 0.5rem;" aria-label="Remove"></button>
        `;

        // Add delete functionality
        subcategoryElement.querySelector('.btn-close').addEventListener('click', () => {
            subcategoryElement.remove();
        });

        // Add to list
        subcategoriesList.appendChild(subcategoryElement);

        // Clear input
        subcategoryInput.value = '';
        subcategoryInput.focus();
    }

    // Get subcategories from UI elements
    function getSubcategoriesFromUI() {
        const subcategoriesList = document.getElementById('subcategories-list');
        if (!subcategoriesList) return [];

        const subcategoryItems = subcategoriesList.querySelectorAll('.subcategory-item');
        const subcategories = [];

        subcategoryItems.forEach(item => {
            subcategories.push({
                name: item.getAttribute('data-name'),
                slug: item.getAttribute('data-slug')
            });
        });

        return subcategories;
    }

    // Clear subcategories UI
    function clearSubcategoriesUI() {
        const subcategoriesList = document.getElementById('subcategories-list');
        if (subcategoriesList) {
            subcategoriesList.innerHTML = '';
        }
    }

    // Generate slug from text
    function slugify(text) {
        return text.toString().toLowerCase()
            .replace(/\s+/g, '-')        // Replace spaces with -
            .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
            .replace(/\-\-+/g, '-')      // Replace multiple - with single -
            .replace(/^-+/, '')          // Trim - from start of text
            .replace(/-+$/, '');         // Trim - from end of text
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

    // Load categories
    async function loadCategories() {
        try {
            const { CategoryManager } = await import('./firebase-integration.js');

            if (!CategoryManager) {
                throw new Error('CategoryManager is not available');
            }

            const categories = await CategoryManager.getCategories();
            const categoryList = document.getElementById('categories-list');

            if (!categoryList) return;

            categoryList.innerHTML = '';

            if (!categories || categories.length === 0) {
                categoryList.innerHTML = '<div class="col-12 text-center">No categories found</div>';
                return;
            }

            categories.forEach(category => {
                const card = document.createElement('div');
                card.className = 'col-md-4 mb-3';

                // Display subcategories if any
                let subcategoriesHTML = '';
                if (category.subcategories && category.subcategories.length > 0) {
                    subcategoriesHTML = `
                        <div class="mb-2">
                            <strong>Subcategories:</strong>
                            <div class="mt-1">
                                ${category.subcategories.map(sub =>
                        `<span class="badge bg-secondary me-1 mb-1">${sub.name}</span>`
                    ).join('')}
                            </div>
                        </div>
                    `;
                }

                card.innerHTML = `
                    <div class="card h-100">
                        <div class="card-body">
                            <h5 class="card-title">${category.name}</h5>
                            <p class="card-text">${category.description || 'No description'}</p>
                            <p class="card-text"><small class="text-muted">Slug: ${category.slug}</small></p>
                            ${subcategoriesHTML}
                        </div>
                        <div class="card-footer bg-transparent border-top-0">
                            <button class="btn btn-sm btn-outline-primary edit-category" data-id="${category.id}">
                                <i class="fas fa-edit me-1"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-category" data-id="${category.id}">
                                <i class="fas fa-trash me-1"></i> Delete
                            </button>
                        </div>
                    </div>
                `;

                // Attach event listeners
                card.querySelector('.edit-category').addEventListener('click', function() {
                    editCategory(category.id);
                });

                card.querySelector('.delete-category').addEventListener('click', function() {
                    deleteCategory(category.id);
                });

                categoryList.appendChild(card);
            });
        } catch (error) {
            console.error('Error loading categories:', error);
            showNotification('Error loading categories: ' + error.message, 'danger');
        }
    }

    // Load categories dropdown
    async function loadCategoriesDropdown() {
        try {
            const { CategoryManager } = await import('./firebase-integration.js');

            if (!CategoryManager) {
                throw new Error('CategoryManager is not available');
            }

            const categories = await CategoryManager.getCategories();
            const categorySelect = document.getElementById('post-category');

            if (categorySelect) {
                categorySelect.innerHTML = '<option value="">Select Category</option>';

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
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            // Add a default category in case of error
            const categorySelect = document.getElementById('post-category');
            if (categorySelect) {
                categorySelect.innerHTML = '<option value="uncategorized">Uncategorized</option>';
            }
        }
    }

    // Category actions
    async function editCategory(categoryId) {
        try {
            // Show the category modal and load the category data
            const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
            modal.show();

            // Import the modules directly when needed
            const { CategoryManager } = await import('./firebase-integration.js');

            if (!CategoryManager) {
                throw new Error('CategoryManager is not available');
            }

            // Load category data
            const category = await CategoryManager.getCategory(categoryId);

            // Set form values
            document.getElementById('category-name').value = category.name;
            document.getElementById('category-slug').value = category.slug;
            document.getElementById('category-description').value = category.description || '';

            // Load subcategories
            clearSubcategoriesUI();
            if (category.subcategories && category.subcategories.length > 0) {
                const subcategoriesList = document.getElementById('subcategories-list');
                if (subcategoriesList) {
                    category.subcategories.forEach(sub => {
                        const subcategoryElement = document.createElement('div');
                        subcategoryElement.className = 'subcategory-item badge bg-light text-dark border d-flex align-items-center mb-2 me-2 p-2';
                        subcategoryElement.setAttribute('data-name', sub.name);
                        subcategoryElement.setAttribute('data-slug', sub.slug);
                        subcategoryElement.style.display = 'inline-flex';

                        subcategoryElement.innerHTML = `
                            ${sub.name}
                            <input type="hidden" name="subcategory-names[]" value="${sub.name}">
                            <input type="hidden" name="subcategory-slugs[]" value="${sub.slug}">
                            <button type="button" class="btn-close ms-2" style="font-size: 0.5rem;" aria-label="Remove"></button>
                        `;

                        // Add delete functionality
                        subcategoryElement.querySelector('.btn-close').addEventListener('click', () => {
                            subcategoryElement.remove();
                        });

                        subcategoriesList.appendChild(subcategoryElement);
                    });
                }
            }

            // Store category ID for update
            document.getElementById('category-form').setAttribute('data-category-id', categoryId);

            // Change submit button text
            const submitButton = document.querySelector('#categoryModal .modal-footer button[type="submit"]');
            if (submitButton) {
                submitButton.textContent = 'Update Category';
            }

            // Show success message
            showNotification('Category loaded for editing', 'success');
        } catch (error) {
            console.error('Error loading category:', error);
            showNotification('Error loading category: ' + error.message, 'danger');
        }
    }

    async function deleteCategory(categoryId) {
        if (confirm('Are you sure you want to delete this category? Posts in this category will not be deleted but will become uncategorized.')) {
            try {
                // Import the modules directly when needed
                const { CategoryManager } = await import('./firebase-integration.js');

                if (!CategoryManager) {
                    throw new Error('CategoryManager is not available');
                }

                // Delete the category
                await CategoryManager.deleteCategory(categoryId);
                showNotification('Category deleted successfully', 'success');

                // Reload categories
                await loadCategories();
            } catch (error) {
                console.error('Error deleting category:', error);
                showNotification('Error deleting category: ' + error.message, 'danger');
            }
        }
    }

    // Make functions globally available
    window.editCategory = editCategory;
    window.deleteCategory = deleteCategory;
})();