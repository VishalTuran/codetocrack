// admin-panel.js - Updated with slug support
import { PostManager, CategoryManager, CommentManager, NewsletterManager, ActivityManager } from './firebase-integration.js';

// Initialize the admin panel when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("Admin panel initializing...");

    // Set up section navigation
    initializeNavigation();

    // Try to load dashboard data
    loadDashboardStats();

    // Add editor initialization check
    checkEditorInitialization();

    // Register event handlers
    registerEventHandlers();

    console.log("Admin panel initialization complete");
});

// Initialize navigation
function initializeNavigation() {
    // The showSection function is already defined globally in the HTML file
    // Just ensure it's available as a global
    if (typeof window.showSection !== 'function') {
        // Define fallback if not already defined
        window.showSection = function(sectionId) {
            console.log(`Navigating to section: ${sectionId}`);

            // Hide all sections
            document.querySelectorAll('.section').forEach(section => {
                section.classList.add('d-none');
            });

            // Show the selected section
            const selectedSection = document.getElementById(sectionId);
            if (selectedSection) {
                selectedSection.classList.remove('d-none');

                // Update the active nav link
                document.querySelectorAll('.sidebar .nav-link').forEach(link => {
                    link.classList.remove('active');
                });

                const activeLink = document.querySelector(`.sidebar .nav-link[onclick="showSection('${sectionId}')"]`);
                if (activeLink) {
                    activeLink.classList.add('active');
                }

                // Handle special sections
                if (sectionId === 'new-post') {
                    // Initialize the editor if needed
                    initializeEditor();

                    // Load categories for the dropdown
                    loadCategoriesDropdown();
                }
            }
        };
    }

    // Enhance showSection to handle editor initialization
    const originalShowSection = window.showSection;
    window.showSection = function(sectionId) {
        // Call the original function
        originalShowSection(sectionId);

        // Add special handling
        if (sectionId === 'new-post') {
            setTimeout(() => {
                // Initialize the editor and load categories after a short delay
                // to ensure the section is visible
                initializeEditor();
                loadCategoriesDropdown();
            }, 100);
        }
    };

    // Set initial active section if not already set
    const activeSections = document.querySelectorAll('.section:not(.d-none)');
    if (activeSections.length === 0) {
        // No active section, show dashboard by default
        const dashboard = document.getElementById('dashboard');
        if (dashboard) {
            dashboard.classList.remove('d-none');

            // Set the dashboard nav link as active
            const dashboardLink = document.querySelector('.sidebar .nav-link[onclick="showSection(\'dashboard\')"]');
            if (dashboardLink) {
                dashboardLink.classList.add('active');
            }
        }
    }
}

// Register event handlers
function registerEventHandlers() {
    // Set up the post form
    initializeNewPostForm();

    // Set up category form
    initializeCategoryForm();

    // Set up comment management
    initializeCommentManagement();

    // Set up newsletter management
    initializeNewsletterManagement();
}

// Check if the editor is already initialized
function checkEditorInitialization() {
    // Check if we should initialize the editor (on the New Post page)
    const newPostSection = document.getElementById('new-post');
    if (newPostSection && !newPostSection.classList.contains('d-none')) {
        console.log("New Post section is visible, initializing editor");
        initializeEditor();
    }
}

// Initialize the modern editor
function initializeEditor() {
    console.log("Initializing TinyMCE editor");

    // Check if TinyMCE is already initialized
    if (typeof tinymce !== 'undefined' && tinymce.get('post-content')) {
        console.log("Editor already initialized");
        return;
    }

    // Check if TinyMCE is available
    if (typeof tinymce === 'undefined') {
        console.error("TinyMCE library not loaded");
        showNotification("Error: TinyMCE editor could not be loaded. Please refresh the page.", "danger");
        return;
    }

    // Initialize TinyMCE
    tinymce.init({
        selector: '#post-content',
        height: 500,
        menubar: false,
        statusbar: true,
        plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
        ],
        toolbar: 'undo redo | styles | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | ' +
            'bullist numlist outdent indent | link image media table | removeformat code fullscreen help',
        content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.6; }',
        branding: false,
        elementpath: false,
        setup: function(editor) {
            editor.on('init', function() {
                console.log("TinyMCE initialized successfully");
                setupTitleListener();
                setupSlugPreview(); // Add slug preview functionality
                setupFeaturedImage();
                setupTagsInput();
                setupStatusChange();
                setupPreviewButton();
                setupSaveDraftButton();
                updateWordCount();
            });

            editor.on('keyup', function() {
                updateWordCount();
            });
        },
        // Fix for the TinyMCE image upload handler
        images_upload_handler: async function (blobInfo, success, failure) {
            try {
                const file = blobInfo.blob();
                console.log("Uploading file:", file);

                const url = await PostManager.uploadImage(file);
                console.log("Uploaded image URL:", url);

                // Ensure URL is a string, log it for debugging
                if (typeof url !== 'string' || !url) {
                    throw new Error('Uploaded URL is invalid or empty');
                }

                success(url);
            } catch (err) {
                console.error("TinyMCE upload handler error:", err);
                failure(err.message || "Image upload failed");
            }
        }
    }).catch(error => {
        console.error("TinyMCE initialization error:", error);
        showNotification("Error initializing editor: " + error.message, "danger");
    });
}

