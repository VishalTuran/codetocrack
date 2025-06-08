// Updated navbar.js - Clean URL Integration
import { CategoryManager } from './firebase-integration.js';
import { URLManager } from './url-manager.js';

// Function to render navbar with clean URLs
async function renderNavbar() {
    try {
        const categories = await CategoryManager.getCategories();

        // Render navbar for header
        renderHeaderNavbar(categories);

        // Render navbar for canvas menu
        renderCanvasMenu(categories);

        // Initialize navbar functionality
        initializeNavbar();

    } catch (error) {
        console.error('Error rendering navbar:', error);
        // Fallback to static navbar if Firebase fails
        renderStaticNavbar();
    }
}

// Render header navbar with clean URLs
function renderHeaderNavbar(categories) {
    const navbarNav = document.querySelector('.navbar-nav');

    if (navbarNav) {
        let navHtml = `<li class="nav-item active"><a class='nav-link' href='/'>Home</a></li>`;

        if (!categories || categories.length === 0) {
            navbarNav.innerHTML = navHtml;
            return;
        }

        categories.forEach(category => {
            if (category.subcategories && category.subcategories.length > 0) {
                // Category with subcategories
                navHtml += `
          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="${URLManager.generateCategoryURL(category.slug)}" role="button" data-bs-toggle="dropdown" aria-expanded="false">
              ${category.name}
            </a>
            <ul class="dropdown-menu">
              ${category.subcategories.map(subcategory => `
                <li><a class="dropdown-item" href="${URLManager.generateCategoryURL(category.slug, subcategory.slug)}">${subcategory.name}</a></li>
              `).join('')}
            </ul>
          </li>
        `;
            } else {
                // Category without subcategories
                navHtml += `
          <li class="nav-item">
            <a class='nav-link' href='${URLManager.generateCategoryURL(category.slug)}'>${category.name}</a>
          </li>
        `;
            }
        });

        navbarNav.innerHTML = navHtml;
    }
}

// Render canvas menu with clean URLs
function renderCanvasMenu(categories) {
    const verticalMenu = document.querySelector('.vertical-menu');

    if (verticalMenu) {
        let menuHtml = `<li class="active"><a href='/'>Home</a></li>`;

        if (!categories || categories.length === 0) {
            verticalMenu.innerHTML = menuHtml;
            return;
        }

        categories.forEach(category => {
            if (category.subcategories && category.subcategories.length > 0) {
                // Category with subcategories
                menuHtml += `
          <li>
            <a href='${URLManager.generateCategoryURL(category.slug)}'>${category.name}</a>
            <span class="switch"><i class="icon-arrow-down-circle"></i></span>
            <ul class="submenu">
              ${category.subcategories.map(subcategory => `
                <li><a href='${URLManager.generateCategoryURL(category.slug, subcategory.slug)}'>${subcategory.name}</a></li>
              `).join('')}
            </ul>
          </li>
        `;
            } else {
                // Category without subcategories
                menuHtml += `
          <li><a href='${URLManager.generateCategoryURL(category.slug)}'>${category.name}</a></li>
        `;
            }
        });

        verticalMenu.innerHTML = menuHtml;
    }
}

