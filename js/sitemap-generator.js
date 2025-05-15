// Create a new file: sitemap-generator.js

/**
 * Sitemap Generator for Code to Crack
 * This script generates a sitemap.xml file with all posts and categories
 */

import { PostManager, CategoryManager } from './firebase-integration.js';
import { generateSitemapXML } from './seo-utils.js';

// Main function to generate sitemap
async function generateSitemap() {
    try {
        console.log("Starting sitemap generation...");

        // Get all published posts
        const posts = await PostManager.getPosts({
            status: 'published',
            pageSize: 1000 // Get all published posts
        });

        // Get all categories
        const categories = await CategoryManager.getCategories();

        // Generate sitemap XML content
        const sitemapContent = generateSitemapXML(posts, categories);

        // Since we're running in the browser, we can't directly write to the file system
        // Instead, we'll create a Blob and offer it for download
        const blob = new Blob([sitemapContent], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);

        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sitemap.xml';
        a.style.display = 'none';
        document.body.appendChild(a);

        // Trigger download
        a.click();

        // Clean up
        URL.revokeObjectURL(url);
        document.body.removeChild(a);

        console.log("Sitemap generation complete!");
        return true;
    } catch (error) {
        console.error("Error generating sitemap:", error);
        return false;
    }
}

// Export main function
export { generateSitemap };