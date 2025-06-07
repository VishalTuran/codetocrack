import { PostManager } from './firebase-integration.js';

class MigrationUtility {
    static async migrateAllPosts() {
        console.log("🚀 Starting comprehensive post migration...");

        try {
            let migrationStats = {
                total: 0,
                success: 0,
                errors: 0,
                skipped: 0
            };

            // Get all posts (including drafts)
            const allPosts = await this.getAllPosts();
            migrationStats.total = allPosts.length;

            console.log(`Found ${allPosts.length} posts to check for migration`);

            for (const post of allPosts) {
                try {
                    // Check if post already has a slug
                    if (post.slug && post.slug.trim() !== '') {
                        console.log(`⏭️ Skipping "${post.title}" - already has slug: ${post.slug}`);
                        migrationStats.skipped++;
                        continue;
                    }

                    // Generate slug for post
                    const baseSlug = this.generateSlug(post.title);
                    const uniqueSlug = await PostManager.ensureUniqueSlug(baseSlug, post.id);

                    // Update post with slug
                    await PostManager.updatePost(post.id, { slug: uniqueSlug });

                    console.log(`✅ Updated "${post.title}" with slug: ${uniqueSlug}`);
                    migrationStats.success++;

                    // Add small delay to avoid overwhelming Firebase
                    await new Promise(resolve => setTimeout(resolve, 100));

                } catch (error) {
                    console.error(`❌ Error migrating "${post.title}":`, error);
                    migrationStats.errors++;
                }
            }

            // Print migration summary
            console.log("\n📊 Migration Summary:");
            console.log(`Total posts: ${migrationStats.total}`);
            console.log(`Successfully migrated: ${migrationStats.success}`);
            console.log(`Skipped (already had slugs): ${migrationStats.skipped}`);
            console.log(`Errors: ${migrationStats.errors}`);

            if (migrationStats.errors === 0) {
                console.log("🎉 Migration completed successfully!");
            } else {
                console.log("⚠️ Migration completed with some errors. Check the logs above.");
            }

            return migrationStats;

        } catch (error) {
            console.error("💥 Migration failed:", error);
            throw error;
        }
    }

    // Get all posts for migration
    static async getAllPosts() {
        try {
            // Get posts in batches to handle large numbers
            const batchSize = 100;
            let allPosts = [];
            let page = 1;
            let hasMore = true;

            while (hasMore) {
                const posts = await PostManager.getPosts({
                    page: page,
                    pageSize: batchSize
                });

                if (posts.length === 0) {
                    hasMore = false;
                } else {
                    allPosts = allPosts.concat(posts);
                    page++;

                    // If we got fewer posts than the batch size, we're done
                    if (posts.length < batchSize) {
                        hasMore = false;
                    }
                }
            }

            return allPosts;
        } catch (error) {
            console.error("Error fetching posts for migration:", error);
            throw error;
        }
    }

    // Generate slug (same logic as PostManager)
    static generateSlug(title) {
        return title
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
            .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    }

    // Verify migration results
    static async verifyMigration() {
        console.log("🔍 Verifying migration results...");

        try {
            const allPosts = await this.getAllPosts();
            const postsWithoutSlugs = allPosts.filter(post => !post.slug || post.slug.trim() === '');

            console.log(`Total posts: ${allPosts.length}`);
            console.log(`Posts without slugs: ${postsWithoutSlugs.length}`);

            if (postsWithoutSlugs.length > 0) {
                console.log("Posts still missing slugs:");
                postsWithoutSlugs.forEach(post => {
                    console.log(`- "${post.title}" (ID: ${post.id})`);
                });
            } else {
                console.log("✅ All posts have slugs!");
            }

            // Check for duplicate slugs
            const slugs = allPosts.map(post => post.slug).filter(slug => slug);
            const duplicateSlugs = slugs.filter((slug, index) => slugs.indexOf(slug) !== index);

            if (duplicateSlugs.length > 0) {
                console.log("⚠️ Found duplicate slugs:", [...new Set(duplicateSlugs)]);
            } else {
                console.log("✅ No duplicate slugs found!");
            }

            return {
                total: allPosts.length,
                withoutSlugs: postsWithoutSlugs.length,
                duplicates: duplicateSlugs.length
            };

        } catch (error) {
            console.error("Error verifying migration:", error);
            throw error;
        }
    }
}

// Make available globally for console use
window.MigrationUtility = MigrationUtility;