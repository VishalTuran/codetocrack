// single-post.js
import { PostManager, CommentManager } from './firebase-integration.js';
import { loadPopularPosts } from './renderPosts.js';
import { CategoryManager } from './firebase-integration.js';

// Get post ID from URL
function getPostIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Load and render post content
async function loadPost() {
    const postId = getPostIdFromUrl();

    if (!postId) {
        window.location.href = 'index.html';
        return;
    }

    try {
        showLoader();
        const post = await PostManager.getPost(postId);

        // Update page title
        document.title = `${post.title} - Code to Crack`;

        // Update meta description
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.content = post.excerpt;
        }

        // Render post header
        renderPostHeader(post);

        // Render post content
        renderPostContent(post);

        // Load comments
        loadComments(postId);

        // Update breadcrumb
        updateBreadcrumb(post);

        // Load sidebar content
        loadSidebarContent();

        // Initialize comment form
        initializeCommentForm(postId);

        hideLoader();
    } catch (error) {
        console.error('Error loading post:', error);
        showError('Failed to load post content.');
    }
}

// Render post header
function renderPostHeader(post) {
    const headerElement = document.querySelector('.post-header');
    const postDate = new Date(post.publishDate.seconds * 1000 || post.publishDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    if (headerElement) {
        const titleElement = headerElement.querySelector('.title');
        const metaElement = headerElement.querySelector('.meta');
        const authorImage = headerElement.querySelector('.author');
        const authorName = headerElement.querySelector('.author-name');
        const categoryElement = headerElement.querySelector('.category');
        const dateElement = headerElement.querySelector('.date');

        if (titleElement) titleElement.textContent = post.title;
        if (authorImage) authorImage.src = post.authorImg || 'images/other/author-sm.png';
        if (authorName) authorName.textContent = post.author;
        if (categoryElement) {
            categoryElement.textContent = post.category;
            categoryElement.href = `category.html?category=${post.category}`;
        }
        if (dateElement) dateElement.textContent = postDate;
    }

    // Update author section
    const authorNameElement = document.getElementById('author-name');
    if (authorNameElement) {
        authorNameElement.textContent = post.author;
    }

    // Render featured image
    const featuredImageElement = document.querySelector('.featured-image img');
    if (featuredImageElement && post.featuredImage) {
        featuredImageElement.src = post.featuredImage;
        featuredImageElement.alt = post.title;
    }
}

// Render post content
function renderPostContent(post) {
    const contentElement = document.querySelector('.post-content');

    if (contentElement && post.content) {
        contentElement.innerHTML = post.content;
    }

    // Render tags
    renderTags(post.tags);
}

// Render tags
function renderTags(tags) {
    const tagsContainer = document.querySelector('.tags');

    if (tagsContainer && tags && tags.length > 0) {
        tagsContainer.innerHTML = tags.map(tag =>
            `<a href="search.html?q=${tag}" class="tag">#${tag}</a>`
        ).join(' ');
    }
}

// Update breadcrumb
function updateBreadcrumb(post) {
    const categoryLink = document.getElementById('category-breadcrumb');
    const postTitle = document.getElementById('post-title-breadcrumb');

    if (categoryLink && post.category) {
        categoryLink.textContent = post.category;
        categoryLink.href = `category.html?category=${post.category}`;
    }

    if (postTitle && post.title) {
        postTitle.textContent = post.title;
    }
}

// Load and render comments
async function loadComments(postId) {
    try {
        const comments = await CommentManager.getCommentsByPost(postId);

        const commentsContainer = document.querySelector('.comments ul');
        const commentCount = document.querySelector('.section-title > span');

        if (commentCount) {
            commentCount.textContent = comments.length;
        }

        if (commentsContainer) {
            commentsContainer.innerHTML = '';

            if (comments.length === 0) {
                commentsContainer.innerHTML = `
                    <li class="comment rounded">
                        <div class="details">
                            <p>No comments yet. Be the first to leave a comment!</p>
                        </div>
                    </li>
                `;
                return;
            }

            comments.forEach(comment => {
                const commentDate = new Date(comment.createdAt.seconds * 1000 || comment.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });

                const commentHtml = `
                    <li class="comment rounded">
                        <div class="thumb">
                            <img src="images/other/comment-${Math.floor(Math.random() * 3) + 1}.png" alt="${comment.authorName}" />
                        </div>
                        <div class="details">
                            <h4 class="name"><a href="#">${comment.authorName}</a></h4>
                            <span class="date">${commentDate}</span>
                            <p>${comment.content}</p>
                            <a href="#comment-form" class="btn btn-default btn-sm reply-btn" data-parent="${comment.id}">Reply</a>
                        </div>
                    </li>
                `;

                commentsContainer.innerHTML += commentHtml;
            });

            // Add reply functionality
            addReplyFunctionality();
        }
    } catch (error) {
        console.error('Error loading comments:', error);
    }
}

