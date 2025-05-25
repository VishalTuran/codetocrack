// Create a new file: seo-utils.js

/**
 * SEO Utilities for Code to Crack
 * This module provides functions for optimizing SEO across the site
 */

// Site-wide SEO constants
const SITE_NAME = "Code to Crack";
const SITE_URL = "https://codetocrack.com";
const DEFAULT_DESCRIPTION = "Master programming concepts with tutorials, tips, and best practices. Learn data structures, algorithms, web development and more.";
const DEFAULT_KEYWORDS = "programming, coding, tutorials, data structures, algorithms, web development";
const DEFAULT_IMAGE = SITE_URL + "/images/logo.png";
const DEFAULT_AUTHOR = "Code to Crack Team";

// Breadcrumb structured data generator
function generateBreadcrumbStructuredData(breadcrumbs) {
    const breadcrumbList = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": []
    };

    breadcrumbs.forEach((crumb, index) => {
        breadcrumbList.itemListElement.push({
            "@type": "ListItem",
            "position": index + 1,
            "name": crumb.name,
            "item": crumb.url
        });
    });

    return breadcrumbList;
}

// Generate structured data for a list of posts
function generateArticleListStructuredData(posts, listTitle) {
    const itemList = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": listTitle || "Latest Articles",
        "itemListElement": []
    };

    posts.forEach((post, index) => {
        itemList.itemListElement.push({
            "@type": "ListItem",
            "position": index + 1,
            "url": `${SITE_URL}/blog-single.html?id=${post.id}`
        });
    });

    return itemList;
}

// Generate FAQ structured data (for tutorial posts)
function generateFAQStructuredData(faqs) {
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
            }
        }))
    };
}

// Helper to create and insert structured data script
function insertStructuredData(data, id = null) {
    // Remove existing script with same ID if it exists
    if (id) {
        const existingScript = document.getElementById(id);
        if (existingScript) {
            existingScript.remove();
        }
    }

    // Create new script element
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    if (id) {
        script.id = id;
    }
    script.textContent = JSON.stringify(data, null, 2);

    // Append to document
    document.body.appendChild(script);
}

// Generate social sharing links
function generateSocialShareLinks(url, title, description, imageUrl) {
    const encodedUrl = encodeURIComponent(url || window.location.href);
    const encodedTitle = encodeURIComponent(title || document.title);
    const encodedDescription = encodeURIComponent(description || '');
    const encodedImage = encodeURIComponent(imageUrl || '');

    return {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}&media=${encodedImage}`,
        telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
        email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`
    };
}

// Add inline structured data
function addArticleStructuredData(post) {
    // Format dates properly
    let publishDateISO, modifiedDateISO;

    if (post.publishDate) {
        if (post.publishDate.seconds) {
            publishDateISO = new Date(post.publishDate.seconds * 1000).toISOString();
        } else {
            publishDateISO = new Date(post.publishDate).toISOString();
        }
    } else {
        publishDateISO = new Date().toISOString();
    }

    if (post.lastUpdated) {
        if (post.lastUpdated.seconds) {
            modifiedDateISO = new Date(post.lastUpdated.seconds * 1000).toISOString();
        } else {
            modifiedDateISO = new Date(post.lastUpdated).toISOString();
        }
    } else {
        modifiedDateISO = publishDateISO;
    }

    // Create structured data
    const articleStructuredData = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post.title,
        "name": post.title,
        "description": post.excerpt,
        "datePublished": publishDateISO,
        "dateModified": modifiedDateISO,
        "author": {
            "@type": "Person",
            "name": post.author || DEFAULT_AUTHOR
        },
        "publisher": {
            "@type": "Organization",
            "name": SITE_NAME,
            "logo": {
                "@type": "ImageObject",
                "url": DEFAULT_IMAGE
            }
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `${SITE_URL}/blog-single.html?id=${post.id}`
        }
    };

    // Add image if available
    if (post.featuredImage) {
        articleStructuredData.image = post.featuredImage;
    }

    // Add category if available
    if (post.category) {
        articleStructuredData.articleSection = post.category;
    }

    // Add tags if available
    if (post.tags && post.tags.length > 0) {
        articleStructuredData.keywords = post.tags.join(', ');
    }

    // Insert the structured data
    insertStructuredData(articleStructuredData, 'article-structured-data');
}

// Generate sitemap.xml content - utility function
function generateSitemapXML(posts, categories) {
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/index.html</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_URL}/search.html</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`;

    // Add category pages
    if (categories && categories.length > 0) {
        categories.forEach(category => {
            sitemap += `
  <url>
    <loc>${SITE_URL}/category.html?category=${category.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;

            // Add subcategory pages if any
            if (category.subcategories && category.subcategories.length > 0) {
                category.subcategories.forEach(subcategory => {
                    sitemap += `
  <url>
    <loc>${SITE_URL}/category.html?category=${category.slug}&amp;subcategory=${subcategory.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
                });
            }
        });
    }

    // Add post pages
    if (posts && posts.length > 0) {
        posts.forEach(post => {
            // Format last modified date
            let lastMod;
            if (post.lastUpdated) {
                if (post.lastUpdated.seconds) {
                    lastMod = new Date(post.lastUpdated.seconds * 1000).toISOString().split('T')[0];
                } else {
                    lastMod = new Date(post.lastUpdated).toISOString().split('T')[0];
                }
            } else if (post.publishDate) {
                if (post.publishDate.seconds) {
                    lastMod = new Date(post.publishDate.seconds * 1000).toISOString().split('T')[0];
                } else {
                    lastMod = new Date(post.publishDate).toISOString().split('T')[0];
                }
            }

            sitemap += `
  <url>
    <loc>${SITE_URL}/blog-single.html?id=${post.id}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>`;
        });
    }

    sitemap += '\n</urlset>';
    return sitemap;
}

// Export all functions
export {
    SITE_NAME,
    SITE_URL,
    DEFAULT_DESCRIPTION,
    DEFAULT_KEYWORDS,
    DEFAULT_IMAGE,
    DEFAULT_AUTHOR,
    generateBreadcrumbStructuredData,
    generateArticleListStructuredData,
    generateFAQStructuredData,
    insertStructuredData,
    generateSocialShareLinks,
    addArticleStructuredData,
    generateSitemapXML
};