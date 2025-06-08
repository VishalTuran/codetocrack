// Updated sitemap-generator.js - Clean URL Integration
import { PostManager, CategoryManager } from './firebase-integration.js';
import { URLManager } from './url-manager.js';

// Generate sitemap with clean URLs
async function generateSitemap() {
    console.log('Starting sitemap generation with clean URLs...');

    try {
        // Get all published posts
        const posts = await PostManager.getPosts({
            status: 'published',
            pageSize: 1000 // Get all published posts
        });

        // Get all categories
        const categories = await CategoryManager.getCategories();

        // Generate sitemap XML content with clean URLs
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

        console.log("Sitemap generation complete with clean URLs!");
        return true;
    } catch (error) {
        console.error("Error generating sitemap:", error);
        return false;
    }
}

// Updated sitemap XML generator with clean URLs
function generateSitemapXML(posts, categories) {
    const SITE_URL = URLManager.baseUrl;

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_URL}/search.html</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`;

    // Add category pages with clean URLs
    if (categories && categories.length > 0) {
        categories.forEach(category => {
            // Main category page
            const categoryUrl = URLManager.generateCategoryURL(category.slug);
            sitemap += `
  <url>
    <loc>${SITE_URL}${categoryUrl}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;

            // Add subcategory pages if any
            if (category.subcategories && category.subcategories.length > 0) {
                category.subcategories.forEach(subcategory => {
                    const subcategoryUrl = URLManager.generateCategoryURL(category.slug, subcategory.slug);
                    sitemap += `
  <url>
    <loc>${SITE_URL}${subcategoryUrl}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
                });
            }
        });
    }

    // Add post pages with clean URLs
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

            // Use clean URL generation
            const postUrl = URLManager.generatePostURL(post);
            const fullPostUrl = URLManager.generateAbsoluteURL(postUrl);

            sitemap += `
  <url>
    <loc>${fullPostUrl}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>`;
        });
    }

    sitemap += '\n</urlset>';
    return sitemap;
}

// Generate RSS feed with clean URLs
async function generateRSSFeed() {
    console.log('Generating RSS feed with clean URLs...');

    try {
        // Get recent published posts
        const posts = await PostManager.getPosts({
            status: 'published',
            pageSize: 20,
            orderField: 'publishDate',
            orderDirection: 'desc'
        });

        const rssContent = generateRSSXML(posts);

        // Create download
        const blob = new Blob([rssContent], { type: 'application/rss+xml' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'rss.xml';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();

        URL.revokeObjectURL(url);
        document.body.removeChild(a);

        console.log("RSS feed generation complete!");
        return true;
    } catch (error) {
        console.error("Error generating RSS feed:", error);
        return false;
    }
}

// Generate RSS XML with clean URLs
function generateRSSXML(posts) {
    const SITE_URL = URLManager.baseUrl;
    const feedUrl = `${SITE_URL}/rss.xml`;

    let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Code to Crack</title>
    <description>Programming tutorials, tips, and best practices for developers</description>
    <link>${SITE_URL}/</link>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <managingEditor>contact@codetocrack.dev (Code to Crack Team)</managingEditor>
    <webMaster>contact@codetocrack.dev (Code to Crack Team)</webMaster>`;

    if (posts && posts.length > 0) {
        posts.forEach(post => {
            const postUrl = URLManager.generatePostURL(post);
            const fullPostUrl = URLManager.generateAbsoluteURL(postUrl);

            const pubDate = post.publishDate ?
                new Date(post.publishDate.seconds * 1000 || post.publishDate).toUTCString() :
                new Date().toUTCString();

            // Escape content for XML
            const title = escapeXML(post.title);
            const description = escapeXML(post.excerpt || '');
            const content = escapeXML(post.content || '');

            rss += `
    <item>
      <title><![CDATA[${title}]]></title>
      <description><![CDATA[${description}]]></description>
      <content:encoded><![CDATA[${content}]]></content:encoded>
      <link>${fullPostUrl}</link>
      <guid isPermaLink="true">${fullPostUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>${escapeXML(post.category || 'Uncategorized')}</category>
      <author>contact@codetocrack.dev (${escapeXML(post.author || 'Code to Crack Team')})</author>`;

            // Add enclosure for featured image if available
            if (post.featuredImage) {
                rss += `
      <enclosure url="${post.featuredImage}" type="image/jpeg"/>`;
            }

            rss += `
    </item>`;
        });
    }

    rss += `
  </channel>
</rss>`;

    return rss;
}

// Escape XML special characters
function escapeXML(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Generate robots.txt with clean URLs
function generateRobotsTxt() {
    const SITE_URL = URLManager.baseUrl;

    const robotsContent = `User-agent: *
Allow: /

# Disallow admin areas
Disallow: /admin/
Disallow: /admin-*

# Disallow direct file access
Disallow: /*.js$
Disallow: /*.css$

# Allow important files
Allow: /sitemap.xml
Allow: /rss.xml

# Sitemap location
Sitemap: ${SITE_URL}/sitemap.xml

# Crawl delay
Crawl-delay: 1`;

    // Create download
    const blob = new Blob([robotsContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'robots.txt';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    URL.revokeObjectURL(url);
    document.body.removeChild(a);

    console.log("robots.txt generated successfully!");
}

export {
    generateSitemap,
    generateRSSFeed,
    generateRobotsTxt
};