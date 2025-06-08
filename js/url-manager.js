// url-manager.js - Clean URL Management for Code to Crack

/**
 * URL Manager for generating and parsing clean URLs
 */
class URLManager {
    static baseUrl = 'https://www.codetocrack.dev';

    /**
     * Generate clean category URL
     * @param {string} categorySlug - Category slug
     * @param {string} subcategorySlug - Subcategory slug (optional)
     * @returns {string} Clean URL
     */
    static generateCategoryURL(categorySlug, subcategorySlug = null) {
        if (subcategorySlug) {
            return `/${categorySlug}/${subcategorySlug}/`;
        }
        return `/${categorySlug}/`;
    }

    /**
     * Generate clean post URL
     * @param {object} post - Post object with slug, category, subcategory
     * @returns {string} Clean URL
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
     * @param {string} path - Relative path
     * @returns {string} Absolute URL
     */
    static generateAbsoluteURL(path) {
        // Remove leading slash if present to avoid double slashes
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        return `${this.baseUrl}/${cleanPath}`;
    }

    /**
     * Parse current URL to extract route information
     * @returns {object} Route information
     */
    static parseCurrentURL() {
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
     * Get URL parameters from current location
     * @returns {URLSearchParams} URL parameters
     */
    static getURLParams() {
        return new URLSearchParams(window.location.search);
    }

    /**
     * Navigate to clean URL
     * @param {string} url - Clean URL to navigate to
     * @param {boolean} replace - Whether to replace current history entry
     */
    static navigate(url, replace = false) {
        if (replace) {
            window.history.replaceState({}, '', url);
        } else {
            window.history.pushState({}, '', url);
        }
    }

    /**
     * Generate breadcrumb data from current URL
     * @returns {Array} Breadcrumb items
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
                    url: `/${route.category}/`
                });

                if (route.subcategory) {
                    breadcrumbs.push({
                        name: this.formatCategoryName(route.subcategory),
                        url: `/${route.category}/${route.subcategory}/`
                    });
                }
                break;

            case 'post':
                breadcrumbs.push({
                    name: this.formatCategoryName(route.category),
                    url: `/${route.category}/`
                });

                if (route.subcategory) {
                    breadcrumbs.push({
                        name: this.formatCategoryName(route.subcategory),
                        url: `/${route.category}/${route.subcategory}/`
                    });
                }

                // Post title will be added dynamically when post data is loaded
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
     * @param {string} slug - Category slug
     * @returns {string} Formatted name
     */
    static formatCategoryName(slug) {
        return slug
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Update page title based on route
     * @param {string} customTitle - Custom title (optional)
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
     * @returns {string} Canonical URL
     */
    static generateCanonicalURL() {
        const cleanPath = window.location.pathname;
        return this.generateAbsoluteURL(cleanPath);
    }

    /**
     * Update meta tags for SEO
     * @param {object} options - Meta tag options
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
     * @param {string} url - Canonical URL
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
     * @param {string} property - Meta property
     * @param {string} content - Meta content
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