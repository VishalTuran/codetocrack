// Updated url-manager.js - SPA Compatible Clean URL Management

/**
 * URL Manager for generating and parsing clean URLs in SPA mode
 */
class URLManager {
    static baseUrl = 'https://www.codetocrack.dev';

    /**
     * Generate clean category URL
     */
    static generateCategoryURL(categorySlug, subcategorySlug = null) {
        if (subcategorySlug) {
            return `/${categorySlug}/${subcategorySlug}/`;
        }
        return `/${categorySlug}/`;
    }

    /**
     * Generate clean post URL
     */
    static generatePostURL(post) {
        if (!post.slug) {
            console.warn('Post missing slug, falling back to ID-based URL');
            return `/blog-single.html?id=${post.id}`;
        }

        // For posts without category/subcategory, use a generic structure
        if (!post.category || !post.subcategory) {
            return `/post/${post.slug}/`;
        }

        return `/${post.category}/${post.subcategory}/${post.slug}/`;
    }

    /**
     * Generate absolute URL
     */
    static generateAbsoluteURL(path) {
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        return `${this.baseUrl}/${cleanPath}`;
    }

    /**
     * Parse current URL to extract route information
     * This works with both clean URLs and SPA routing
     */
    static parseCurrentURL() {
        // Check if we have route data from SPA router
        if (window.categoryRouteData) {
            return {
                type: 'category',
                category: window.categoryRouteData.category,
                subcategory: window.categoryRouteData.subcategory
            };
        }

        if (window.postRouteData) {
            return {
                type: 'post',
                category: window.postRouteData.category,
                subcategory: window.postRouteData.subcategory,
                slug: window.postRouteData.slug
            };
        }

        // Fallback to URL parsing
        const path = window.location.pathname;
        const segments = path.split('/').filter(segment => segment !== '');

        // Root/homepage
        if (segments.length === 0) {
            return { type: 'home' };
        }

        // Admin pages
        if (segments[0] === 'admin' || path.includes('admin-')) {
            return { type: 'admin' };
        }

        // Search page
        if (path.includes('search.html')) {
            return { type: 'search' };
        }

        // Post URL: /category/subcategory/post-slug/
        if (segments.length === 3) {
            return {
                type: 'post',
                category: segments[0],
                subcategory: segments[1],
                slug: segments[2]
            };
        }

        // Category with subcategory: /category/subcategory/
        if (segments.length === 2) {
            return {
                type: 'category',
                category: segments[0],
                subcategory: segments[1]
            };
        }

        // Category only: /category/
        if (segments.length === 1) {
            return {
                type: 'category',
                category: segments[0]
            };
        }

        return { type: 'unknown', path };
    }

    /**
     * Get URL parameters - works with both real and virtual params
     */
    static getURLParams() {
        // Check for internal state first
        const state = window.history.state;
        if (state && state.internalUrl) {
            return new URLSearchParams(state.internalUrl.split('?')[1] || '');
        }

        return new URLSearchParams(window.location.search);
    }

    /**
     * Navigate to clean URL using SPA router
     */
    static navigate(url, replace = false) {
        if (window.spaRouter) {
            if (replace) {
                window.history.replaceState({}, '', url);
                window.spaRouter.handleRoute();
            } else {
                window.spaRouter.navigateTo(url);
            }
        } else {
            // Fallback to regular navigation
            if (replace) {
                window.location.replace(url);
            } else {
                window.location.href = url;
            }
        }
    }

    /**
     * Generate breadcrumb data from current URL
     */
    static generateBreadcrumbs() {
        const route = this.parseCurrentURL();
        const breadcrumbs = [
            { name: 'Home', url: '/' }
        ];

        switch (route.type) {
            case 'category':
                breadcrumbs.push({
                    name: this.formatCategoryName(route.category),
                    url: this.generateCategoryURL(route.category)
                });

                if (route.subcategory) {
                    breadcrumbs.push({
                        name: this.formatCategoryName(route.subcategory),
                        url: this.generateCategoryURL(route.category, route.subcategory)
                    });
                }
                break;

            case 'post':
                breadcrumbs.push({
                    name: this.formatCategoryName(route.category),
                    url: this.generateCategoryURL(route.category)
                });

                if (route.subcategory) {
                    breadcrumbs.push({
                        name: this.formatCategoryName(route.subcategory),
                        url: this.generateCategoryURL(route.category, route.subcategory)
                    });
                }

                breadcrumbs.push({
                    name: 'Loading...',
                    url: window.location.pathname,
                    current: true
                });
                break;

            case 'search':
                breadcrumbs.push({
                    name: 'Search Results',
                    url: window.location.pathname + window.location.search,
                    current: true
                });
                break;
        }

        return breadcrumbs;
    }

    /**
     * Format category name for display
     */
    static formatCategoryName(slug) {
        return slug
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Update page title based on route
     */
    static updatePageTitle(customTitle = null) {
        const route = this.parseCurrentURL();
        let title = 'Code to Crack';

        if (customTitle) {
            title = `${customTitle} - ${title}`;
        } else {
            switch (route.type) {
                case 'category':
                    const categoryName = this.formatCategoryName(route.category);
                    const subcategoryName = route.subcategory ?
                        this.formatCategoryName(route.subcategory) : null;

                    title = subcategoryName ?
                        `${categoryName} - ${subcategoryName} - ${title}` :
                        `${categoryName} - ${title}`;
                    break;

                case 'search':
                    const query = this.getURLParams().get('q');
                    title = query ?
                        `Search Results for "${query}" - ${title}` :
                        `Search - ${title}`;
                    break;
            }
        }

        document.title = title;
    }

    /**
     * Generate canonical URL for SEO
     */
    static generateCanonicalURL() {
        const cleanPath = window.location.pathname;
        return this.generateAbsoluteURL(cleanPath);
    }

    /**
     * Update meta tags for SEO
     */
    static updateMetaTags(options = {}) {
        const {
            title = document.title,
            description = 'Programming tutorials, tips, and best practices',
            image = `${this.baseUrl}/images/logo.png`,
            url = this.generateCanonicalURL()
        } = options;

        // Update canonical URL
        this.updateCanonicalURL(url);

        // Update Open Graph tags
        this.updateMetaTag('og:title', title);
        this.updateMetaTag('og:description', description);
        this.updateMetaTag('og:url', url);
        this.updateMetaTag('og:image', image);

        // Update Twitter Card tags
        this.updateMetaTag('twitter:title', title);
        this.updateMetaTag('twitter:description', description);
        this.updateMetaTag('twitter:url', url);
        this.updateMetaTag('twitter:image', image);
    }

    /**
     * Update canonical URL
     */
    static updateCanonicalURL(url) {
        let canonicalLink = document.querySelector('link[rel="canonical"]');
        if (!canonicalLink) {
            canonicalLink = document.createElement('link');
            canonicalLink.rel = 'canonical';
            document.head.appendChild(canonicalLink);
        }
        canonicalLink.href = url;
    }

    /**
     * Update meta tag
     */
    static updateMetaTag(property, content) {
        let metaTag = document.querySelector(`meta[property="${property}"]`);
        if (!metaTag) {
            metaTag = document.createElement('meta');
            metaTag.setAttribute('property', property);
            document.head.appendChild(metaTag);
        }
        metaTag.setAttribute('content', content);
    }
}

// Export for use in other modules
export { URLManager };