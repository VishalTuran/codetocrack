// Updated single-post.js - Clean URL Integration
import { PostManager, CommentManager } from './firebase-integration.js';
import { loadSidebarContent } from './sidebar.js';
import { URLManager } from './url-manager.js';

// Get post identifier from clean URL
function getPostIdentifierFromUrl() {
    const route = URLManager.parseCurrentURL();

    if (route.type === 'post') {
        return {
            slug: route.slug,
            category: route.category,
            subcategory: route.subcategory
        };
    }

    // Fallback to query parameters for backward compatibility
    const urlParams = URLManager.getURLParams();
    return {
        slug: urlParams.get('slug'),
        id: urlParams.get('id'),
        category: urlParams.get('category'),
        subcategory: urlParams.get('subcategory')
    };
}

// Update SEO meta tags with clean URLs
function updateSEOMetaTags(post) {
    try {
        // Generate clean URL for this post
        const postUrl = URLManager.generatePostURL(post);
        const absoluteUrl = URLManager.generateAbsoluteURL(postUrl);

        // Update page title
        URLManager.updatePageTitle(post.title);

        // Update meta description
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.content = post.excerpt;
        }

        // Update meta tags with clean URL
        URLManager.updateMetaTags({
            title: `${post.title} - Code to Crack`,
            description: post.excerpt,
            url: absoluteUrl,
            image: post.featuredImage
        });

        // Update structured data
        updateStructuredData(post, absoluteUrl);

    } catch (error) {
        console.error('Error updating SEO meta tags:', error);
    }
}

// Update structured data JSON-LD with clean URL
function updateStructuredData(post, postUrl) {
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
    structuredData.url = postUrl;

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

    // Update mainEntityOfPage id with clean URL
    structuredData.mainEntityOfPage["@id"] = postUrl;

    // Update the script content
    structuredDataScript.textContent = JSON.stringify(structuredData, null, 2);
}

// Load and render post content
async function loadPost() {
    const { slug, id, category, subcategory } = getPostIdentifierFromUrl();

    if (!slug && !id) {
        window.location.href = '/';
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

        // Verify category/subcategory match if provided in URL
        if (category && post.category !== category) {
            console.warn('Category mismatch in URL, redirecting to correct URL');
            const correctUrl = URLManager.generatePostURL(post);
            window.location.replace(correctUrl);
            return;
        }

        if (subcategory && post.subcategory !== subcategory) {
            console.warn('Subcategory mismatch in URL, redirecting to correct URL');
            const correctUrl = URLManager.generatePostURL(post);
            window.location.replace(correctUrl);
            return;
        }

        // Update SEO meta tags with clean URL
        updateSEOMetaTags(post);

        // If we loaded by ID but have a slug, redirect to clean URL
        if (id && !slug && post.slug) {
            const cleanUrl = URLManager.generatePostURL(post);
            window.history.replaceState({}, '', cleanUrl);
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

        // Add social sharing
        addSinglePostSharing();

        hideLoader();
    } catch (error) {
        console.error('Error loading post:', error);
        showError('Failed to load post content. The post may not exist or may have been moved.');
    }
}

// Render post header with clean URLs
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

        // Update category link with clean URL
        if (categoryElement && post.category) {
            categoryElement.textContent = post.category;
            categoryElement.href = URLManager.generateCategoryURL(post.category);
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

// Render tags with search links
function renderTags(tags) {
    const tagsContainer = document.querySelector('.tags');

    if (tagsContainer && tags && tags.length > 0) {
        tagsContainer.innerHTML = tags.map(tag =>
            `<a href="/search.html?q=${encodeURIComponent(tag)}" class="tag">#${tag}</a>`
        ).join(' ');
    }
}

// Update breadcrumb with clean URLs
function updateBreadcrumb(post) {
    const breadcrumbs = URLManager.generateBreadcrumbs();

    // Update the last breadcrumb with the post title
    if (breadcrumbs.length > 0) {
        breadcrumbs[breadcrumbs.length - 1].name = post.title;
    }

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

    // Also update individual breadcrumb elements if they exist
    const categoryLink = document.getElementById('category-breadcrumb');
    const postTitle = document.getElementById('post-title-breadcrumb');

    if (categoryLink && post.category) {
        categoryLink.textContent = post.category;
        categoryLink.href = URLManager.generateCategoryURL(post.category);
    }

    if (postTitle && post.title) {
        postTitle.textContent = post.title;
    }
}

// Load and render comments (unchanged)
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

// Add reply functionality (unchanged)
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

// Initialize comment form (unchanged)
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

// Add social sharing to the single post page with clean URLs
function addSinglePostSharing() {
    try {
        // Find or create the social share container in post bottom
        const postBottom = document.querySelector('.post-bottom');
        if (!postBottom) return;

        // Check if sharing is already added
        if (postBottom.querySelector('.social-share')) return;

        // Get current post URL (clean URL) and title
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
    errorDiv.innerHTML = `
        <h4 class="alert-heading">Post Not Found</h4>
        <p>${message}</p>
        <hr>
        <a href="/" class="btn btn-primary">Return to Homepage</a>
    `;

    const postContent = document.querySelector('.post-content');
    if (postContent) {
        postContent.innerHTML = '';
        postContent.appendChild(errorDiv);
    }

    // Update page title
    document.title = 'Post Not Found - Code to Crack';

    // Update page header
    const pageHeader = document.querySelector('.post-header .title');
    if (pageHeader) {
        pageHeader.textContent = 'Post Not Found';
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
    getPostIdentifierFromUrl,
    addSinglePostSharing
};