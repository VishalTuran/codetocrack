// Load sidebar content
import { loadPopularPosts } from "./renderPosts";
import { CategoryManager, NewsletterManager } from './firebase-integration.js';


async function loadSidebarContent() {
    try {
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
async function loadTopics() {
    try {
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
                    await NewsletterManager.subscribe(email);

                    // Show success message
                    showNotification('Successfully subscribed to newsletter!', 'success');

                    // Clear form
                    emailInput.value = '';

                } catch (error) {
                    console.error('Error subscribing to newsletter:', error);
                    showNotification('Failed to subscribe. Please try again.', 'error');
                }
            } else {
                showNotification('Please enter a valid email address.', 'error');
            }
        });
    }
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