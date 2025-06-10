import { Express, Request, Response } from 'express';
import { db } from '../db';
import { blogPosts, saasAdmins } from '../../shared/schema';
import { eq, desc, count, sql, and } from 'drizzle-orm';

export function setupSaasBlogRoutes(app: Express, { isSaasAdminAuthenticated, requireSaasAdminRole }: any) {
  console.log('Setting up SaaS Blog Management routes...');

  // =============================================================================
  // Blog Post Management (SaaS Admin Only)
  // =============================================================================

  // Get all blog posts (including drafts)
  app.get('/api/saas-admin/blog-posts', isSaasAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;

      let baseQuery = db
        .select({
          id: blogPosts.id,
          title: blogPosts.title,
          slug: blogPosts.slug,
          status: blogPosts.status,
          featuredImageUrl: blogPosts.featuredImageUrl,
          publishedAt: blogPosts.publishedAt,
          createdAt: blogPosts.createdAt,
          updatedAt: blogPosts.updatedAt,
          authorName: saasAdmins.displayName,
          seoTitle: blogPosts.seoTitle,
        })
        .from(blogPosts)
        .leftJoin(saasAdmins, eq(blogPosts.authorId, saasAdmins.id));

      if (status) {
        baseQuery = baseQuery.where(eq(blogPosts.status, status)) as any;
      }

      const posts = await baseQuery
        .orderBy(desc(blogPosts.updatedAt))
        .limit(limit)
        .offset((page - 1) * limit);

      // Get total count
      const totalQuery = db.select({ count: count() }).from(blogPosts);
      const total = await totalQuery;

      res.json({
        posts,
        pagination: {
          page,
          limit,
          total: total[0]?.count || 0,
          pages: Math.ceil((total[0]?.count || 0) / limit),
        }
      });
    } catch (error) {
      console.error('Blog posts list error:', error);
      res.status(500).json({ message: 'Failed to fetch blog posts' });
    }
  });

  // Get single blog post by ID
  app.get('/api/saas-admin/blog-posts/:postId', isSaasAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.postId);

      const post = await db
        .select({
          id: blogPosts.id,
          title: blogPosts.title,
          slug: blogPosts.slug,
          content: blogPosts.content,
          status: blogPosts.status,
          featuredImageUrl: blogPosts.featuredImageUrl,
          seoTitle: blogPosts.seoTitle,
          seoDescription: blogPosts.seoDescription,
          publishedAt: blogPosts.publishedAt,
          createdAt: blogPosts.createdAt,
          updatedAt: blogPosts.updatedAt,
          authorId: blogPosts.authorId,
          authorName: saasAdmins.displayName,
        })
        .from(blogPosts)
        .leftJoin(saasAdmins, eq(blogPosts.authorId, saasAdmins.id))
        .where(eq(blogPosts.id, postId))
        .limit(1);

      if (!post.length) {
        return res.status(404).json({ message: 'Blog post not found' });
      }

      res.json({ post: post[0] });
    } catch (error) {
      console.error('Blog post details error:', error);
      res.status(500).json({ message: 'Failed to fetch blog post' });
    }
  });

  // Create new blog post
  app.post('/api/saas-admin/blog-posts', isSaasAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const { title, content, status, featuredImageUrl, seoTitle, seoDescription } = req.body;
      const authorId = (req.user as any).id;

      // Generate slug from title if not provided
      let slug = req.body.slug;
      if (!slug) {
        slug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        
        // Ensure slug is unique
        const existingPost = await db
          .select({ id: blogPosts.id })
          .from(blogPosts)
          .where(eq(blogPosts.slug, slug))
          .limit(1);

        if (existingPost.length > 0) {
          slug = `${slug}-${Date.now()}`;
        }
      }

      const publishedAt = status === 'published' ? new Date() : null;

      const newPost = await db
        .insert(blogPosts)
        .values({
          title,
          slug,
          content,
          authorId,
          status: status || 'draft',
          featuredImageUrl,
          seoTitle,
          seoDescription,
          publishedAt,
        })
        .returning();

      res.status(201).json({ post: newPost[0] });
    } catch (error) {
      console.error('Create blog post error:', error);
      res.status(500).json({ message: 'Failed to create blog post' });
    }
  });

  // Update blog post
  app.put('/api/saas-admin/blog-posts/:postId', isSaasAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.postId);
      const { title, slug, content, status, featuredImageUrl, seoTitle, seoDescription } = req.body;

      // Get current post to check status change
      const currentPost = await db
        .select({ status: blogPosts.status, publishedAt: blogPosts.publishedAt })
        .from(blogPosts)
        .where(eq(blogPosts.id, postId))
        .limit(1);

      if (!currentPost.length) {
        return res.status(404).json({ message: 'Blog post not found' });
      }

      // Set publishedAt if transitioning to published
      let publishedAt = currentPost[0].publishedAt;
      if (status === 'published' && currentPost[0].status !== 'published') {
        publishedAt = new Date();
      } else if (status !== 'published') {
        publishedAt = null;
      }

      await db
        .update(blogPosts)
        .set({
          title,
          slug,
          content,
          status,
          featuredImageUrl,
          seoTitle,
          seoDescription,
          publishedAt,
          updatedAt: new Date(),
        })
        .where(eq(blogPosts.id, postId));

      res.json({ message: 'Blog post updated successfully' });
    } catch (error) {
      console.error('Update blog post error:', error);
      res.status(500).json({ message: 'Failed to update blog post' });
    }
  });

  // Delete blog post
  app.delete('/api/saas-admin/blog-posts/:postId', requireSaasAdminRole(['owner']), async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.postId);

      const deleted = await db
        .delete(blogPosts)
        .where(eq(blogPosts.id, postId))
        .returning();

      if (!deleted.length) {
        return res.status(404).json({ message: 'Blog post not found' });
      }

      res.json({ message: 'Blog post deleted successfully' });
    } catch (error) {
      console.error('Delete blog post error:', error);
      res.status(500).json({ message: 'Failed to delete blog post' });
    }
  });

  // Bulk update blog post statuses
  app.patch('/api/saas-admin/blog-posts/bulk-status', requireSaasAdminRole(['owner']), async (req: Request, res: Response) => {
    try {
      const { postIds, status } = req.body;

      if (!Array.isArray(postIds) || postIds.length === 0) {
        return res.status(400).json({ message: 'Post IDs array is required' });
      }

      if (!['draft', 'published', 'archived'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      const publishedAt = status === 'published' ? new Date() : null;

      await db
        .update(blogPosts)
        .set({
          status,
          publishedAt,
          updatedAt: new Date(),
        })
        .where(sql`id = ANY(${postIds})`);

      res.json({ message: `Updated ${postIds.length} blog posts to ${status}` });
    } catch (error) {
      console.error('Bulk update blog posts error:', error);
      res.status(500).json({ message: 'Failed to update blog posts' });
    }
  });

  // Generate and validate slug
  app.post('/api/saas-admin/blog-posts/validate-slug', isSaasAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const { title, currentPostId } = req.body;
      
      let slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Check if slug exists (excluding current post if editing)
      let query = db
        .select({ id: blogPosts.id })
        .from(blogPosts)
        .where(eq(blogPosts.slug, slug));

      if (currentPostId) {
        query = query.where(sql`id != ${currentPostId}`) as any;
      }

      const existingPost = await query.limit(1);

      if (existingPost.length > 0) {
        slug = `${slug}-${Date.now()}`;
      }

      res.json({ 
        slug,
        isUnique: existingPost.length === 0,
      });
    } catch (error) {
      console.error('Validate slug error:', error);
      res.status(500).json({ message: 'Failed to validate slug' });
    }
  });

  console.log('SaaS Blog Management routes registered successfully');
}