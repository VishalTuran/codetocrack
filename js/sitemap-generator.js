import { PostManager, CategoryManager } from './firebase-integration.js';

// Generate sitemap with slug-based URLs
async function generateSitemap() {
    console.log('Starting sitemap generation with slug-based URLs...');

    try {
        // Get all published posts
        const posts = await PostManager.getPosts({
            status: 'published',
            pageSize: 1000 // Get all published posts
        });

        // Get all categories
        const categories = await CategoryManager.getCategories();

        // Generate sitemap XML content with slug URLs
        const sitemapContent = generateSitemapXML(posts, categories);

        // Create download
        const blob = new Blob([sitemapContent], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'sitemap.xml';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();

        URL.revokeObjectURL(url);
        document.body.removeChild(a);

        console.log("Sitemap generation complete with slug URLs!");
        return true;
    } catch (error) {
        console.error("Error generating sitemap:", error);
        return false;
    }
}

// Updated sitemap XML generator with slug URLs
function generateSitemapXML(posts, categories) {
    const SITE_URL = "https://codetocrack.dev"; // Update with your domain

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

    // Add post pages with slug URLs
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

            // Use slug URL if available, fallback to ID
            const postUrl = post.slug ?
                `${SITE_URL}/blog-single.html?slug=${post.slug}` :
                `${SITE_URL}/blog-single.html?id=${post.id}`;

            sitemap += `
  <url>
    <loc>${postUrl}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>`;
        });
    }

    sitemap += '\n</urlset>';
    return sitemap;
}

export { generateSitemap };