// Static navbar fallback with clean URLs
function renderStaticNavbar() {
    const navbarNav = document.querySelector('.navbar-nav');
    const verticalMenu = document.querySelector('.vertical-menu');

    const staticNavHtml = `
    <li class="nav-item active"><a class='nav-link' href='/'>Home</a></li>
    <li class="nav-item dropdown">
      <a class="nav-link dropdown-toggle" href="/dsa/" data-bs-toggle="dropdown" aria-expanded="false">
        DSA
      </a>
      <ul class="dropdown-menu">
        <li><a class="dropdown-item" href="/dsa/array/">Array</a></li>
        <li><a class="dropdown-item" href="/dsa/linked-list/">Linked List</a></li>
        <li><a class="dropdown-item" href="/dsa/tree/">Tree</a></li>
        <li><a class="dropdown-item" href="/dsa/graph/">Graph</a></li>
      </ul>
    </li>
    <li class="nav-item dropdown">
      <a class="nav-link dropdown-toggle" href="/web-development/" data-bs-toggle="dropdown" aria-expanded="false">
        Web Development
      </a>
      <ul class="dropdown-menu">
        <li><a class="dropdown-item" href="/web-development/frontend/">Frontend</a></li>
        <li><a class="dropdown-item" href="/web-development/backend/">Backend</a></li>
        <li><a class="dropdown-item" href="/web-development/full-stack/">Full Stack</a></li>
      </ul>
    </li>
    <li class="nav-item"><a class='nav-link' href='/programming/'>Programming</a></li>
    <li class="nav-item"><a class='nav-link' href='/tutorials/'>Tutorials</a></li>
  `;

    if (navbarNav) {
        navbarNav.innerHTML = staticNavHtml;
    }

    if (verticalMenu) {
        verticalMenu.innerHTML = `
      <li class="active"><a href='/'>Home</a></li>
      <li>
        <a href='/dsa/'>DSA</a>
        <span class="switch"><i class="icon-arrow-down-circle"></i></span>
        <ul class="submenu">
          <li><a href='/dsa/array/'>Array</a></li>
          <li><a href='/dsa/linked-list/'>Linked List</a></li>
          <li><a href='/dsa/tree/'>Tree</a></li>
          <li><a href='/dsa/graph/'>Graph</a></li>
        </ul>
      </li>
      <li>
        <a href='/web-development/'>Web Development</a>
        <span class="switch"><i class="icon-arrow-down-circle"></i></span>
        <ul class="submenu">
          <li><a href='/web-development/frontend/'>Frontend</a></li>
          <li><a href='/web-development/backend/'>Backend</a></li>
          <li><a href='/web-development/full-stack/'>Full Stack</a></li>
        </ul>
      </li>
      <li><a href='/programming/'>Programming</a></li>
      <li><a href='/tutorials/'>Tutorials</a></li>
    `;
    }
}

// Initialize navbar functionality
function initializeNavbar() {
    // Mobile menu toggle
    const burgerMenu = document.querySelector('.burger-menu');
    const canvasMenu = document.querySelector('.canvas-menu');
    const overlay = document.querySelector('.main-overlay');

    if (burgerMenu && canvasMenu && overlay) {
        burgerMenu.addEventListener('click', () => {
            canvasMenu.classList.add('open');
            overlay.classList.add('active');
        });

        overlay.addEventListener('click', () => {
            canvasMenu.classList.remove('open');
            overlay.classList.remove('active');
        });

        const closeBtn = canvasMenu.querySelector('.btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                canvasMenu.classList.remove('open');
                overlay.classList.remove('active');
            });
        }
    }

    // Submenu toggle for vertical menu
    const switchButtons = document.querySelectorAll('.vertical-menu .switch');

    switchButtons.forEach(button => {
        button.addEventListener('click', () => {
            const parent = button.parentElement;
            const submenu = parent.querySelector('.submenu');

            if (submenu) {
                parent.classList.toggle('openmenu');
                if (submenu.style.display === 'block') {
                    submenu.style.display = 'none';
                } else {
                    submenu.style.display = 'block';
                }
            }
        });
    });

    // Highlight active menu item based on current page
    highlightActiveMenuItem();
}

// Highlight active menu item with clean URL support
function highlightActiveMenuItem() {
    const route = URLManager.parseCurrentURL();
    const menuItems = document.querySelectorAll('.navbar-nav .nav-item, .vertical-menu li');

    menuItems.forEach(item => {
        const link = item.querySelector('a');
        if (link) {
            const linkHref = link.getAttribute('href');

            // Remove active class from all items
            item.classList.remove('active');

            // Check for exact route matches
            switch (route.type) {
                case 'home':
                    if (linkHref === '/' || linkHref === 'index.html') {
                        item.classList.add('active');
                    }
                    break;

                case 'category':
                    // Check for category match
                    const categoryUrl = URLManager.generateCategoryURL(route.category);
                    const subcategoryUrl = route.subcategory ?
                        URLManager.generateCategoryURL(route.category, route.subcategory) : null;

                    if (linkHref === categoryUrl || linkHref === subcategoryUrl) {
                        item.classList.add('active');

                        // Also mark parent category as active if this is a subcategory
                        if (route.subcategory && linkHref === categoryUrl) {
                            item.classList.add('active');
                        }
                    }
                    break;

                case 'post':
                    // Mark the category and subcategory as active for posts
                    const postCategoryUrl = URLManager.generateCategoryURL(route.category);
                    const postSubcategoryUrl = route.subcategory ?
                        URLManager.generateCategoryURL(route.category, route.subcategory) : null;

                    if (linkHref === postCategoryUrl || linkHref === postSubcategoryUrl) {
                        item.classList.add('active');
                    }
                    break;
            }
        }
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', renderNavbar);

// Export functions
export { renderNavbar };