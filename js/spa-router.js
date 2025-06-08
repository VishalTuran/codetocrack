// spa-router.js - Single Page Application Router for Clean URLs

class SPARouter {
    constructor() {
        this.currentRoute = null;
        this.isLoading = false;
        this.init();
    }

    init() {
        // Handle initial page load
        window.addEventListener('DOMContentLoaded', () => {
            this.handleRoute();
        });

        // Handle back/forward navigation
        window.addEventListener('popstate', () => {
            this.handleRoute();
        });

        // Handle navigation clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;

            const href = link.getAttribute('href');
            if (!href || href.startsWith('http') || href.startsWith('#') ||
                href.includes('admin-') || href.includes('search.html')) return;

            // Handle clean URL navigation
            if (href.startsWith('/') && !href.includes('.html')) {
                e.preventDefault();
                this.navigateTo(href);
            }
        });
    }

    navigateTo(path) {
        if (this.isLoading) return;

        // Update URL without reload
        window.history.pushState({}, '', path);
        this.handleRoute();
    }

    async handleRoute() {
        if (this.isLoading) return;
        this.isLoading = true;

        const path = window.location.pathname;
        const route = this.parseRoute(path);

        console.log('SPA Router - Handling route:', route);

        try {
            switch (route.type) {
                case 'home':
                    await this.loadPage('index.html');
                    break;

                case 'category':
                    await this.loadCategoryPage(route.category, route.subcategory);
                    break;

                case 'post':
                    await this.loadPostPage(route.category, route.subcategory, route.slug);
                    break;

                default:
                    await this.loadPage('index.html');
                    break;
            }
        } catch (error) {
            console.error('SPA Router error:', error);
            await this.loadPage('index.html');
        }

        this.isLoading = false;
    }

    parseRoute(path) {
        const segments = path.replace(/^\/|\/$/g, '').split('/').filter(s => s);

        if (path === '/' || segments.length === 0) {
            return { type: 'home' };
        }

        if (segments.length === 1) {
            return {
                type: 'category',
                category: segments[0]
            };
        }

        if (segments.length === 2) {
            return {
                type: 'category',
                category: segments[0],
                subcategory: segments[1]
            };
        }

        if (segments.length === 3) {
            return {
                type: 'post',
                category: segments[0],
                subcategory: segments[1],
                slug: segments[2]
            };
        }

        return { type: 'unknown', path };
    }

    async loadPage(filename) {
        try {
            const response = await fetch(`/${filename}`);
            if (!response.ok) throw new Error(`Failed to load ${filename}`);

            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Replace page content
            document.documentElement.innerHTML = doc.documentElement.innerHTML;

            // Re-initialize scripts
            this.reinitializeScripts();

        } catch (error) {
            console.error('Error loading page:', error);
            window.location.href = `/${filename}`;
        }
    }

    async loadCategoryPage(category, subcategory = null) {
        try {
            // Load category.html
            const response = await fetch('/category.html');
            if (!response.ok) throw new Error('Failed to load category page');

            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Replace page content
            document.documentElement.innerHTML = doc.documentElement.innerHTML;

            // Set up URL parameters for the category page logic
            const newUrl = subcategory ?
                `/category.html?category=${category}&subcategory=${subcategory}` :
                `/category.html?category=${category}`;

            // Update internal state without changing visible URL
            window.history.replaceState(
                { internalUrl: newUrl },
                '',
                window.location.pathname
            );

            // Re-initialize scripts and load category content
            this.reinitializeScripts();

            // Trigger category loading with clean URL data
            if (window.loadCategoryContent) {
                // Pass route data to category loader
                window.categoryRouteData = { category, subcategory };
                window.loadCategoryContent();
            }

        } catch (error) {
            console.error('Error loading category page:', error);
            const fallbackUrl = subcategory ?
                `/category.html?category=${category}&subcategory=${subcategory}` :
                `/category.html?category=${category}`;
            window.location.href = fallbackUrl;
        }
    }

    async loadPostPage(category, subcategory, slug) {
        try {
            // Load blog-single.html
            const response = await fetch('/blog-single.html');
            if (!response.ok) throw new Error('Failed to load post page');

            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Replace page content
            document.documentElement.innerHTML = doc.documentElement.innerHTML;

            // Set up URL parameters for the post page logic
            const newUrl = `/blog-single.html?category=${category}&subcategory=${subcategory}&slug=${slug}`;

            // Update internal state without changing visible URL
            window.history.replaceState(
                { internalUrl: newUrl },
                '',
                window.location.pathname
            );

            // Re-initialize scripts and load post content
            this.reinitializeScripts();

            // Trigger post loading with clean URL data
            if (window.loadPost) {
                // Pass route data to post loader
                window.postRouteData = { category, subcategory, slug };
                window.loadPost();
            }

        } catch (error) {
            console.error('Error loading post page:', error);
            const fallbackUrl = `/blog-single.html?category=${category}&subcategory=${subcategory}&slug=${slug}`;
            window.location.href = fallbackUrl;
        }
    }

    reinitializeScripts() {
        // Re-execute module scripts
        const moduleScripts = document.querySelectorAll('script[type="module"]');
        moduleScripts.forEach(script => {
            if (script.src) {
                const newScript = document.createElement('script');
                newScript.type = 'module';
                newScript.src = script.src;
                document.head.appendChild(newScript);
            }
        });

        // Dispatch custom event for widget loading
        setTimeout(() => {
            document.dispatchEvent(new CustomEvent('spa-route-changed'));
        }, 100);
    }
}

// Initialize SPA Router
const spaRouter = new SPARouter();

// Export for use in other modules
window.spaRouter = spaRouter;

export { SPARouter };