// Dashboard stats
async function loadDashboardStats() {
    try {
        console.log("Loading dashboard statistics");

        // Get total posts
        const posts = await PostManager.getPosts({ pageSize: 1000 });
        const totalPostsElement = document.getElementById('total-posts');
        if (totalPostsElement) {
            totalPostsElement.textContent = posts ? posts.length : 0;
        }

        // Calculate total views
        const totalViews = posts ? posts.reduce((sum, post) => sum + (post.views || 0), 0) : 0;
        const totalViewsElement = document.getElementById('total-views');
        if (totalViewsElement) {
            totalViewsElement.textContent = totalViews;
        }

        // Get newsletter subscribers
        const subscribers = await NewsletterManager.getSubscribers();
        const totalSubscribersElement = document.getElementById('total-subscribers');
        if (totalSubscribersElement) {
            totalSubscribersElement.textContent = subscribers ? subscribers.length : 0;
        }

        // Get pending comments
        const pendingComments = await CommentManager.getPendingComments();
        const pendingCommentsElement = document.getElementById('pending-comments');
        if (pendingCommentsElement) {
            pendingCommentsElement.textContent = pendingComments ? pendingComments.length : 0;
        }

        // Load recent activity
        await loadRecentActivity();

        // Load posts table
        await loadPosts();

        // Load categories
        await loadCategories();

        console.log("Dashboard statistics loaded successfully");

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showNotification('Error loading dashboard stats: ' + error.message, 'danger');
    }
}

