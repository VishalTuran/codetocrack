import { CategoryManager } from './firebase-integration.js';

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

// Render header navbar
function renderHeaderNavbar(categories) {
    const navbarNav = document.querySelector('.navbar-nav');

    if (navbarNav) {
        let navHtml = `<li class="nav-item active"><a class='nav-link' href='index.html'>Home</a></li>`;

        if (!categories || categories.length === 0) {
            navbarNav.innerHTML = navHtml;
            return;
        }

        categories.forEach(category => {
            if (category.subcategories && category.subcategories.length > 0) {
                // Category with subcategories
                navHtml += `
          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="category.html?category=${category.slug}" role="button" data-bs-toggle="dropdown" aria-expanded="false">
              ${category.name}
            </a>
            <ul class="dropdown-menu">
              ${category.subcategories.map(subcategory => `
                <li><a class="dropdown-item" href="category.html?category=${category.slug}&subcategory=${subcategory.slug}">${subcategory.name}</a></li>
              `).join('')}
            </ul>
          </li>
        `;
            } else {
                // Category without subcategories
                navHtml += `
          <li class="nav-item">
            <a class='nav-link' href='category.html?category=${category.slug}'>${category.name}</a>
          </li>
        `;
            }
        });

        navbarNav.innerHTML = navHtml;
    }
}

// Render canvas menu
function renderCanvasMenu(categories) {
    const verticalMenu = document.querySelector('.vertical-menu');

    if (verticalMenu) {
        let menuHtml = `<li class="active"><a href='index.html'>Home</a></li>`;

        if (!categories || categories.length === 0) {
            verticalMenu.innerHTML = menuHtml;
            return;
        }

        categories.forEach(category => {
            if (category.subcategories && category.subcategories.length > 0) {
                // Category with subcategories
                menuHtml += `
          <li>
            <a href='category.html?category=${category.slug}'>${category.name}</a>
            <span class="switch"><i class="icon-arrow-down-circle"></i></span>
            <ul class="submenu">
              ${category.subcategories.map(subcategory => `
                <li><a href='category.html?category=${category.slug}&subcategory=${subcategory.slug}'>${subcategory.name}</a></li>
              `).join('')}
            </ul>
          </li>
        `;
            } else {
                // Category without subcategories
                menuHtml += `
          <li><a href='category.html?category=${category.slug}'>${category.name}</a></li>
        `;
            }
        });

        verticalMenu.innerHTML = menuHtml;
    }
}

// Static navbar fallback
function renderStaticNavbar() {
    const navbarNav = document.querySelector('.navbar-nav');
    const verticalMenu = document.querySelector('.vertical-menu');

    const staticNavHtml = `
    <li class="nav-item active"><a class='nav-link' href='index.html'>Home</a></li>
    <li class="nav-item dropdown">
      <a class="nav-link dropdown-toggle" href="category.html?category=dsa" data-bs-toggle="dropdown" aria-expanded="false">
        DSA
      </a>
      <ul class="dropdown-menu">
        <li><a class="dropdown-item" href="category.html?category=dsa&subcategory=array">Array</a></li>
        <li><a class="dropdown-item" href="category.html?category=dsa&subcategory=linked-list">Linked List</a></li>
        <li><a class="dropdown-item" href="category.html?category=dsa&subcategory=tree">Tree</a></li>
        <li><a class="dropdown-item" href="category.html?category=dsa&subcategory=graph">Graph</a></li>
      </ul>
    </li>
    <li class="nav-item dropdown">
      <a class="nav-link dropdown-toggle" href="category.html?category=web-development" data-bs-toggle="dropdown" aria-expanded="false">
        Web Development
      </a>
      <ul class="dropdown-menu">
        <li><a class="dropdown-item" href="category.html?category=web-development&subcategory=frontend">Frontend</a></li>
        <li><a class="dropdown-item" href="category.html?category=web-development&subcategory=backend">Backend</a></li>
        <li><a class="dropdown-item" href="category.html?category=web-development&subcategory=full-stack">Full Stack</a></li>
      </ul>
    </li>
    <li class="nav-item"><a class='nav-link' href='category.html?category=programming'>Programming</a></li>
    <li class="nav-item"><a class='nav-link' href='category.html?category=tutorials'>Tutorials</a></li>
  `;

    if (navbarNav) {
        navbarNav.innerHTML = staticNavHtml;
    }

    if (verticalMenu) {
        verticalMenu.innerHTML = `
      <li class="active"><a href='index.html'>Home</a></li>
      <li>
        <a href='category.html?category=dsa'>DSA</a>
        <span class="switch"><i class="icon-arrow-down-circle"></i></span>
        <ul class="submenu">
          <li><a href='category.html?category=dsa&subcategory=array'>Array</a></li>
          <li><a href='category.html?category=dsa&subcategory=linked-list'>Linked List</a></li>
          <li><a href='category.html?category=dsa&subcategory=tree'>Tree</a></li>
          <li><a href='category.html?category=dsa&subcategory=graph'>Graph</a></li>
        </ul>
      </li>
      <li>
        <a href='category.html?category=web-development'>Web Development</a>
        <span class="switch"><i class="icon-arrow-down-circle"></i></span>
        <ul class="submenu">
          <li><a href='category.html?category=web-development&subcategory=frontend'>Frontend</a></li>
          <li><a href='category.html?category=web-development&subcategory=backend'>Backend</a></li>
          <li><a href='category.html?category=web-development&subcategory=full-stack'>Full Stack</a></li>
        </ul>
      </li>
      <li><a href='category.html?category=programming'>Programming</a></li>
      <li><a href='category.html?category=tutorials'>Tutorials</a></li>
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

// Highlight active menu item
function highlightActiveMenuItem() {
    const currentPath = window.location.pathname;
    const menuItems = document.querySelectorAll('.navbar-nav .nav-item, .vertical-menu li');

    menuItems.forEach(item => {
        const link = item.querySelector('a');
        if (link) {
            const linkPath = link.getAttribute('href');

            // Remove active class from all items
            item.classList.remove('active');

            // Add active class to current item
            if (currentPath.includes(linkPath) ||
                (currentPath === '/' && linkPath === 'index.html') ||
                (currentPath === '/index.html' && linkPath === 'index.html')) {
                item.classList.add('active');
            }

            // Check for category/subcategory matches
            const urlParams = new URLSearchParams(window.location.search);
            const currentCategory = urlParams.get('category');

            if (link.href.includes('category=') && currentCategory) {
                const hrefParams = new URL(link.href, window.location.origin).searchParams;
                const linkCategory = hrefParams.get('category');
                if (linkCategory === currentCategory) {
                    item.classList.add('active');
                }
            }
        }
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', renderNavbar);

// Export functions
export { renderNavbar };