// Add reply functionality
function addReplyFunctionality() {
    const replyButtons = document.querySelectorAll('.reply-btn');

    replyButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();

            const parentId = button.dataset.parent;
            const commentForm = document.getElementById('comment-form');

            // Scroll to comment form
            commentForm.scrollIntoView({ behavior: 'smooth' });

            // Focus on comment textarea
            setTimeout(() => {
                document.getElementById('InputComment').focus();

                // Add hidden input for parent comment ID
                let parentInput = document.getElementById('parentCommentId');
                if (!parentInput) {
                    parentInput = document.createElement('input');
                    parentInput.type = 'hidden';
                    parentInput.id = 'parentCommentId';
                    parentInput.name = 'parentCommentId';
                    commentForm.appendChild(parentInput);
                }

                parentInput.value = parentId;

                // Update form title to show replying
                const commentTitle = document.querySelector('.section-header .section-title');
                if (commentTitle) {
                    commentTitle.textContent = 'Reply to comment';
                }

                // Add cancel button if not already present
                let cancelButton = document.getElementById('cancel-reply');
                if (!cancelButton) {
                    cancelButton = document.createElement('button');
                    cancelButton.id = 'cancel-reply';
                    cancelButton.className = 'btn btn-outline-secondary btn-sm ms-2';
                    cancelButton.textContent = 'Cancel Reply';

                    const submitButton = document.getElementById('submit');
                    submitButton.parentNode.insertBefore(cancelButton, submitButton.nextSibling);

                    cancelButton.addEventListener('click', (e) => {
                        e.preventDefault();

                        // Remove parent ID
                        parentInput.value = '';

                        // Update form title back
                        commentTitle.textContent = 'Leave Comment';

                        // Remove cancel button
                        cancelButton.remove();
                    });
                }
            }, 500);
        });
    });
}

// Initialize comment form
function initializeCommentForm(postId) {
    const commentForm = document.getElementById('comment-form');

    if (commentForm) {
        commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            try {
                const commentData = {
                    postId: postId,
                    authorName: document.getElementById('InputName').value,
                    authorEmail: document.getElementById('InputEmail').value,
                    authorWebsite: document.getElementById('InputWeb').value,
                    content: document.getElementById('InputComment').value,
                    parentCommentId: document.getElementById('parentCommentId')?.value || null
                };

                // Validate required fields
                if (!commentData.authorName || !commentData.authorEmail || !commentData.content) {
                    showNotification('Please fill in all required fields', 'danger');
                    return;
                }

                await CommentManager.addComment(commentData);

                // Show success message
                showNotification('Comment submitted successfully! It will be displayed after approval.', 'success');

                // Clear form
                commentForm.reset();

                // Remove parent ID if any
                const parentInput = document.getElementById('parentCommentId');
                if (parentInput) {
                    parentInput.value = '';
                }

                // Remove cancel button if any
                const cancelButton = document.getElementById('cancel-reply');
                if (cancelButton) {
                    cancelButton.remove();
                }

                // Update form title back if it was changed
                const commentTitle = document.querySelector('.section-header .section-title');
                if (commentTitle && commentTitle.textContent !== 'Leave Comment') {
                    commentTitle.textContent = 'Leave Comment';
                }

            } catch (error) {
                console.error('Error submitting comment:', error);
                showNotification('Failed to submit comment. Please try again.', 'danger');
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

        // Initialize newsletter form
        initializeNewsletterForm();

    } catch (error) {
        console.error('Error loading sidebar content:', error);
    }
}

// Initialize newsletter form
function initializeNewsletterForm() {
    const newsletterForm = document.querySelector('.newsletter form');

    if (newsletterForm) {
        newsletterForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const emailInput = newsletterForm.querySelector('input[type="email"]');
            const email = emailInput.value;

            if (validateEmail(email)) {
                try {
                    // Implement subscription logic here

                    // Show success message
                    showNotification('Successfully subscribed to newsletter!', 'success');

                    // Clear form
                    emailInput.value = '';

                } catch (error) {
                    console.error('Error subscribing to newsletter:', error);
                    showNotification('Failed to subscribe. Please try again.', 'danger');
                }
            } else {
                showNotification('Please enter a valid email address.', 'danger');
            }
        });
    }
}

// Validate email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Utility functions
function showLoader() {
    const loader = document.createElement('div');
    loader.id = 'post-loader';
    loader.className = 'text-center my-5';
    loader.innerHTML = `
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    `;

    const postContent = document.querySelector('.post-content');
    if (postContent) {
        postContent.innerHTML = '';
        postContent.appendChild(loader);
    }
}

function hideLoader() {
    const loader = document.getElementById('post-loader');
    if (loader) {
        loader.remove();
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger my-4';
    errorDiv.textContent = message;

    const postContent = document.querySelector('.post-content');
    if (postContent) {
        postContent.innerHTML = '';
        postContent.appendChild(errorDiv);
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show`;
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    const messagesDiv = document.querySelector('.messages');
    if (messagesDiv) {
        messagesDiv.innerHTML = '';
        messagesDiv.appendChild(notification);

        // Remove notification after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', loadPost);

// Export functions
export {
    loadPost,
    getPostIdFromUrl
};