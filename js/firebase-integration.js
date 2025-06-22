import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query as firestoreQuery,
  where,
  orderBy,
  limit as firestoreLimit,
  increment,
  getFirestore
} from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js';

import {
  ref,
  uploadBytes,
  getDownloadURL,
  getStorage,
  deleteObject
} from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-storage.js';

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import { getConfig } from './config.js';


// Initialize Firebase directly in this module
const firebaseConfig = getConfig()

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Make Firebase available globally
window.firebaseApp = app;
window.firebaseDb = db;
window.firebaseStorage = storage;

// Database Collections
const collections = {
  posts: 'posts',
  categories: 'categories',
  authors: 'authors',
  comments: 'comments',
  tags: 'tags',
  newsletter: 'newsletter',
  activity: 'activity'
};

// Post Management
class PostManager {
  static generateSlug(title) {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  static async ensureUniqueSlug(baseSlug, excludeId = null) {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      // Check if slug exists
      try {
        const existingPost = await this.getPostBySlug(slug);


        if (!existingPost || (excludeId && existingPost.id === excludeId)) {
          return slug;
        }
      }catch (error) {
        console.error(error);
        return slug;
      }

      // If slug exists, append number
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  static async getPostBySlug(slug) {
    try {
      console.log("Getting post by slug:", slug);
      const q = firestoreQuery(
          collection(db, collections.posts),
          where('slug', '==', slug),
          where('status', '==', 'published')
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('Post not found');
      }

      const post = {
        id: querySnapshot.docs[0].id,
        ...querySnapshot.docs[0].data()
      };

      // Increment view count
      await this.incrementViews(post.id);

      console.log("Post retrieved successfully by slug");
      return post;
    } catch (error) {
      console.error('Error getting post by slug:', error);
      throw error;
    }
  }

  static async createPost(postData) {
    try {
      console.log("Creating post:", postData.title);

      // Generate unique slug
      const baseSlug = this.generateSlug(postData.title);
      const uniqueSlug = await this.ensureUniqueSlug(baseSlug);

      // Convert date strings to Firestore timestamps if needed
      let publishDate = postData.publishDate;
      if (typeof publishDate === 'string') {
        publishDate = new Date(publishDate);
      }

      const postToSave = {
        title: postData.title,
        slug: uniqueSlug, // Add slug field
        content: postData.content,
        excerpt: postData.excerpt || this.generateExcerpt(postData.content),
        category: postData.category,
        subcategory: postData.subcategory,
        author: postData.author,
        authorImg: postData.authorImg,
        featuredImage: postData.featuredImage,
        tags: postData.tags || [],
        publishDate: publishDate || new Date(),
        lastUpdated: new Date(),
        views: 0,
        likes: 0,
        featured: postData.featured || false,
        sticky: postData.sticky || false,
        status: postData.status || 'published',
        readTime: this.calculateReadTime(postData.content)
      };

      console.log("Creating post:", postData);

      const docRef = await addDoc(collection(db, collections.posts), postToSave);

      // Update category post count
      if (postData.category) {
        await this.updateCategoryPostCount(postData.category);
      }

      // Log activity
      await this.logActivity('post_created', `Post "${postData.title}" created`, docRef.id);

      console.log('Post created with ID:', docRef.id, 'and slug:', uniqueSlug);
      return docRef.id;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  // Update updatePost method to handle slug changes
  static async updatePost(postId, postData) {
    try {
      console.log("Updating post:", postId);
      const postRef = doc(db, collections.posts, postId);

      // Get current post data
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) {
        throw new Error('Post not found');
      }

      const currentPost = postSnap.data();

      // Convert date strings to Firestore timestamps if needed
      let publishDate = postData.publishDate;
      if (typeof publishDate === 'string') {
        publishDate = new Date(publishDate);
      }

      // Prepare update data
      const updateData = {
        ...postData,
        lastUpdated: new Date()
      };

      // Handle slug update if title changed
      if (postData.title && postData.title !== currentPost.title) {
        const baseSlug = this.generateSlug(postData.title);
        const uniqueSlug = await this.ensureUniqueSlug(baseSlug, postId);
        updateData.slug = uniqueSlug;
      }

      // Add publishDate if provided
      if (publishDate) {
        updateData.publishDate = publishDate;
      }

      // If content changed, recalculate read time
      if (postData.content && postData.content !== currentPost.content) {
        updateData.readTime = this.calculateReadTime(postData.content);

        // Generate excerpt if not provided
        if (!postData.excerpt) {
          updateData.excerpt = this.generateExcerpt(postData.content);
        }
      }

      // Update the post
      await updateDoc(postRef, updateData);

      // If category changed, update category post counts
      if (postData.category && postData.category !== currentPost.category) {
        await this.updateCategoryPostCount(postData.category, 1);
        if (currentPost.category) {
          await this.updateCategoryPostCount(currentPost.category, -1);
        }
      }

      // Log activity
      await this.logActivity('post_updated', `Post "${postData.title || currentPost.title}" updated`, postId);

      return postId;
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  }

  // Add method to migrate existing posts to have slugs (run once)
  static async migratePostsToSlugs() {
    try {
      console.log("Starting migration to add slugs to existing posts...");

      const q = firestoreQuery(
          collection(db, collections.posts),
          where('slug', '==', null) // Only posts without slugs
      );

      const querySnapshot = await getDocs(q);
      const posts = [];

      querySnapshot.forEach((doc) => {
        posts.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`Found ${posts.length} posts to migrate`);

      for (const post of posts) {
        if (post.title) {
          const baseSlug = this.generateSlug(post.title);
          const uniqueSlug = await this.ensureUniqueSlug(baseSlug);

          const postRef = doc(db, collections.posts, post.id);
          await updateDoc(postRef, { slug: uniqueSlug });

          console.log(`Updated post "${post.title}" with slug: ${uniqueSlug}`);
        }
      }

      console.log("Migration completed!");
      return true;
    } catch (error) {
      console.error('Error during migration:', error);
      throw error;
    }
  }

  // Delete a post
  static async deletePost(postId) {
    try {
      console.log("Deleting post:", postId);
      // Get post data before deletion (for activity log and category updates)
      const postRef = doc(db, collections.posts, postId);
      const postSnap = await getDoc(postRef);

      if (!postSnap.exists()) {
        throw new Error('Post not found');
      }

      const postData = postSnap.data();

      // Delete associated images if not used elsewhere
      if (postData.featuredImage && postData.featuredImage.startsWith('https://firebasestorage.googleapis.com')) {
        try {
          // Extract path from URL
          const url = new URL(postData.featuredImage);
          const path = url.pathname.split('/o/')[1]?.split('?')[0];

          if (path) {
            const decodedPath = decodeURIComponent(path);
            const imageRef = ref(storage, decodedPath);
            await deleteObject(imageRef);
            console.log("Deleted featured image:", decodedPath);
          }
        } catch (imageError) {
          console.error("Error deleting featured image:", imageError);
          // Continue with post deletion even if image deletion fails
        }
      }

      // Delete the post
      await deleteDoc(postRef);

      // Update category post count if needed
      if (postData.category) {
        await this.updateCategoryPostCount(postData.category, -1);
      }

      // Log activity
      await this.logActivity('post_deleted', `Post "${postData.title}" deleted`, postId);

      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }

  // Update category post count
  static async updateCategoryPostCount(categorySlug, change = 1) {
    try {
      // Find the category by slug
      const categoriesCollection = collection(db, collections.categories);
      const q = firestoreQuery(categoriesCollection, where('slug', '==', categorySlug));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log(`Category with slug "${categorySlug}" not found`);
        return;
      }

      // Update the post count
      const categoryDoc = querySnapshot.docs[0];
      const categoryRef = doc(db, collections.categories, categoryDoc.id);

      await updateDoc(categoryRef, {
        postCount: increment(change)
      });

      console.log(`Updated post count for category "${categorySlug}" by ${change}`);
    } catch (error) {
      console.error(`Error updating post count for category "${categorySlug}":`, error);
      // Don't throw the error to avoid disrupting the main operation
    }
  }

  // Upload image to Firebase Storage with improved handling
  static async uploadImage(file, path = 'posts/') {
    try {
      console.log("UploadImage: START");

      if (!window.firebaseStorage) {
        console.error("Firebase Storage is not initialized yet");
        throw new Error("Firebase Storage is not available.");
      }

      if (!file || !file.name) {
        console.error("Invalid file object:", file);
        throw new Error('Invalid file object');
      }

      const safeFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const fileName = `${path}${Date.now()}_${safeFileName}`;
      const storageRef = ref(window.firebaseStorage, fileName);
      const metadata = { contentType: file.type || 'image/jpeg' };

      console.log("Uploading file to Firebase...");
      const snapshot = await uploadBytes(storageRef, file, metadata);

      console.log("Snapshot returned:", snapshot);
      console.log("Getting download URL using ref:", storageRef);

      const url = await getDownloadURL(storageRef);

      console.log("Download URL:", url);
      return url;
    } catch (error) {
      console.error('uploadImage error:', error);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }


  // Get all posts with pagination and filtering
  // In firebase-integration.js, ensure the getPosts method handles pagination correctly
  // In firebase-integration.js, ensure the getPosts method handles pagination correctly
  static async getPosts(options = {}) {
    try {
      const {
        page = 1,
        pageSize = 10,
        category = null,
        subcategory = null,
        tags = [],
        orderField = 'publishDate',
        orderDirection = 'desc',
        status = null,
        featured = null,
        search = null
      } = options;

      console.log(`Fetching posts for page ${page}, pageSize ${pageSize}`); // Add for debugging

      let constraints = [];

      if (category) {
        constraints.push(where('category', '==', category));
      }
      if (subcategory) {
        constraints.push(where('subcategory', '==', subcategory));
      }
      if (tags && tags.length > 0) {
        constraints.push(where('tags', 'array-contains-any', tags));
      }
      if (status) {
        constraints.push(where('status', '==', status));
      }
      if (featured !== null) {
        constraints.push(where('featured', '==', featured));
      }

      constraints.push(orderBy(orderField, orderDirection));

      // Calculate the number of documents to skip
      // For Firebase, we need to get all documents and skip manually
      // since Firestore doesn't have a skip/offset parameter

      // For better performance in a real app, consider implementing cursor-based pagination
      // Here, we're using a simple approach for clarity

      const q = firestoreQuery(collection(db, collections.posts), ...constraints);
      const querySnapshot = await getDocs(q);

      const allPosts = [];
      querySnapshot.forEach((doc) => {
        // Filter for search term if provided
        const post = {
          id: doc.id,
          ...doc.data()
        };

        if (search && !this.postMatchesSearch(post, search)) {
          return;
        }

        allPosts.push(post);
      });

      // Manual pagination
      const skip = (page - 1) * pageSize;
      const end = skip + pageSize;

      console.log(`Total posts: ${allPosts.length}, skipping ${skip}, taking ${pageSize}, returning ${Math.min(end, allPosts.length) - skip} posts`); // Add for debugging

      return allPosts.slice(skip, end);
    } catch (error) {
      console.error('Error getting posts:', error);
      return [];
    }
  }

  // Check if post matches search term
  static postMatchesSearch(post, searchTerm) {
    if (!searchTerm) return true;

    const term = searchTerm.toLowerCase();
    const titleMatch = post.title && post.title.toLowerCase().includes(term);
    const contentMatch = post.content && post.content.toLowerCase().includes(term);
    const excerptMatch = post.excerpt && post.excerpt.toLowerCase().includes(term);
    const tagsMatch = post.tags && post.tags.some(tag => tag.toLowerCase().includes(term));

    return titleMatch || contentMatch || excerptMatch || tagsMatch;
  }

  // Get a single post by ID
  static async getPost(postId) {
    try {
      console.log("Getting post by ID:", postId);
      const docRef = doc(db, collections.posts, postId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        // Increment view count
        await this.incrementViews(postId);

        const post = {
          id: docSnap.id,
          ...docSnap.data()
        };

        console.log("Post retrieved successfully");
        return post;
      } else {
        throw new Error('Post not found');
      }
    } catch (error) {
      console.error('Error getting post:', error);
      throw error;
    }
  }

  // Get popular posts
  // Improved getPopularPosts method with better error handling and logging
  static async getPopularPosts(numPosts = 5) {
    try {
      const altQuery = firestoreQuery(
          collection(db, collections.posts),
          orderBy('views', 'desc'),
          firestoreLimit(numPosts)
      );

      const altSnapshot = await getDocs(altQuery);
      const altPosts = [];

      altSnapshot.forEach((doc) => {
        const data = doc.data();
        // Filter for published status on the client side
        if (data.status === 'published') {
          altPosts.push({
            id: doc.id,
            ...data
          });
        }
      });

      if (altPosts.length > 0) {
        return altPosts.slice(0, numPosts);
      }

    } catch (altError) {

      // Last resort - return recent posts
      const fallbackQuery = firestoreQuery(
          collection(db, collections.posts),
          where('status', '==', 'published'),
          orderBy('publishDate', 'desc'),
          firestoreLimit(numPosts)
      );

      const fallbackSnapshot = await getDocs(fallbackQuery);
      const fallbackPosts = [];

      fallbackSnapshot.forEach((doc) => {
        fallbackPosts.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return fallbackPosts;
    }
  }

  // Get featured posts
  static async getFeaturedPosts(numPosts = 5) {
    try {
      console.log(`Getting ${numPosts} featured posts`);
      const q = firestoreQuery(
          collection(db, collections.posts),
          where('featured', '==', true),
          where('status', '==', 'published'),
          orderBy('publishDate', 'desc'),
          firestoreLimit(numPosts)
      );

      const querySnapshot = await getDocs(q);
      const posts = [];

      querySnapshot.forEach((doc) => {
        posts.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`Found ${posts.length} featured posts`);
      return posts;
    } catch (error) {
      console.error('Error getting featured posts:', error);
      return [];
    }
  }

  // Get recent posts
  static async getRecentPosts(numPosts = 5) {
    try {
      console.log(`Getting ${numPosts} recent posts`);
      const q = firestoreQuery(
          collection(db, collections.posts),
          where('status', '==', 'published'),
          orderBy('publishDate', 'desc'),
          firestoreLimit(numPosts)
      );

      const querySnapshot = await getDocs(q);
      const posts = [];

      querySnapshot.forEach((doc) => {
        posts.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`Found ${posts.length} recent posts`);
      return posts;
    } catch (error) {
      console.error('Error getting recent posts:', error);
      return [];
    }
  }

  // Update post views
  static async incrementViews(postId) {
    try {
      const postRef = doc(db, collections.posts, postId);
      await updateDoc(postRef, {
        views: increment(1)
      });
    } catch (error) {
      console.error('Error incrementing views:', error);
    }
  }

  // Calculate read time
  static calculateReadTime(content) {
    const wordsPerMinute = 200;
    // Remove HTML tags for accurate word count
    const textOnly = content.replace(/<[^>]*>?/gm, '');
    const words = textOnly.trim().split(/\s+/).length;
    const readTime = Math.max(1, Math.ceil(words / wordsPerMinute));
    return readTime;
  }

  // Generate excerpt from content
  static generateExcerpt(content, maxLength = 150) {
    // Remove HTML tags
    const textOnly = content.replace(/<[^>]*>?/gm, '');

    // Trim to max length
    let excerpt = textOnly.trim().substring(0, maxLength);

    // Don't cut in the middle of a word
    if (textOnly.length > maxLength) {
      const lastSpace = excerpt.lastIndexOf(' ');
      if (lastSpace > 0) {
        excerpt = excerpt.substring(0, lastSpace);
      }
      excerpt += '...';
    }

    return excerpt;
  }

  // Log activity for audit trails
  static async logActivity(action, description, relatedId = null) {
    try {
      await addDoc(collection(db, collections.activity), {
        action: action,
        description: description,
        relatedId: relatedId,
        timestamp: new Date(),
        // In a real app, you'd add the user who performed the action
        // userId: 'current-user-id'
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }
}

// Category Management
class CategoryManager {
  // Create a new category
  static async createCategory(categoryData) {
    try {
      console.log("Creating category:", categoryData.name);
      const docRef = await addDoc(collection(db, collections.categories), {
        name: categoryData.name,
        slug: categoryData.slug,
        description: categoryData.description,
        subcategories: categoryData.subcategories || [],
        postCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Log activity
      await PostManager.logActivity('category_created', `Category "${categoryData.name}" created`, docRef.id);

      console.log("Category created with ID:", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  // Update category
  static async updateCategory(categoryId, categoryData) {
    try {
      console.log("Updating category:", categoryId);
      const categoryRef = doc(db, collections.categories, categoryId);

      await updateDoc(categoryRef, {
        name: categoryData.name,
        slug: categoryData.slug,
        description: categoryData.description,
        subcategories: categoryData.subcategories || [],
        updatedAt: new Date()
      });

      // Log activity
      await PostManager.logActivity('category_updated', `Category "${categoryData.name}" updated`, categoryId);

      console.log("Category updated successfully");
      return categoryId;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  // Delete category
  static async deleteCategory(categoryId) {
    try {
      console.log("Deleting category:", categoryId);
      // Get category data before deletion
      const categoryRef = doc(db, collections.categories, categoryId);
      const categorySnap = await getDoc(categoryRef);

      if (!categorySnap.exists()) {
        throw new Error('Category not found');
      }

      const categoryData = categorySnap.data();

      // Delete the category
      await deleteDoc(categoryRef);

      // Log activity
      await PostManager.logActivity('category_deleted', `Category "${categoryData.name}" deleted`, categoryId);

      console.log("Category deleted successfully");
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  // Get all categories
  static async getCategories() {
    try {
      const querySnapshot = await getDocs(collection(db, collections.categories));
      const categories = [];

      querySnapshot.forEach((doc) => {
        categories.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return categories;
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  // Get a single category by ID
  static async getCategory(categoryId) {
    try {
      console.log("Getting category by ID:", categoryId);
      const docRef = doc(db, collections.categories, categoryId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const category = {
          id: docSnap.id,
          ...docSnap.data()
        };

        console.log("Category retrieved successfully");
        return category;
      } else {
        throw new Error('Category not found');
      }
    } catch (error) {
      console.error('Error getting category:', error);
      throw error;
    }
  }

  // Get a category by slug
  static async getCategoryBySlug(slug) {
    try {
      console.log("Getting category by slug:", slug);
      const q = firestoreQuery(
          collection(db, collections.categories),
          where('slug', '==', slug)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('Category not found');
      }

      const category = {
        id: querySnapshot.docs[0].id,
        ...querySnapshot.docs[0].data()
      };

      console.log("Category retrieved successfully");
      return category;
    } catch (error) {
      console.error('Error getting category by slug:', error);
      throw error;
    }
  }

  // Add subcategory to a category
  static async addSubcategory(categoryId, subcategoryData) {
    try {
      console.log("Adding subcategory to category:", categoryId);
      const categoryRef = doc(db, collections.categories, categoryId);
      const categorySnap = await getDoc(categoryRef);

      if (!categorySnap.exists()) {
        throw new Error('Category not found');
      }

      const category = categorySnap.data();
      const subcategories = category.subcategories || [];

      // Check if subcategory already exists
      if (subcategories.some(sub => sub.slug === subcategoryData.slug)) {
        throw new Error('Subcategory with this slug already exists');
      }

      // Add new subcategory
      subcategories.push({
        name: subcategoryData.name,
        slug: subcategoryData.slug,
        description: subcategoryData.description || ''
      });

      // Update category
      await updateDoc(categoryRef, {
        subcategories: subcategories,
        updatedAt: new Date()
      });

      // Log activity
      await PostManager.logActivity('subcategory_added',
          `Subcategory "${subcategoryData.name}" added to "${category.name}"`,
          categoryId);

      console.log("Subcategory added successfully");
      return true;
    } catch (error) {
      console.error('Error adding subcategory:', error);
      throw error;
    }
  }

  // Remove subcategory from a category
  static async removeSubcategory(categoryId, subcategorySlug) {
    try {
      console.log("Removing subcategory from category:", categoryId);
      const categoryRef = doc(db, collections.categories, categoryId);
      const categorySnap = await getDoc(categoryRef);

      if (!categorySnap.exists()) {
        throw new Error('Category not found');
      }

      const category = categorySnap.data();
      const subcategories = category.subcategories || [];

      // Find subcategory
      const subcategory = subcategories.find(sub => sub.slug === subcategorySlug);
      if (!subcategory) {
        throw new Error('Subcategory not found');
      }

      // Remove subcategory
      const updatedSubcategories = subcategories.filter(sub => sub.slug !== subcategorySlug);

      // Update category
      await updateDoc(categoryRef, {
        subcategories: updatedSubcategories,
        updatedAt: new Date()
      });

      // Log activity
      await PostManager.logActivity('subcategory_removed',
          `Subcategory "${subcategory.name}" removed from "${category.name}"`,
          categoryId);

      console.log("Subcategory removed successfully");
      return true;
    } catch (error) {
      console.error('Error removing subcategory:', error);
      throw error;
    }
  }
}

// Comment Management
class CommentManager {
  // Add a comment to a post
  static async addComment(commentData) {
    try {
      console.log("Adding comment to post:", commentData.postId);
      const comment = {
        postId: commentData.postId,
        authorName: commentData.authorName,
        authorEmail: commentData.authorEmail,
        authorWebsite: commentData.authorWebsite,
        content: commentData.content,
        parentCommentId: commentData.parentCommentId || null,
        approved: false,
        createdAt: new Date()
      };

      const docRef = await addDoc(collection(db, collections.comments), comment);

      // Log activity
      await PostManager.logActivity('comment_added',
          `New comment by ${commentData.authorName} on post ID ${commentData.postId}`,
          docRef.id);

      console.log("Comment added with ID:", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  // Get comments for a post
  static async getCommentsByPost(postId, includeUnapproved = false) {
    try {
      console.log("Getting comments for post:", postId);
      let constraints = [
        where('postId', '==', postId),
        orderBy('createdAt', 'desc')
      ];

      if (!includeUnapproved) {
        constraints.push(where('approved', '==', true));
      }

      const q = firestoreQuery(
          collection(db, collections.comments),
          ...constraints
      );

      const querySnapshot = await getDocs(q);
      const comments = [];

      querySnapshot.forEach((doc) => {
        comments.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`Found ${comments.length} comments for post`);
      return comments;
    } catch (error) {
      console.error('Error getting comments:', error);
      return [];
    }
  }

  // Get all pending comments
  static async getPendingComments() {
    try {
      console.log("Getting pending comments");
      const q = firestoreQuery(
          collection(db, collections.comments),
          where('approved', '==', false),
          orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const comments = [];

      querySnapshot.forEach((doc) => {
        comments.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`Found ${comments.length} pending comments`);
      return comments;
    } catch (error) {
      console.error('Error getting pending comments:', error);
      return [];
    }
  }

  // Approve a comment
  static async approveComment(commentId) {
    try {
      console.log("Approving comment:", commentId);
      const commentRef = doc(db, collections.comments, commentId);

      await updateDoc(commentRef, {
        approved: true,
        approvedAt: new Date()
      });

      // Log activity
      await PostManager.logActivity('comment_approved', `Comment ID ${commentId} approved`, commentId);

      console.log("Comment approved successfully");
      return true;
    } catch (error) {
      console.error('Error approving comment:', error);
      throw error;
    }
  }

  // Delete a comment
  static async deleteComment(commentId) {
    try {
      console.log("Deleting comment:", commentId);
      const commentRef = doc(db, collections.comments, commentId);

      await deleteDoc(commentRef);

      // Log activity
      await PostManager.logActivity('comment_deleted', `Comment ID ${commentId} deleted`, commentId);

      console.log("Comment deleted successfully");
      return true;
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }
}

// Newsletter Management
class NewsletterManager {
  // Subscribe to newsletter
  static async subscribe(email) {
    try {
      console.log("Subscribing email to newsletter:", email);
      // Check if email already exists
      const q = firestoreQuery(
          collection(db, collections.newsletter),
          where('email', '==', email)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        throw new Error('Email already subscribed');
      }

      const docRef = await addDoc(collection(db, collections.newsletter), {
        email: email,
        subscribedAt: new Date(),
        status: 'active'
      });

      // Log activity
      await PostManager.logActivity('newsletter_subscription', `New subscription: ${email}`, docRef.id);

      console.log("Email subscribed successfully");
      return docRef.id;
    } catch (error) {
      console.error('Error subscribing to newsletter:', error);
      throw error;
    }
  }

  // Unsubscribe from newsletter
  static async unsubscribe(email) {
    try {
      console.log("Unsubscribing email from newsletter:", email);
      // Find the subscription
      const q = firestoreQuery(
          collection(db, collections.newsletter),
          where('email', '==', email)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('Email not found in subscription list');
      }

      // Update status to unsubscribed
      const subscriberDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, collections.newsletter, subscriberDoc.id), {
        status: 'unsubscribed',
        unsubscribedAt: new Date()
      });

      // Log activity
      await PostManager.logActivity('newsletter_unsubscription', `Unsubscribed: ${email}`, subscriberDoc.id);

      console.log("Email unsubscribed successfully");
      return true;
    } catch (error) {
      console.error('Error unsubscribing from newsletter:', error);
      throw error;
    }
  }

  // Get all newsletter subscribers
  static async getSubscribers(onlyActive = true) {
    try {
      console.log("Getting newsletter subscribers");
      let constraints = [];

      if (onlyActive) {
        constraints.push(where('status', '==', 'active'));
      }

      constraints.push(orderBy('subscribedAt', 'desc'));

      const q = firestoreQuery(
          collection(db, collections.newsletter),
          ...constraints
      );

      const querySnapshot = await getDocs(q);
      const subscribers = [];

      querySnapshot.forEach((doc) => {
        subscribers.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`Found ${subscribers.length} subscribers`);
      return subscribers;
    } catch (error) {
      console.error('Error getting subscribers:', error);
      return [];
    }
  }
}

// Activity Management
class ActivityManager {
  // Get recent activity
  static async getRecentActivity(limit = 10) {
    try {
      console.log(`Getting ${limit} recent activities`);
      const q = firestoreQuery(
          collection(db, collections.activity),
          orderBy('timestamp', 'desc'),
          firestoreLimit(limit)
      );

      const querySnapshot = await getDocs(q);
      const activities = [];

      querySnapshot.forEach((doc) => {
        activities.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`Found ${activities.length} activities`);
      return activities;
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  }
}

export {
  PostManager,
  CategoryManager,
  CommentManager,
  NewsletterManager,
  ActivityManager
};