// Recent Activity
async function loadRecentActivity() {
    try {
        console.log("Loading recent activity");
        // Get activity from the ActivityManager
        const activities = await ActivityManager.getRecentActivity(10);
        const activityTable = document.getElementById('recent-activity');
        if (!activityTable) return;

        activityTable.innerHTML = '';

        if (activities.length === 0) {
            activityTable.innerHTML = '<tr><td colspan="3" class="text-center">No recent activity</td></tr>';
            return;
        }

        activities.forEach(activity => {
            let date;
            if (activity.timestamp && activity.timestamp.seconds) {
                date = new Date(activity.timestamp.seconds * 1000).toLocaleDateString();
            } else if (activity.timestamp instanceof Date) {
                date = activity.timestamp.toLocaleDateString();
            } else {
                date = 'Unknown';
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${date}</td>
                <td>${formatActivityAction(activity.action)}</td>
                <td>${activity.description}</td>
            `;
            activityTable.appendChild(row);
        });

        console.log("Recent activity loaded successfully");
    } catch (error) {
        console.error('Error loading recent activity:', error);
        // If there's an error, show a placeholder
        const activityTable = document.getElementById('recent-activity');
        if (activityTable) {
            activityTable.innerHTML = '<tr><td colspan="3" class="text-center">Failed to load activity</td></tr>';
        }
    }
}

// Format activity action for display
function formatActivityAction(action) {
    return action
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Posts management - UPDATED with slug support
async function loadPosts() {
    try {
        console.log("Loading posts table");
        const posts = await PostManager.getPosts({ pageSize: 100 });
        const tableBody = document.getElementById('posts-table-body');

        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (!posts || posts.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No posts found</td></tr>';
            return;
        }

        posts.forEach(post => {
            let date;
            if (post.publishDate && post.publishDate.seconds) {
                date = new Date(post.publishDate.seconds * 1000).toLocaleDateString();
            } else if (post.publishDate instanceof Date) {
                date = post.publishDate.toLocaleDateString();
            } else {
                date = 'Unknown';
            }

            // Generate the view URL - use slug if available, fallback to ID
            const viewUrl = post.slug ?
                `blog-single.html?slug=${post.slug}` :
                `blog-single.html?id=${post.id}`;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="content-preview">
                    <div>
                        <strong>${post.title}</strong>
                        ${post.slug ? `<br><small class="text-muted">/${post.slug}</small>` : ''}
                    </div>
                </td>
                <td>${post.category || 'Uncategorized'}</td>
                <td>${date}</td>
                <td>${post.views || 0}</td>
                <td><span class="badge bg-${getStatusColor(post.status)}">${post.status || 'published'}</span></td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-info view-post" data-url="${viewUrl}" title="View Post">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-primary edit-post" data-id="${post.id}" title="Edit Post">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-post" data-id="${post.id}" title="Delete Post">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;

            // Attach event listeners
            row.querySelector('.view-post').addEventListener('click', function() {
                const url = this.getAttribute('data-url');
                window.open(url, '_blank');
            });

            row.querySelector('.edit-post').addEventListener('click', function() {
                editPost(post.id);
            });

            row.querySelector('.delete-post').addEventListener('click', function() {
                deletePost(post.id);
            });

            tableBody.appendChild(row);
        });

        console.log("Posts table loaded successfully");
    } catch (error) {
        console.error('Error loading posts:', error);
        showNotification('Error loading posts: ' + error.message, 'danger');
    }
}

// New post form - UPDATED with slug support
function initializeNewPostForm() {
    const form = document.getElementById('new-post-form');

    if (form) {
        console.log("Initializing new post form");

        // Load categories for dropdown
        loadCategoriesDropdown();

        // Handle category change to load subcategories
        const categorySelect = document.getElementById('post-category');
        if (categorySelect) {
            categorySelect.addEventListener('change', function() {
                const categorySlug = this.value;
                loadSubcategoriesDropdown(categorySlug);
            });
        }

        // Handle form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("Post form submitted");

            try {
                const editor = tinymce.get('post-content');
                if (!editor) {
                    throw new Error('Editor not initialized');
                }

                // Get form data
                const postData = {
                    title: document.getElementById('post-title').value,
                    excerpt: document.getElementById('post-excerpt').value,
                    content: editor.getContent(),
                    category: document.getElementById('post-category').value,
                    subcategory: document.getElementById('post-subcategory').value,
                    author: document.getElementById('post-author').value,
                    tags: document.getElementById('post-tags').value.split(',').filter(tag => tag.trim() !== ''),
                    featured: document.getElementById('post-featured').checked,
                    sticky: document.getElementById('post-sticky').checked,
                    status: document.getElementById('post-status').value
                };

                // Validation
                if (!postData.title) {
                    throw new Error('Please enter a post title');
                }

                if (!postData.content) {
                    throw new Error('Please enter post content');
                }

                // Add schedule date if scheduled
                if (postData.status === 'scheduled') {
                    const scheduleDate = document.getElementById('schedule-date').value;
                    if (scheduleDate) {
                        postData.publishDate = new Date(scheduleDate);
                    } else {
                        throw new Error('Please set a schedule date');
                    }
                } else {
                    postData.publishDate = new Date();
                }

                // Get existing post ID for editing
                const postId = form.getAttribute('data-post-id');

                // Show loading state
                const submitButton = form.querySelector('button[type="submit"]');
                const originalButtonText = submitButton.innerHTML;
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Saving...';

                // Handle image upload
                const imageFile = document.getElementById('post-image')?.files[0];
                if (imageFile) {
                    postData.featuredImage = await PostManager.uploadImage(imageFile);
                } else if (!postId) {
                    // Use default image for new posts if no image provided
                    postData.featuredImage = 'images/posts/default.jpg';
                }

                // Set author image (you might want to customize this)
                postData.authorImg = 'images/other/author-sm.png';

                // Create or update post
                let message;
                let newPostId;
                if (postId) {
                    // Update existing post
                    await PostManager.updatePost(postId, postData);
                    newPostId = postId;
                    message = `Post ${formatStatus(postData.status)} successfully!`;
                } else {
                    // Create new post
                    newPostId = await PostManager.createPost(postData);
                    message = `Post ${formatStatus(postData.status)} successfully!`;
                }

                // Show success message with option to view post
                const successMessage = `${message} <a href="#" onclick="viewPostAfterSave('${newPostId}')" class="alert-link">View Post</a>`;
                showNotification(successMessage, 'success');

                // Reset form
                resetPostForm(form);

                // Update dashboard stats
                loadDashboardStats();

                // Redirect to posts list
                showSection('posts');

                // Reset button state
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;

            } catch (error) {
                console.error('Error saving post:', error);
                showNotification('Error saving post: ' + error.message, 'danger');

                // Reset button state
                const submitButton = form.querySelector('button[type="submit"]');
                submitButton.disabled = false;
                submitButton.innerHTML = 'Publish Post';
            }
        });
    }
}

// NEW: View post after save
async function viewPostAfterSave(postId) {
    try {
        // Get the post to find its slug
        const post = await PostManager.getPost(postId);
        const viewUrl = post.slug ?
            `blog-single.html?slug=${post.slug}` :
            `blog-single.html?id=${post.id}`;

        window.open(viewUrl, '_blank');
    } catch (error) {
        console.error('Error viewing post:', error);
        // Fallback to ID-based URL
        window.open(`blog-single.html?id=${postId}`, '_blank');
    }
}

// Setup slug preview functionality - NEW
function setupSlugPreview() {
    const titleInput = document.getElementById('post-title');
    const slugPreview = document.getElementById('post-slug-preview');

    if (titleInput && !slugPreview) {
        // Create slug preview element
        const slugContainer = document.createElement('div');
        slugContainer.className = 'slug-preview mt-2';
        slugContainer.innerHTML = `
            <small class="text-muted">
                URL: <span class="fw-bold">/blog-single.html?slug=<span id="post-slug-preview">your-post-title</span></span>
                <button type="button" class="btn btn-sm btn-outline-secondary ms-2" id="edit-slug-btn" style="padding: 0.1rem 0.3rem; font-size: 0.7rem;">Edit</button>
            </small>
            <div id="slug-edit-container" class="mt-2" style="display: none;">
                <div class="input-group input-group-sm">
                    <span class="input-group-text">/blog-single.html?slug=</span>
                    <input type="text" class="form-control" id="post-slug-edit" placeholder="your-post-title">
                    <button class="btn btn-outline-success" type="button" id="save-slug-btn">Save</button>
                    <button class="btn btn-outline-secondary" type="button" id="cancel-slug-btn">Cancel</button>
                </div>
            </div>
        `;

        titleInput.parentNode.insertBefore(slugContainer, titleInput.nextSibling);

        // Auto-update slug preview as user types title
        titleInput.addEventListener('input', function() {
            const slug = generateSlugPreview(this.value);
            document.getElementById('post-slug-preview').textContent = slug || 'your-post-title';
        });

        // Edit slug functionality
        document.getElementById('edit-slug-btn').addEventListener('click', function() {
            const currentSlug = document.getElementById('post-slug-preview').textContent;
            document.getElementById('post-slug-edit').value = currentSlug;
            document.getElementById('slug-edit-container').style.display = 'block';
            this.style.display = 'none';
        });

        // Save custom slug
        document.getElementById('save-slug-btn').addEventListener('click', function() {
            const newSlug = generateSlugPreview(document.getElementById('post-slug-edit').value);
            document.getElementById('post-slug-preview').textContent = newSlug;
            document.getElementById('slug-edit-container').style.display = 'none';
            document.getElementById('edit-slug-btn').style.display = 'inline-block';
        });

        // Cancel slug edit
        document.getElementById('cancel-slug-btn').addEventListener('click', function() {
            document.getElementById('slug-edit-container').style.display = 'none';
            document.getElementById('edit-slug-btn').style.display = 'inline-block';
        });
    }
}

// Generate slug preview (client-side only, for preview purposes)
function generateSlugPreview(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Format status message
function formatStatus(status) {
    switch(status) {
        case 'published': return 'published';
        case 'draft': return 'saved as draft';
        case 'scheduled': return 'scheduled';
        default: return 'saved';
    }
}

// Reset post form - UPDATED to handle slug preview
function resetPostForm(form) {
    // Reset standard form fields
    form.reset();

    // Remove any post ID for editing
    form.removeAttribute('data-post-id');

    // Reset TinyMCE content
    const editor = tinymce.get('post-content');
    if (editor) {
        editor.setContent('');
    }

    // Reset slug preview
    const slugPreview = document.getElementById('post-slug-preview');
    if (slugPreview) {
        slugPreview.textContent = 'your-post-title';
    }

    // Hide slug edit container
    const slugEditContainer = document.getElementById('slug-edit-container');
    if (slugEditContainer) {
        slugEditContainer.style.display = 'none';
    }

    // Show edit slug button
    const editSlugBtn = document.getElementById('edit-slug-btn');
    if (editSlugBtn) {
        editSlugBtn.style.display = 'inline-block';
    }

    // Reset image preview
    const imagePreview = document.getElementById('image-preview');
    const imagePlaceholder = document.getElementById('image-placeholder');
    if (imagePreview) {
        imagePreview.style.backgroundImage = 'none';
    }
    if (imagePlaceholder) {
        imagePlaceholder.style.display = 'flex';
    }
    const removeImageBtn = document.getElementById('remove-image');
    if (removeImageBtn) {
        removeImageBtn.remove();
    }

    // Reset tags
    const tagsContainer = document.getElementById('tags-container');
    const tagsInput = document.getElementById('tags-input');
    const tagsHiddenInput = document.getElementById('post-tags');

    if (tagsContainer && tagsInput && tagsHiddenInput) {
        const tagElements = Array.from(tagsContainer.querySelectorAll('.badge'));
        tagElements.forEach(tag => {
            if (!tag.contains(tagsInput)) {
                tag.remove();
            }
        });
        tagsHiddenInput.value = '';
    }

    // Reset header title
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) {
        headerTitle.textContent = 'Create New Post';
    }

    // Reset submit button
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.textContent = 'Publish Post';
    }
}

// Load categories for dropdown
async function loadCategoriesDropdown() {
    try {
        console.log("Loading categories dropdown");
        const categories = await CategoryManager.getCategories();
        const categorySelect = document.getElementById('post-category');

        if (!categorySelect) return;

        // Show loading state
        categorySelect.innerHTML = '<option value="">Loading categories...</option>';
        categorySelect.disabled = true;

        // Populate the dropdown
        setTimeout(() => {
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

            // Re-enable the dropdown
            categorySelect.disabled = false;

            console.log("Categories dropdown loaded successfully");
        }, 500);
    } catch (error) {
        console.error('Error loading categories:', error);

        // Add a default category in case of error
        const categorySelect = document.getElementById('post-category');
        if (categorySelect) {
            categorySelect.innerHTML = '<option value="">Select Category</option>';
            categorySelect.innerHTML += '<option value="uncategorized">Uncategorized</option>';
            categorySelect.disabled = false;
        }
    }
}

// Load subcategories based on selected category
async function loadSubcategoriesDropdown(categorySlug) {
    try {
        console.log("Loading subcategories for category:", categorySlug);
        const subcategorySelect = document.getElementById('post-subcategory');
        if (!subcategorySelect) return;

        // Show loading state
        subcategorySelect.innerHTML = '<option value="">Loading subcategories...</option>';
        subcategorySelect.disabled = true;

        // Get category details
        if (!categorySlug) {
            subcategorySelect.innerHTML = '<option value="">Select Subcategory</option>';
            subcategorySelect.disabled = true;
            return;
        }

        // Get all categories
        const categories = await CategoryManager.getCategories();
        const selectedCategory = categories.find(cat => cat.slug === categorySlug);

        // Reset dropdown
        subcategorySelect.innerHTML = '<option value="">Select Subcategory</option>';

        // Add subcategories if available
        if (selectedCategory && selectedCategory.subcategories && selectedCategory.subcategories.length > 0) {
            selectedCategory.subcategories.forEach(subcategory => {
                const option = document.createElement('option');
                option.value = subcategory.slug;
                option.textContent = subcategory.name;
                subcategorySelect.appendChild(option);
            });
            subcategorySelect.disabled = false;
        } else {
            subcategorySelect.disabled = true;
        }

        console.log("Subcategories loaded successfully");
    } catch (error) {
        console.error('Error loading subcategories:', error);

        // Reset dropdown on error
        const subcategorySelect = document.getElementById('post-subcategory');
        if (subcategorySelect) {
            subcategorySelect.innerHTML = '<option value="">Select Subcategory</option>';
            subcategorySelect.disabled = true;
        }
    }
}

// Initialize category form
function initializeCategoryForm() {
    const form = document.getElementById('category-form');

    if (form) {
        console.log("Initializing category form");

        // Clone and replace form to remove any existing event listeners
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);

        // Set up subcategory UI if not already done
        initializeSubcategoryUI();

        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("Category form submitted");

            try {
                const categoryData = {
                    name: document.getElementById('category-name').value,
                    slug: document.getElementById('category-slug').value || slugify(document.getElementById('category-name').value),
                    description: document.getElementById('category-description').value,
                    subcategories: getSubcategoriesFromUI()
                };

                // Validate required fields
                if (!categoryData.name) {
                    throw new Error('Please enter a category name');
                }

                // Show loading state
                const submitButton = newForm.querySelector('button[type="submit"]');
                const originalButtonText = submitButton.innerHTML;
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Saving...';

                // Check if we're editing an existing category or creating a new one
                const categoryId = newForm.getAttribute('data-category-id');
                let message;

                if (categoryId) {
                    // Update existing category
                    await CategoryManager.updateCategory(categoryId, categoryData);
                    message = 'Category updated successfully!';
                } else {
                    // Create new category
                    await CategoryManager.createCategory(categoryData);
                    message = 'Category created successfully!';
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

                // Show success message
                showNotification(message, 'success');

                // Reload categories
                loadCategories();

                // Reload categories dropdown
                loadCategoriesDropdown();

                // Reset form
                resetCategoryForm(newForm);

                // Reset button state
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;

            } catch (error) {
                console.error('Error saving category:', error);
                showNotification('Error saving category: ' + error.message, 'danger');

                // Reset button state
                const submitButton = newForm.querySelector('button[type="submit"]');
                submitButton.disabled = false;
                submitButton.innerHTML = 'Save';
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

        console.log("Category form initialized successfully");
    }
}

// Initialize subcategory UI
function initializeSubcategoryUI() {
    // Add subcategory section to the category modal if it doesn't exist
    const modalBody = document.querySelector('#categoryModal .modal-body');
    if (!modalBody || document.getElementById('subcategories-section')) return;

    console.log("Initializing subcategory UI");

    // Create and append subcategory section
    const subcategoriesSection = document.createElement('div');
    subcategoriesSection.id = 'subcategories-section';
    subcategoriesSection.innerHTML = `
        <h5 class="mt-4 mb-3">Subcategories</h5>
        <div id="subcategories-list" class="mb-3 d-flex flex-wrap gap-2">
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

    console.log("Subcategory UI initialized successfully");
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
    subcategoryElement.className = 'subcategory-item badge bg-light text-dark border d-flex align-items-center p-2';
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

// Reset category form
function resetCategoryForm(form) {
    // Reset standard form fields
    form.reset();

    // Remove any category ID for editing
    form.removeAttribute('data-category-id');

    // Clear subcategories
    const subcategoriesList = document.getElementById('subcategories-list');
    if (subcategoriesList) {
        subcategoriesList.innerHTML = '';
    }

    // Reset submit button text
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.textContent = 'Save';
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

// Load categories
async function loadCategories() {
    try {
        console.log("Loading categories list");
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

        console.log("Categories list loaded successfully");
    } catch (error) {
        console.error('Error loading categories:', error);
        showNotification('Error loading categories: ' + error.message, 'danger');
    }
}

// Initialize comment management
function initializeCommentManagement() {
    // Add event handlers for comments section
    loadComments();
}

// Load comments
async function loadComments() {
    try {
        console.log("Loading comments");
        const pendingComments = await CommentManager.getPendingComments();
        const commentsTableBody = document.getElementById('comments-table-body');

        if (!commentsTableBody) return;

        commentsTableBody.innerHTML = '';

        if (!pendingComments || pendingComments.length === 0) {
            commentsTableBody.innerHTML = '<tr><td colspan="6" class="text-center">No pending comments</td></tr>';
            return;
        }

        // Load comments into table
        pendingComments.forEach(comment => {
            const row = document.createElement('tr');

            let date;
            if (comment.createdAt && comment.createdAt.seconds) {
                date = new Date(comment.createdAt.seconds * 1000).toLocaleDateString();
            } else if (comment.createdAt instanceof Date) {
                date = comment.createdAt.toLocaleDateString();
            } else {
                date = 'Unknown';
            }

            row.innerHTML = `
                <td>${comment.authorName}</td>
                <td>${comment.postId}</td>
                <td class="content-preview">${comment.content}</td>
                <td>${date}</td>
                <td><span class="badge bg-warning">Pending</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-success approve-comment" data-id="${comment.id}">
                        <i class="fas fa-check me-1"></i> Approve
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-comment" data-id="${comment.id}">
                        <i class="fas fa-trash me-1"></i> Delete
                    </button>
                </td>
            `;

            // Add event listeners
            row.querySelector('.approve-comment').addEventListener('click', function() {
                approveComment(comment.id);
            });

            row.querySelector('.delete-comment').addEventListener('click', function() {
                deleteComment(comment.id);
            });

            commentsTableBody.appendChild(row);
        });

        console.log("Comments loaded successfully");
    } catch (error) {
        console.error('Error loading comments:', error);

        // Show error in table
        const commentsTableBody = document.getElementById('comments-table-body');
        if (commentsTableBody) {
            commentsTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Error loading comments</td></tr>';
        }
    }
}

// Approve comment
async function approveComment(commentId) {
    try {
        console.log("Approving comment:", commentId);
        await CommentManager.approveComment(commentId);
        showNotification('Comment approved successfully', 'success');
        loadComments();
    } catch (error) {
        console.error('Error approving comment:', error);
        showNotification('Error approving comment: ' + error.message, 'danger');
    }
}

// Delete comment
async function deleteComment(commentId) {
    if (confirm('Are you sure you want to delete this comment?')) {
        try {
            console.log("Deleting comment:", commentId);
            await CommentManager.deleteComment(commentId);
            showNotification('Comment deleted successfully', 'success');
            loadComments();
        } catch (error) {
            console.error('Error deleting comment:', error);
            showNotification('Error deleting comment: ' + error.message, 'danger');
        }
    }
}

// Initialize newsletter management
function initializeNewsletterManagement() {
    // Add event handlers for newsletter section
    loadSubscribers();
}

// Load subscribers
async function loadSubscribers() {
    try {
        console.log("Loading subscribers");
        const subscribers = await NewsletterManager.getSubscribers(false);
        const subscribersTableBody = document.getElementById('newsletter-table-body');

        if (!subscribersTableBody) return;

        subscribersTableBody.innerHTML = '';

        if (!subscribers || subscribers.length === 0) {
            subscribersTableBody.innerHTML = '<tr><td colspan="4" class="text-center">No subscribers found</td></tr>';
            return;
        }

        // Load subscribers into table
        subscribers.forEach(subscriber => {
            const row = document.createElement('tr');

            let date;
            if (subscriber.subscribedAt && subscriber.subscribedAt.seconds) {
                date = new Date(subscriber.subscribedAt.seconds * 1000).toLocaleDateString();
            } else if (subscriber.subscribedAt instanceof Date) {
                date = subscriber.subscribedAt.toLocaleDateString();
            } else {
                date = 'Unknown';
            }

            row.innerHTML = `
                <td>${subscriber.email}</td>
                <td>${date}</td>
                <td><span class="badge bg-${subscriber.status === 'active' ? 'success' : 'secondary'}">${subscriber.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-danger delete-subscriber" data-id="${subscriber.id}" data-email="${subscriber.email}">
                        <i class="fas fa-trash me-1"></i> Delete
                    </button>
                </td>
            `;

            // Add event listeners
            row.querySelector('.delete-subscriber').addEventListener('click', function() {
                const email = this.getAttribute('data-email');
                unsubscribeEmail(email);
            });

            subscribersTableBody.appendChild(row);
        });

        console.log("Subscribers loaded successfully");
    } catch (error) {
        console.error('Error loading subscribers:', error);

        // Show error in table
        const subscribersTableBody = document.getElementById('newsletter-table-body');
        if (subscribersTableBody) {
            subscribersTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Error loading subscribers</td></tr>';
        }
    }
}

// Unsubscribe email
async function unsubscribeEmail(email) {
    if (confirm(`Are you sure you want to unsubscribe ${email}?`)) {
        try {
            console.log("Unsubscribing email:", email);
            await NewsletterManager.unsubscribe(email);
            showNotification('Email unsubscribed successfully', 'success');
            loadSubscribers();
        } catch (error) {
            console.error('Error unsubscribing email:', error);
            showNotification('Error unsubscribing email: ' + error.message, 'danger');
        }
    }
}

// Setup title listener - UPDATED with slug preview
function setupTitleListener() {
    const titleInput = document.getElementById('post-title');
    const headerTitle = document.getElementById('header-title');

    if (titleInput && headerTitle) {
        titleInput.addEventListener('input', function() {
            if (this.value.trim()) {
                headerTitle.textContent = this.value;
            } else {
                headerTitle.textContent = 'Create New Post';
            }
        });
    }
}

// Setup featured image
function setupFeaturedImage() {
    const imageInput = document.getElementById('post-image');
    const imagePreview = document.getElementById('image-preview');
    const imagePlaceholder = document.getElementById('image-placeholder');

    if (!imageInput || !imagePreview || !imagePlaceholder) return;

    imageInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.style.backgroundImage = `url(${e.target.result})`;
                imagePlaceholder.style.display = 'none';

                // Add remove button if it doesn't exist
                if (!document.getElementById('remove-image')) {
                    const removeBtn = document.createElement('button');
                    removeBtn.id = 'remove-image';
                    removeBtn.className = 'btn btn-sm btn-danger position-absolute top-0 end-0 m-2';
                    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                    removeBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        removeImage();
                    });
                    imagePreview.appendChild(removeBtn);
                }
            }
            reader.readAsDataURL(file);
        }
    });
}

