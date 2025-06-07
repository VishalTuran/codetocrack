class SEOEnhancements {
    // Generate social sharing URLs with slug
    static generateSocialShareUrls(post) {
        const baseUrl = 'https://codetocrack.dev';
        const postUrl = post.slug ?
            `${baseUrl}/blog-single.html?slug=${post.slug}` :
            `${baseUrl}/blog-single.html?id=${post.id}`;

        const encodedUrl = encodeURIComponent(postUrl);
        const encodedTitle = encodeURIComponent(post.title);
        const encodedDescription = encodeURIComponent(post.excerpt || '');

        return {
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
            twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
            pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}&media=${encodeURIComponent(post.featuredImage || '')}`,
            telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
            email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`
        };
    }

    // Update meta tags with slug URL
    static updateMetaTags(post) {
        const baseUrl = 'https://codetocrack.dev';
        const postUrl = post.slug ?
            `${baseUrl}/blog-single.html?slug=${post.slug}` :
            `${baseUrl}/blog-single.html?id=${post.id}`;

        // Update canonical URL
        let canonicalLink = document.querySelector('link[rel="canonical"]');
        if (!canonicalLink) {
            canonicalLink = document.createElement('link');
            canonicalLink.rel = 'canonical';
            document.head.appendChild(canonicalLink);
        }
        canonicalLink.href = postUrl;

        // Update Open Graph URLs
        this.updateMetaProperty('og:url', postUrl);
        this.updateMetaProperty('twitter:url', postUrl);

        // Update structured data
        this.updateStructuredDataUrl(post, postUrl);
    }

    // Helper to update meta properties
    static updateMetaProperty(property, content) {
        let metaTag = document.querySelector(`meta[property="${property}"]`);
        if (!metaTag) {
            metaTag = document.createElement('meta');
            metaTag.setAttribute('property', property);
            document.head.appendChild(metaTag);
        }
        metaTag.setAttribute('content', content);
    }

    // Update structured data with correct URL
    static updateStructuredDataUrl(post, postUrl) {
        const structuredDataScript = document.getElementById('post-structured-data');
        if (!structuredDataScript) return;

        try {
            let structuredData = JSON.parse(structuredDataScript.textContent);
            structuredData.mainEntityOfPage["@id"] = postUrl;
            structuredData.url = postUrl;
            structuredDataScript.textContent = JSON.stringify(structuredData, null, 2);
        } catch (error) {
            console.error('Error updating structured data:', error);
        }
    }

    // Generate RSS feed with slug URLs
    static async generateRSSFeed(posts) {
        const baseUrl = 'https://codetocrack.dev';
        const feedUrl = `${baseUrl}/rss.xml`;

        let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Code to Crack</title>
    <description>Programming tutorials, tips, and best practices</description>
    <link>${baseUrl}</link>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`;

        posts.slice(0, 20).forEach(post => {
            const postUrl = post.slug ?
                `${baseUrl}/blog-single.html?slug=${post.slug}` :
                `${baseUrl}/blog-single.html?id=${post.id}`;

            const pubDate = post.publishDate ?
                new Date(post.publishDate.seconds * 1000 || post.publishDate).toUTCString() :
                new Date().toUTCString();

            rss += `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <description><![CDATA[${post.excerpt || ''}]]></description>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>${post.category || 'Uncategorized'}</category>
    </item>`;
        });

        rss += `
  </channel>
</rss>`;

        return rss;
    }
}