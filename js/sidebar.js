// Load sidebar content
import { loadPopularPosts } from "./renderPosts.js";
import { CategoryManager, NewsletterManager } from './firebase-integration.js';


async function loadSidebarContent() {
    try {

        console.log("Loading sidebar content");
        // Load popular posts
        loadPopularPosts();

        // Load topics (categories)
        loadTopics();

        // Initialize newsletter form
        initializeNewsletterForm();

    } catch (error) {
        console.error('Error loading sidebar content:', error);
    }
}

// Load topics/categories
// Modify loadTopics function to wait for widget loading
async function loadTopics() {
    try {
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

        const categories = await CategoryManager.getCategories();
        renderTopics(categories);
    } catch (error) {
        console.error('Error loading topics:', error);
    }
}

// Render topics in sidebar
function renderTopics(categories) {
    const topicsList = document.getElementById('topics-list');

    if (topicsList) {
        topicsList.innerHTML = '';

        if (!categories || categories.length === 0) {
            topicsList.innerHTML = '<li>No categories found</li>';
            return;
        }

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
}

// Modify initializeNewsletterForm function
function initializeNewsletterForm() {
    // Wait for newsletter widget to load
    document.addEventListener('widget-loaded', function(e) {
        if (e.detail.widget === 'newsletter') {
            const newsletterForm = document.querySelector('.newsletter form');

            if (newsletterForm) {
                // Make sure previous event listeners are removed (optional)
                const newForm = newsletterForm.cloneNode(true);
                newsletterForm.parentNode.replaceChild(newForm, newsletterForm);

                newForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    console.log('Newsletter form submitted'); // Add this for debugging

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
                console.error('Newsletter form not found after widget loaded');
            }
        }
    });
}

// Validate email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-3`;
    notification.style.zIndex = '9999';
    notification.innerHTML = `
    <div class="d-flex align-items-center">
      <div class="flex-grow-1">${message}</div>
      <button type="button" class="btn-close ms-2" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;

    document.body.appendChild(notification);

    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

export {
    loadSidebarContent
}