// Remove featured image
function removeImage() {
    const imagePreview = document.getElementById('image-preview');
    const imagePlaceholder = document.getElementById('image-placeholder');
    const imageInput = document.getElementById('post-image');

    if (imagePreview) imagePreview.style.backgroundImage = 'none';
    if (imagePlaceholder) imagePlaceholder.style.display = 'flex';
    if (imageInput) imageInput.value = '';

    const removeBtn = document.getElementById('remove-image');
    if (removeBtn) removeBtn.remove();
}

// Tags input
function setupTagsInput() {
    const tagsInput = document.getElementById('tags-input');
    const tagsContainer = document.getElementById('tags-container');
    const tagsHiddenInput = document.getElementById('post-tags');

    if (!tagsInput || !tagsContainer || !tagsHiddenInput) return;

    let tags = [];

    tagsInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag();
        }
    });

    function addTag() {
        const text = tagsInput.value.trim();
        if (text && !tags.includes(text)) {
            const tag = document.createElement('div');
            tag.className = 'badge bg-light text-dark border d-flex align-items-center';
            tag.innerHTML = `
                ${text}
                <i class="fas fa-times ms-1" style="cursor: pointer;"></i>
            `;

            tag.querySelector('i').addEventListener('click', function() {
                tags = tags.filter(t => t !== text);
                tag.remove();
                updateTagsHiddenInput();
            });

            tagsContainer.insertBefore(tag, tagsInput);
            tags.push(text);
            tagsInput.value = '';
            updateTagsHiddenInput();
        }
    }

    function updateTagsHiddenInput() {
        tagsHiddenInput.value = tags.join(',');
    }
}

