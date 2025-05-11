// This script ensures the modern editor initializes correctly
// Add this to your HTML just before the closing </body> tag

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, checking for editor initialization");

    // Check if we should initialize the editor (on the New Post page)
    const newPostSection = document.getElementById('new-post');
    if (newPostSection && !newPostSection.classList.contains('d-none')) {
        console.log("New Post section is visible, initializing editor");
        initModernEditor();
    }

    // Add a global function to initialize the editor that can be called from navigation
    window.initializeEditor = function() {
        console.log("Manual editor initialization requested");
        initModernEditor();
    };

    // Enhance showSection function to initialize editor when needed
    const originalShowSection = window.showSection;
    if (typeof originalShowSection === 'function') {
        window.showSection = function(sectionId) {
            console.log("Navigating to section:", sectionId);

            // Call the original showSection function
            originalShowSection(sectionId);

            // If navigating to new-post, initialize the editor
            if (sectionId === 'new-post') {
                console.log("New Post section activated, initializing editor");
                setTimeout(function() {
                    initModernEditor();
                }, 100); // Small delay to ensure the section is visible
            }
        };
    }

    // The actual editor initialization function
    function initModernEditor() {
        console.log("Attempting to initialize TinyMCE editor");

        // Check if TinyMCE is already initialized
        if (typeof tinymce !== 'undefined' && tinymce.get('post-content')) {
            console.log("Editor already initialized");
            return;
        }

        // Check if TinyMCE library is available
        if (typeof tinymce === 'undefined') {
            console.error("TinyMCE library not loaded!");
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
            init_instance_callback: function(editor) {
                console.log("TinyMCE instance initialized");
            },
            images_upload_handler: function (blobInfo, success, failure) {
                const file = blobInfo.blob();

                // Check if the Firebase integration is available
                if (typeof PostManager === 'undefined' || typeof PostManager.uploadImage !== 'function') {
                    console.error("PostManager not available for image upload");

                    // Fallback to direct success with a placeholder
                    success('https://via.placeholder.com/640x480.png?text=Image+Upload+Placeholder');
                    return;
                }

                // Use the PostManager to upload the image
                PostManager.uploadImage(file)
                    .then(url => success(url))
                    .catch(err => {
                        console.error("Image upload failed:", err);
                        failure('Image upload failed: ' + err.message);
                    });
            }
        }).then(function() {
            console.log("TinyMCE initialization promise resolved");
        }).catch(function(err) {
            console.error("TinyMCE initialization failed:", err);
        });
    }

    // Setup title listener
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

    // Handle featured image
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

    // Handle tags input
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

    // Handle status change
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

    // Set up preview button
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
                    </style>
                </head>
                <body>
                    <div class="mb-3 text-muted">Preview Mode</div>
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

    // Set up save draft button
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

    // Word count calculation
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
});