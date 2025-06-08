import { PostManager, CommentManager } from './firebase-integration.js';
import { loadSidebarContent } from './sidebar.js';

function getPostIdentifierFromUrl() {
    const pathSlug = window.location.pathname.split("/").pop();
    const urlParams = new URLSearchParams(window.location.search);

    return {
        slug: pathSlug || urlParams.get('slug'),
        id: urlParams.get('id') // fallback
    };
}

// Get post ID from URL
function getPostIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

function updateSEOMetaTags(post) {
    try {
        // Update page title
        document.title = `${post.title} - Code to Crack`;

        // Update meta description
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.content = post.excerpt;
        }

        // Update canonical URL
        let canonicalLink = document.querySelector('link[rel="canonical"]');
        if (!canonicalLink) {
            canonicalLink = document.createElement('link');
            canonicalLink.rel = 'canonical';
            document.head.appendChild(canonicalLink);
        }
        canonicalLink.href = `https://codetocrack.com/blog-single.html?id=${post.id}`;

        // Update Open Graph meta tags
        updateMetaTag('og:title', post.title);
        updateMetaTag('og:description', post.excerpt);
        updateMetaTag('og:url', `https://codetocrack.com/blog-single.html?id=${post.id}`);
        if (post.featuredImage) {
            updateMetaTag('og:image', post.featuredImage);
        }

        // Update Twitter Card meta tags
        updateMetaTag('twitter:title', post.title);
        updateMetaTag('twitter:description', post.excerpt);
        updateMetaTag('twitter:url', `https://codetocrack.com/blog-single.html?id=${post.id}`);
        if (post.featuredImage) {
            updateMetaTag('twitter:image', post.featuredImage);
        }

        // Update Schema.org structured data
        updateStructuredData(post);

    } catch (error) {
        console.error('Error updating SEO meta tags:', error);
    }
}

// Helper function to update meta tags
function updateMetaTag(property, content) {
    let metaTag = document.querySelector(`meta[property="${property}"]`);
    if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute('property', property);
        document.head.appendChild(metaTag);
    }
    metaTag.setAttribute('content', content);
}

// Update structured data JSON-LD
function updateStructuredData(post) {
    const structuredDataScript = document.getElementById('post-structured-data');
    if (!structuredDataScript) return;

    // Parse existing JSON
    let structuredData = {};
    try {
        structuredData = JSON.parse(structuredDataScript.textContent);
    } catch (e) {
        console.error('Error parsing structured data:', e);
        return;
    }

    // Update with post data
    structuredData.headline = post.title;
    structuredData.description = post.excerpt;
    if (post.featuredImage) {
        structuredData.image = post.featuredImage;
    }
    if (post.author) {
        structuredData.author.name = post.author;
    }

    // Update dates
    if (post.publishDate) {
        let publishDate;
        if (post.publishDate.seconds) {
            publishDate = new Date(post.publishDate.seconds * 1000);
        } else {
            publishDate = new Date(post.publishDate);
        }
        structuredData.datePublished = publishDate.toISOString();
    }

    if (post.lastUpdated) {
        let modifiedDate;
        if (post.lastUpdated.seconds) {
            modifiedDate = new Date(post.lastUpdated.seconds * 1000);
        } else {
            modifiedDate = new Date(post.lastUpdated);
        }
        structuredData.dateModified = modifiedDate.toISOString();
    } else if (post.publishDate) {
        // If no update date, use publish date
        structuredData.dateModified = structuredData.datePublished;
    }

    // Update mainEntityOfPage id
    structuredData.mainEntityOfPage["@id"] = `https://codetocrack.com/blog-single.html?id=${post.id}`;

    // Update the script content
    structuredDataScript.textContent = JSON.stringify(structuredData, null, 2);
}


// Load and render post content
async function loadPost() {
    const { slug, id } = getPostIdentifierFromUrl();

    if (!slug && !id) {
        window.location.href = 'index.html';
        return;
    }

    try {
        showLoader();

        let post;
        if (slug) {
            // Try to get post by slug first
            post = await PostManager.getPostBySlug(slug);
        } else {
            // Fallback to ID-based lookup for old URLs
            post = await PostManager.getPost(id);
        }

        // Update SEO meta tags
        updateSEOMetaTags(post);

        // Update canonical URL to use slug
        const canonicalLink = document.querySelector('link[rel="canonical"]');
        if (canonicalLink && post.slug) {
            canonicalLink.href = `https://codetocrack.com/blog-single.html?slug=${post.slug}`;
        }

        // If we loaded by ID but have a slug, redirect to slug URL
        if (id && !slug && post.slug) {
            window.history.replaceState({}, '', `blog-single.html?slug=${post.slug}`);
        }

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
        await loadComments(post.id); // Still use ID for comments

        // Update breadcrumb
        updateBreadcrumb(post);

        // Load sidebar content
        await loadSidebarContent();

        // Initialize comment form
        initializeCommentForm(post.id); // Still use ID for comments

        addSinglePostSharing();

        hideLoader();

        if (window.location.search.includes('slug=')) {
            const pathSlug = window.location.pathname;
            window.history.replaceState({}, '', pathSlug);
        }
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

        // Update category link with proper URL
        if (categoryElement && post.category) {
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
            `<a href="search.html?q=${encodeURIComponent(tag)}" class="tag">#${tag}</a>`
        ).join(' ');
    }
}

// Update breadcrumb with correct category link
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

// Updated single-post.js snippet to add social sharing safely

/**
 * Add social sharing to the single post page
 * This function should be called in your loadPost function
 */
function addSinglePostSharing() {
    try {
        // Find or create the social share container in post bottom
        const postBottom = document.querySelector('.post-bottom');
        if (!postBottom) return;

        // Check if sharing is already added
        if (postBottom.querySelector('.social-share')) return;

        // Get current post URL and title
        const postUrl = window.location.href;
        const postTitle = document.querySelector('.post-header .title')?.textContent || document.title;

        // Create share container
        const shareContainer = document.createElement('div');
        shareContainer.className = 'social-share';
        shareContainer.innerHTML = `
      <h6>Share this post:</h6>
      <ul class="icons list-unstyled list-inline mb-0">
        <li class="list-inline-item">
          <a href="#" aria-label="Share on Facebook">
            <i class="fab fa-facebook-f"></i>
          </a>
        </li>
        <li class="list-inline-item">
          <a href="#" aria-label="Share on Twitter">
            <i class="fab fa-twitter"></i>
          </a>
        </li>
        <li class="list-inline-item">
          <a href="#" aria-label="Share on LinkedIn">
            <i class="fab fa-linkedin-in"></i>
          </a>
        </li>
        <li class="list-inline-item">
          <a href="#" aria-label="Share on Pinterest">
            <i class="fab fa-pinterest"></i>
          </a>
        </li>
        <li class="list-inline-item">
          <a href="#" aria-label="Share on Telegram">
            <i class="fab fa-telegram-plane"></i>
          </a>
        </li>
        <li class="list-inline-item">
          <a href="#" aria-label="Share via Email">
            <i class="far fa-envelope"></i>
          </a>
        </li>
      </ul>
    `;

        // Add to post bottom
        postBottom.appendChild(shareContainer);

    } catch (error) {
        console.error("Error adding single post sharing:", error);
    }
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
    getPostIdFromUrl,
    addSinglePostSharing
};