// Status change
function setupStatusChange() {
    const postStatus = document.getElementById('post-status');
    const statusBadge = document.getElementById('post-status-badge');
    const scheduledSection = document.getElementById('scheduled-section');

    if (!postStatus || !statusBadge || !scheduledSection) return;

    postStatus.addEventListener('change', function() {
        statusBadge.className = 'badge ms-2';

        switch (this.value) {
            case 'draft':
                statusBadge.classList.add('bg-secondary');
                statusBadge.textContent = 'Draft';
                scheduledSection.style.display = 'none';
                break;
            case 'published':
                statusBadge.classList.add('bg-success');
                statusBadge.textContent = 'Published';
                scheduledSection.style.display = 'none';
                break;
            case 'scheduled':
                statusBadge.classList.add('bg-info');
                statusBadge.textContent = 'Scheduled';
                scheduledSection.style.display = 'block';
                break;
        }
    });
}

// Preview button - UPDATED with slug support
function setupPreviewButton() {
    const previewBtn = document.getElementById('preview-btn');
    if (!previewBtn) return;

    previewBtn.addEventListener('click', function() {
        const title = document.getElementById('post-title').value || 'Untitled Post';
        const editor = tinymce.get('post-content');
        if (!editor) {
            showNotification("Editor not initialized. Please reload the page.", "danger");
            return;
        }

        const content = editor.getContent();

        // Get the current slug preview for a more accurate preview URL
        const currentSlug = document.getElementById('post-slug-preview')?.textContent || generateSlugPreview(title);

        // Open preview in new window or tab
        const previewWindow = window.open('', '_blank');

        previewWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Preview: ${title}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                        line-height: 1.6;
                        padding: 2rem; 
                        max-width: 800px; 
                        margin: 0 auto; 
                    }
                    img { max-width: 100%; height: auto; }
                    .preview-notice {
                        background: #e3f2fd;
                        border: 1px solid #2196f3;
                        border-radius: 4px;
                        padding: 1rem;
                        margin-bottom: 2rem;
                    }
                </style>
            </head>
            <body>
                <div class="preview-notice">
                    <strong>📝 Preview Mode</strong><br>
                    <small>URL will be: <code>blog-single.html?slug=${currentSlug}</code></small>
                </div>
                <h1>${title}</h1>
                <hr>
                <div class="content">
                    ${content}
                </div>
            </body>
            </html>
        `);
        previewWindow.document.close();
    });
}

// Save draft button
function setupSaveDraftButton() {
    const saveDraftBtn = document.getElementById('save-draft-btn');
    if (!saveDraftBtn) return;

    saveDraftBtn.addEventListener('click', function() {
        // Set status to draft
        const statusSelect = document.getElementById('post-status');
        if (statusSelect) {
            statusSelect.value = 'draft';
            // Trigger change event
            const event = new Event('change');
            statusSelect.dispatchEvent(event);
        }

        // Submit the form
        const form = document.getElementById('new-post-form');
        if (form) {
            form.dispatchEvent(new Event('submit'));
        }
    });
}

// Word count
function updateWordCount() {
    setTimeout(() => {
        const editor = tinymce.get('post-content');
        if (!editor) return;

        const content = editor.getContent({ format: 'text' });
        const words = content.trim().split(/\s+/).filter(word => word !== '').length;
        const readTime = Math.ceil(words / 200); // Average reading speed: 200 words per minute

        const wordCountEl = document.getElementById('word-count-display');
        if (wordCountEl) {
            wordCountEl.textContent = `${words} words · ${readTime} min read`;
        }
    }, 100);
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

// Helper functions
function getStatusColor(status) {
    switch(status) {
        case 'published': return 'success';
        case 'draft': return 'secondary';
        case 'scheduled': return 'info';
        case 'archived': return 'warning';
        default: return 'secondary';
    }
}

// Post actions - UPDATED with slug support
async function editPost(postId) {
    try {
        console.log("Editing post:", postId);
        // Navigate to the New Post section
        showSection('new-post');

        // Show loading notification
        showNotification('Loading post data...', 'info');

        // Initialize the editor if needed
        if (!tinymce.get('post-content')) {
            await initializeEditor();
            // Wait for editor to initialize
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Get post data
        const post = await PostManager.getPost(postId);

        // Set form values
        document.getElementById('post-title').value = post.title || '';
        document.getElementById('post-excerpt').value = post.excerpt || '';

        // Update slug preview
        const slugPreview = document.getElementById('post-slug-preview');
        if (slugPreview && post.slug) {
            slugPreview.textContent = post.slug;
        }

        // Ensure categories are loaded before setting
        await loadCategoriesDropdown();
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Set category and load subcategories
        const categorySelect = document.getElementById('post-category');
        if (categorySelect) {
            categorySelect.value = post.category || '';

            // Trigger change event to load subcategories
            categorySelect.dispatchEvent(new Event('change'));

            // Wait for subcategories to load
            await new Promise(resolve => setTimeout(resolve, 500));

            // Set subcategory
            const subcategorySelect = document.getElementById('post-subcategory');
            if (subcategorySelect) {
                subcategorySelect.value = post.subcategory || '';
            }
        }

        // Set author
        const authorInput = document.getElementById('post-author');
        if (authorInput) {
            authorInput.value = post.author || 'Katen Doe';
        }

        // Set featured flag
        const featuredCheckbox = document.getElementById('post-featured');
        if (featuredCheckbox) {
            featuredCheckbox.checked = post.featured || false;
        }

        // Set sticky flag
        const stickyCheckbox = document.getElementById('post-sticky');
        if (stickyCheckbox) {
            stickyCheckbox.checked = post.sticky || false;
        }

        // Set status
        const statusSelect = document.getElementById('post-status');
        if (statusSelect) {
            statusSelect.value = post.status || 'draft';

            // Trigger change event
            statusSelect.dispatchEvent(new Event('change'));
        }

        // Set featured image if exists
        if (post.featuredImage && post.featuredImage !== 'images/posts/default.jpg') {
            const imagePreview = document.getElementById('image-preview');
            const imagePlaceholder = document.getElementById('image-placeholder');

            if (imagePreview && imagePlaceholder) {
                imagePreview.style.backgroundImage = `url(${post.featuredImage})`;
                imagePlaceholder.style.display = 'none';

                // Add remove button
                if (!document.getElementById('remove-image')) {
                    const removeBtn = document.createElement('button');
                    removeBtn.id = 'remove-image';
                    removeBtn.className = 'btn btn-sm btn-danger position-absolute top-0 end-0 m-2';
                    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                    removeBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        removeImage();
                    });
                    imagePreview.appendChild(removeBtn);
                }
            }
        }

        // Set tags
        if (post.tags && post.tags.length > 0) {
            // Clear existing tags
            const tagsContainer = document.getElementById('tags-container');
            const tagsInput = document.getElementById('tags-input');
            const tagsHiddenInput = document.getElementById('post-tags');

            if (tagsContainer && tagsInput && tagsHiddenInput) {
                // Remove existing tags
                const tagElements = Array.from(tagsContainer.querySelectorAll('.badge'));
                tagElements.forEach(tag => {
                    if (!tag.contains(tagsInput)) {
                        tag.remove();
                    }
                });

                // Add new tags
                post.tags.forEach(tagText => {
                    const tag = document.createElement('div');
                    tag.className = 'badge bg-light text-dark border d-flex align-items-center';
                    tag.innerHTML = `
                        ${tagText}
                        <i class="fas fa-times ms-1" style="cursor: pointer;"></i>
                    `;

                    tag.querySelector('i').addEventListener('click', function() {
                        tag.remove();
                        updateHiddenTagsInput();
                    });

                    tagsContainer.insertBefore(tag, tagsInput);
                });

                // Update hidden input
                tagsHiddenInput.value = post.tags.join(',');
            }
        }

        // Set editor content
        const editor = tinymce.get('post-content');
        if (editor) {
            editor.setContent(post.content || '');

            // Update word count
            updateWordCount();
        }

        // Set post ID for form submission
        const form = document.getElementById('new-post-form');
        if (form) {
            form.setAttribute('data-post-id', postId);
        }

        // Update header title
        const headerTitle = document.getElementById('header-title');
        if (headerTitle) {
            headerTitle.textContent = `Edit: ${post.title}`;
        }

        // Update submit button
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.textContent = 'Update Post';
        }

        console.log("Post loaded for editing");
        showNotification('Post loaded for editing', 'success');
    } catch (error) {
        console.error('Error loading post for editing:', error);
        showNotification('Error loading post: ' + error.message, 'danger');
    }
}

// Update hidden tags input
function updateHiddenTagsInput() {
    const tagsContainer = document.getElementById('tags-container');
    const tagsHiddenInput = document.getElementById('post-tags');
    const tagsInput = document.getElementById('tags-input');

    if (!tagsContainer || !tagsHiddenInput) return;

    const tags = [];
    const tagElements = Array.from(tagsContainer.querySelectorAll('.badge'));

    tagElements.forEach(tag => {
        if (!tag.contains(tagsInput)) {
            // Get tag text (first child node text content)
            const tagText = tag.childNodes[0].textContent.trim();
            tags.push(tagText);
        }
    });

    tagsHiddenInput.value = tags.join(',');
}

// Delete a post
async function deletePost(postId) {
    if (confirm('Are you sure you want to delete this post?')) {
        try {
            console.log("Deleting post:", postId);
            await PostManager.deletePost(postId);
            showNotification('Post deleted successfully', 'success');

            // Reload posts table
            loadPosts();
        } catch (error) {
            console.error('Error deleting post:', error);
            showNotification('Error deleting post: ' + error.message, 'danger');
        }
    }
}

// Category actions
async function editCategory(categoryId) {
    try {
        console.log("Editing category:", categoryId);
        // Show the category modal
        const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
        modal.show();

        // Show loading notification
        showNotification('Loading category data...', 'info');

        // Get category data
        const category = await CategoryManager.getCategory(categoryId);

        // Set form values
        document.getElementById('category-name').value = category.name || '';
        document.getElementById('category-slug').value = category.slug || '';
        document.getElementById('category-description').value = category.description || '';

        // Clear existing subcategories
        const subcategoriesList = document.getElementById('subcategories-list');
        if (subcategoriesList) {
            subcategoriesList.innerHTML = '';
        }

        // Add subcategories if any
        if (category.subcategories && category.subcategories.length > 0) {
            category.subcategories.forEach(sub => {
                const subcategoryElement = document.createElement('div');
                subcategoryElement.className = 'subcategory-item badge bg-light text-dark border d-flex align-items-center p-2';
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

        // Set category ID for form submission
        const form = document.getElementById('category-form');
        if (form) {
            form.setAttribute('data-category-id', categoryId);
        }

        // Update submit button
        const submitButton = document.querySelector('#categoryModal .modal-footer button[type="submit"]');
        if (submitButton) {
            submitButton.textContent = 'Update Category';
        }

        console.log("Category loaded for editing");
        showNotification('Category loaded for editing', 'success');
    } catch (error) {
        console.error('Error loading category for editing:', error);
        showNotification('Error loading category: ' + error.message, 'danger');
    }
}

// Delete a category
async function deleteCategory(categoryId) {
    if (confirm('Are you sure you want to delete this category? Posts in this category will not be deleted but will become uncategorized.')) {
        try {
            console.log("Deleting category:", categoryId);
            await CategoryManager.deleteCategory(categoryId);
            showNotification('Category deleted successfully', 'success');

            // Reload categories
            await loadCategories();

            // Reload categories dropdown
            await loadCategoriesDropdown();
        } catch (error) {
            console.error('Error deleting category:', error);
            showNotification('Error deleting category: ' + error.message, 'danger');
        }
    }
}

// Export functions for global access
window.editPost = editPost;
window.deletePost = deletePost;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.showNotification = showNotification;
window.initializeEditor = initializeEditor;
window.loadCategoriesDropdown = loadCategoriesDropdown;
window.loadPosts = loadPosts;
window.loadCategories = loadCategories;
window.loadComments = loadComments;
window.loadSubscribers = loadSubscribers;
window.loadDashboardStats = loadDashboardStats;
window.viewPostAfterSave = viewPostAfterSave;