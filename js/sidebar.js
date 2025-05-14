// Load sidebar content
import { loadPopularPosts } from "./renderPosts.js";
import { NewsletterManager, PostManager } from './firebase-integration.js';


async function loadSidebarContent() {
    try {
        console.log("Loading sidebar content");

        // Load popular posts
        await loadPopularPosts();

        // Load tags with hashtag style
        await loadTags();

        // Initialize newsletter form
        initializeNewsletterForm();

        // Dispatch a custom event indicating sidebar is loaded
        document.dispatchEvent(new CustomEvent('sidebar-loaded'));

        console.log("Sidebar content loaded successfully");
    } catch (error) {
        console.error('Error loading sidebar content:', error);
    }
}

function initializeNewsletterForm() {
    console.log("Initializing newsletter form");

    // Wait for newsletter widget to load if not already available
    const setupForm = () => {
        const newsletterForm = document.querySelector('.newsletter form');

        if (newsletterForm) {
            // Remove any existing event listeners by cloning
            const newForm = newsletterForm.cloneNode(true);
            if (newsletterForm.parentNode) {
                newsletterForm.parentNode.replaceChild(newForm, newsletterForm);
            }

            newForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                console.log('Newsletter form submitted');

                const emailInput = this.querySelector('input[type="email"]');
                const email = emailInput ? emailInput.value.trim() : '';

                if (validateEmail(email)) {
                    try {
                        await NewsletterManager.subscribe(email);
                        showNotification('Successfully subscribed to newsletter!', 'success');
                        emailInput.value = '';
                    } catch (error) {
                        console.error('Error subscribing to newsletter:', error);
                        showNotification('Failed to subscribe: ' + error.message, 'danger');
                    }
                } else {
                    showNotification('Please enter a valid email address.', 'warning');
                }
            });

            console.log('Newsletter form handler attached');
        } else {
            console.warn('Newsletter form not found');
        }
    };

    // Check if newsletter form is already available
    if (document.querySelector('.newsletter form')) {
        setupForm();
    } else {
        // Wait for newsletter widget to load
        document.addEventListener('widget-loaded', function handler(e) {
            if (e.detail.widget === 'newsletter') {
                document.removeEventListener('widget-loaded', handler);
                setupForm();
            }
        });
    }
}

// Utility function to validate email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Show notification consistently across pages
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-3`;
    notification.style.zIndex = '9999';
    notification.style.maxWidth = '500px';
    notification.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)';
    notification.innerHTML = `
    <div class="d-flex align-items-center">
      <div class="flex-grow-1">${message}</div>
      <button type="button" class="btn-close ms-2" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;

    document.body.appendChild(notification);

    // Add manual close handler in case Bootstrap is not loaded
    const closeButton = notification.querySelector('.btn-close');
    if (closeButton) {
        closeButton.addEventListener('click', () => notification.remove());
    }

    // Remove notification after 5 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.remove();
        }
    }, 5000);
}

async function loadTags() {
    try {
        console.log("Loading popular tags");

        // Wait for widget-loaded event for topics widget
        await new Promise(resolve => {
            if (document.querySelector('#topics-list')) {
                resolve();
            } else {
                document.addEventListener('widget-loaded', function handler(e) {
                    if (e.detail.widget === 'topics') {
                        document.removeEventListener('widget-loaded', handler);
                        resolve();
                    }
                });
            }
        });

        // Get unique tags from all posts and count their occurrences
        const posts = await PostManager.getPosts({
            status: 'published',
            // Use a larger pageSize to get more posts for tag analysis
            pageSize: 1000
        });

        const tagCounts = {};

        // Extract all tags from posts and count occurrences
        posts.forEach(post => {
            if (post.tags && Array.isArray(post.tags)) {
                post.tags.forEach(tag => {
                    // Normalize tag (lowercase, trim)
                    const normalizedTag = tag.trim().toLowerCase();
                    if (normalizedTag) {
                        tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1;
                    }
                });
            }
        });

        // Convert to array for easier sorting
        const tags = Object.keys(tagCounts).map(tag => ({
            name: tag,
            postCount: tagCounts[tag]
        }));

        // Sort by post count (descending)
        tags.sort((a, b) => b.postCount - a.postCount);

        // Render tags with hashtag style
        renderHashtagTags(tags);
    } catch (error) {
        console.error('Error loading tags:', error);
    }
}

// Render tags with hashtag style
function renderHashtagTags(tags) {
    const topicsList = document.getElementById('topics-list');

    if (!topicsList) {
        console.error('Topics list element not found');
        return;
    }

    // Update the widget title to show it's about tags now
    const widgetTitle = topicsList.closest('.widget').querySelector('.widget-title');
    if (widgetTitle) {
        widgetTitle.textContent = 'Explore Tags';
    }

    // Create a new container for tag cloud
    const tagCloudContainer = document.createElement('div');
    tagCloudContainer.className = 'tag-cloud';

    if (!tags || tags.length === 0) {
        tagCloudContainer.innerHTML = '<p>No tags found</p>';
    } else {
        // Limit to top 20 tags
        const topTags = tags.slice(0, 20);

        // Find max count for scaling (for visual emphasis)
        const maxCount = Math.max(...topTags.map(tag => tag.postCount));

        topTags.forEach(tag => {
            const count = tag.postCount || 0;
            // Calculate size emphasis based on popularity (optional)
            const emphasis = Math.max(0.8, Math.min(1.2, 0.8 + (count / maxCount) * 0.4));

            // Convert tag to URL-friendly format
            const tagSlug = encodeURIComponent(tag.name);

            // Create tag element
            const tagElement = document.createElement('a');
            tagElement.className = 'tag-item';
            tagElement.href = `search.html?q=${tagSlug}`;
            tagElement.textContent = tag.name;

            // Add count indicator
            const countSpan = document.createElement('span');
            countSpan.className = 'tag-count';
            countSpan.textContent = count;
            tagElement.appendChild(countSpan);

            // Apply size emphasis if desired (optional)
            tagElement.style.fontSize = `${13 * emphasis}px`;

            tagCloudContainer.appendChild(tagElement);
        });
    }

    // Replace old list with new tag cloud
    const parent = topicsList.parentNode;
    parent.appendChild(tagCloudContainer);

    // Hide the original list (we keep it in DOM to maintain compatibility)
    topicsList.style.display = 'none';

    console.log('Hashtag-style tags rendered successfully');
}

export {
    loadSidebarContent,
    loadTags,
    initializeNewsletterForm,
    showNotification
}

