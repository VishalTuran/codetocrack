// renderPosts.js
import { PostManager } from './firebase-integration.js';

// Function to render a single post
function renderPost(post, type = 'grid') {
    try {
        const postDate = new Date(post.publishDate.seconds * 1000 || post.publishDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Create proper category link with the category slug
        const categoryLink = post.category ?
            `<a class='category-badge position-absolute' href='category.html?category=${post.category}'>${post.category}</a>` :
            '';

        // For meta list, also ensure category links to the category page
        const categoryMeta = post.category ?
            `<li class="list-inline-item"><a href="category.html?category=${post.category}" class="category">${post.category}</a></li>` :
            '';

        if (type === 'list') {
            return `
        <article class="post post-list-sm square before-seperator">
          <div class="thumb rounded">
            <a href='blog-single.html?id=${post.id}'>
              <div class="inner">
                <img src="${post.featuredImage}" alt="${post.title}" />
              </div>
            </a>
          </div>
          <div class="details clearfix">
            <h6 class="post-title my-0"><a href='blog-single.html?id=${post.id}'>${post.title}</a></h6>
            <ul class="meta list-inline mt-1 mb-0">
              <li class="list-inline-item">${postDate}</li>
              ${post.category ? `<li class="list-inline-item"><a href="category.html?category=${post.category}">${post.category}</a></li>` : ''}
            </ul>
          </div>
        </article>
      `;
        }

        // Grid type post
        return `
      <div class="col-sm-6">
        <article class="post post-grid rounded bordered">
          <div class="thumb top-rounded">
            ${categoryLink}
            <span class="post-format">
              <i class="icon-picture"></i>
            </span>
            <a href='blog-single.html?id=${post.id}'>
              <div class="inner">
                <img src="${post.featuredImage}" alt="${post.title}" />
              </div>
            </a>
          </div>
          <div class="details">
            <ul class="meta list-inline mb-0">
              <li class="list-inline-item">
                <a href="#"><img src="${post.authorImg || 'images/other/author-sm.png'}" class="author" alt="${post.author}" />${post.author}</a>
              </li>
              ${categoryMeta}
              <li class="list-inline-item">${postDate}</li>
            </ul>
            <h5 class="post-title mb-3 mt-3"><a href='blog-single.html?id=${post.id}'>${post.title}</a></h5>
            <p class="excerpt mb-0">${post.excerpt}</p>
          </div>
          <div class="post-bottom clearfix d-flex align-items-center">
            <div class="social-share me-auto">
              <button class="toggle-button icon-share"></button>
              <ul class="icons list-unstyled list-inline mb-0">
                <li class="list-inline-item"><a href="#"><i class="fab fa-facebook-f"></i></a></li>
                <li class="list-inline-item"><a href="#"><i class="fab fa-twitter"></i></a></li>
                <li class="list-inline-item"><a href="#"><i class="fab fa-linkedin-in"></i></a></li>
                <li class="list-inline-item"><a href="#"><i class="fab fa-pinterest"></i></a></li>
                <li class="list-inline-item"><a href="#"><i class="fab fa-telegram-plane"></i></a></li>
                <li class="list-inline-item"><a href="#"><i class="far fa-envelope"></i></a></li>
              </ul>
            </div>
            <div class="more-button float-end">
              <a href='blog-single.html?id=${post.id}'><span class="icon-options"></span></a>
            </div>
          </div>
        </article>
      </div>
    `;
    } catch (error) {
        console.error('Error rendering post:', error);
        return `<div class="col-sm-6">Error loading post</div>`;
    }
}

// Function to render featured post
// Modify the renderFeaturedPost function in renderPosts.js

function renderFeaturedPost(post) {
    try {
        const postDate = new Date(post.publishDate.seconds * 1000 || post.publishDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Ensure excerpt doesn't exceed a certain length
        const excerptMaxLength = 120;
        let excerpt = post.excerpt || '';
        if (excerpt.length > excerptMaxLength) {
            excerpt = excerpt.substring(0, excerptMaxLength) + '...';
        }

        // Ensure title doesn't exceed a certain length
        const titleMaxLength = 65;
        let title = post.title || '';
        if (title.length > titleMaxLength) {
            title = title.substring(0, titleMaxLength) + '...';
        }

        return `
      <article class="featured-post-card">
        <div class="thumb rounded">
          ${post.category ? `<a class="category-badge position-absolute" href='category.html?category=${post.category}'>${post.category}</a>` : ''}
          <a href='blog-single.html?id=${post.id}'>
            <div class="inner" style="background-image: url('${post.featuredImage}');"></div>
          </a>
        </div>
        <div class="details">
          <ul class="meta list-inline mb-0">
            <li class="list-inline-item">
              <a href="#"><img src="${post.authorImg || 'images/author-sm.png'}" class="author" alt="${post.author}" />${post.author}</a>
            </li>
            <li class="list-inline-item">${postDate}</li>
          </ul>
          <h5 class="post-title mb-3 mt-3"><a href='blog-single.html?id=${post.id}'>${title}</a></h5>
          <p class="excerpt mb-0">${excerpt}</p>
          <div class="post-bottom d-flex align-items-center">
            <div class="more-button">
              <a href='blog-single.html?id=${post.id}' class="btn btn-default btn-sm">Read More <i class="icon-arrow-right"></i></a>
            </div>
          </div>
        </div>
      </article>
    `;
    } catch (error) {
        console.error('Error rendering featured post:', error);
        return `<div class="col-lg-4 col-md-6 col-sm-12">Error loading featured post</div>`;
    }
}

// Load and render posts
async function loadPosts(options = {}) {
    try {
        showLoader();
        const posts = await PostManager.getPosts(options);

        // Clear existing content
        const mainContainer = document.getElementById('main-posts-container');
        if (mainContainer) {
            mainContainer.innerHTML = '';

            if (posts.length === 0) {
                mainContainer.innerHTML = '<div class="col-12"><p>No posts found</p></div>';
                hideLoader();
                return;
            }

            // Render each post
            posts.forEach(post => {
                mainContainer.innerHTML += renderPost(post, 'grid');
            });
        }

        hideLoader();
    } catch (error) {
        console.error('Error loading posts:', error);
        showError('Failed to load posts. Please try again.');
    }
}

// Load featured posts
async function loadFeaturedPosts() {
    try {
        // Get the container
        const featuredContainer = document.getElementById('featured-posts');
        if (featuredContainer) {
            // Show loading indicator
            featuredContainer.innerHTML = `
        <div class="col-12 text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
      `;

            // Get featured posts from PostManager
            const featuredPosts = await PostManager.getPosts({
                featured: true,  // Only get featured posts
                status: 'published',
                orderField: 'publishDate',
                orderDirection: 'desc',
                pageSize: 8  // Increased to show more posts in the carousel
            });

            console.log('Featured posts:', featuredPosts);

            // Clear loading indicator
            featuredContainer.innerHTML = '';

            if (featuredPosts.length === 0) {
                // Hide section if no featured posts
                const carouselSection = document.querySelector('.hero-carousel');
                if (carouselSection) {
                    carouselSection.style.display = 'none';
                }
                return;
            }

            // Render each featured post
            featuredPosts.forEach(post => {
                featuredContainer.innerHTML += renderFeaturedPost(post);
            });

            // Make sure carousel navigation is working
            setTimeout(() => {
                if (typeof initCarousel === 'function') {
                    initCarousel();
                } else {
                    initializeCarouselNavigation();
                }
            }, 100);
        }
    } catch (error) {
        console.error('Error loading featured posts:', error);

        // Show error message if loading fails
        const featuredContainer = document.getElementById('featured-posts');
        if (featuredContainer) {
            featuredContainer.innerHTML = `
        <div class="col-12 text-center py-3">
          <div class="alert alert-danger" role="alert">
            Failed to load featured posts. Please try again later.
          </div>
        </div>
      `;
        }
    }
}

// Load popular posts for sidebar
async function loadPopularPosts() {
    try {
        const popularPosts = await PostManager.getPopularPosts(5);

        const popularContainer = document.getElementById('popular-posts-container');
        if (popularContainer) {
            popularContainer.innerHTML = '';

            if (popularPosts.length === 0) {
                popularContainer.innerHTML = '<p>No popular posts yet</p>';
                return;
            }

            popularPosts.forEach((post, index) => {
                const postHtml = renderPost(post, 'list');
                popularContainer.innerHTML += postHtml.replace('square', 'circle')
                    .replace('<div class="thumb rounded">', `<div class="thumb rounded circle"><span class="number">${index + 1}</span>`);
            });
        }
    } catch (error) {
        console.error('Error loading popular posts:', error);
    }
}

// Utility functions
function showLoader() {
    const loader = document.createElement('div');
    loader.id = 'loading-indicator';
    loader.className = 'text-center my-5';
    loader.innerHTML = `
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>
  `;

    const mainContainer = document.getElementById('main-posts-container');
    if (mainContainer) {
        mainContainer.appendChild(loader);
    }
}

function hideLoader() {
    const loader = document.getElementById('loading-indicator');
    if (loader) {
        loader.remove();
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger my-4';
    errorDiv.textContent = message;

    const mainContainer = document.getElementById('main-posts-container');
    if (mainContainer) {
        mainContainer.innerHTML = '';
        mainContainer.appendChild(errorDiv);
    }
}

function initializeCarouselNavigation() {
    const carousel = document.getElementById('featured-posts');
    const prevButton = document.getElementById('carousel-prev');
    const nextButton = document.getElementById('carousel-next');

    if (!carousel || !prevButton || !nextButton) return;

    // Set scroll amount (width of one card + gap)
    const scrollAmount = 370; // Approximate width of card + padding

    // Add click event to previous button
    prevButton.addEventListener('click', () => {
        carousel.scrollBy({
            left: -scrollAmount,
            behavior: 'smooth'
        });
    });

    // Add click event to next button
    nextButton.addEventListener('click', () => {
        carousel.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
        });
    });

    // Optional: Hide navigation buttons when at the beginning or end
    carousel.addEventListener('scroll', () => {
        const isAtStart = carousel.scrollLeft <= 10;
        const isAtEnd = carousel.scrollLeft >= (carousel.scrollWidth - carousel.clientWidth - 10);

        prevButton.style.opacity = isAtStart ? '0.5' : '1';
        nextButton.style.opacity = isAtEnd ? '0.5' : '1';
    });
}

// Export functions
export {
    renderPost,
    renderFeaturedPost,
    loadPosts,
    loadFeaturedPosts,
    loadPopularPosts
};