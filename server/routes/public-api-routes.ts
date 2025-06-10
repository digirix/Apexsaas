import { Express, Request, Response } from 'express';
import { db } from '../db';
import { packages, blogPosts, saasAdmins } from '../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';

export function setupPublicApiRoutes(app: Express) {
  console.log('Setting up Public API routes...');

  // =============================================================================
  // Public Package Information (for pricing page)
  // =============================================================================

  // Get publicly visible packages
  app.get('/api/public/packages', async (req: Request, res: Response) => {
    try {
      const publicPackages = await db
        .select({
          id: packages.id,
          name: packages.name,
          description: packages.description,
          monthlyPrice: packages.monthlyPrice,
          annualPrice: packages.annualPrice,
          limitsJson: packages.limitsJson,
        })
        .from(packages)
        .where(and(
          eq(packages.isActive, true),
          eq(packages.isPubliclyVisible, true)
        ))
        .orderBy(packages.monthlyPrice);

      // Calculate annual savings percentage
      const packagesWithSavings = publicPackages.map(pkg => {
        let annualSavings = 0;
        if (pkg.monthlyPrice && pkg.annualPrice) {
          const monthlyTotal = parseFloat(pkg.monthlyPrice) * 12;
          const annualPrice = parseFloat(pkg.annualPrice);
          annualSavings = Math.round(((monthlyTotal - annualPrice) / monthlyTotal) * 100);
        }
        
        return {
          ...pkg,
          annualSavings,
        };
      });

      res.json({ packages: packagesWithSavings });
    } catch (error) {
      console.error('Public packages error:', error);
      res.status(500).json({ message: 'Failed to fetch packages' });
    }
  });

  // =============================================================================
  // Public Blog Content
  // =============================================================================

  // Get published blog posts
  app.get('/api/public/blog-posts', async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const featured = req.query.featured === 'true';

      let query = db
        .select({
          id: blogPosts.id,
          title: blogPosts.title,
          slug: blogPosts.slug,
          content: blogPosts.content,
          featuredImageUrl: blogPosts.featuredImageUrl,
          seoTitle: blogPosts.seoTitle,
          seoDescription: blogPosts.seoDescription,
          publishedAt: blogPosts.publishedAt,
          authorName: saasAdmins.displayName,
        })
        .from(blogPosts)
        .leftJoin(saasAdmins, eq(blogPosts.authorId, saasAdmins.id))
        .where(eq(blogPosts.status, 'published'));

      if (featured) {
        query = query.where(and(
          eq(blogPosts.status, 'published'),
          // Add featured logic here if needed
        ));
      }

      const posts = await query
        .orderBy(desc(blogPosts.publishedAt))
        .limit(limit)
        .offset((page - 1) * limit);

      // For list view, truncate content to excerpt
      const postsWithExcerpts = posts.map(post => ({
        ...post,
        excerpt: post.content ? post.content.substring(0, 200) + '...' : '',
        content: undefined, // Remove full content from list view
      }));

      res.json({ 
        posts: postsWithExcerpts,
        pagination: {
          page,
          limit,
          hasMore: posts.length === limit,
        }
      });
    } catch (error) {
      console.error('Public blog posts error:', error);
      res.status(500).json({ message: 'Failed to fetch blog posts' });
    }
  });

  // Get single blog post by slug
  app.get('/api/public/blog-posts/:slug', async (req: Request, res: Response) => {
    try {
      const slug = req.params.slug;

      const post = await db
        .select({
          id: blogPosts.id,
          title: blogPosts.title,
          slug: blogPosts.slug,
          content: blogPosts.content,
          featuredImageUrl: blogPosts.featuredImageUrl,
          seoTitle: blogPosts.seoTitle,
          seoDescription: blogPosts.seoDescription,
          publishedAt: blogPosts.publishedAt,
          authorName: saasAdmins.displayName,
          authorEmail: saasAdmins.email,
        })
        .from(blogPosts)
        .leftJoin(saasAdmins, eq(blogPosts.authorId, saasAdmins.id))
        .where(and(
          eq(blogPosts.slug, slug),
          eq(blogPosts.status, 'published')
        ))
        .limit(1);

      if (!post.length) {
        return res.status(404).json({ message: 'Blog post not found' });
      }

      res.json({ post: post[0] });
    } catch (error) {
      console.error('Public blog post error:', error);
      res.status(500).json({ message: 'Failed to fetch blog post' });
    }
  });

  // =============================================================================
  // Public Company Information
  // =============================================================================

  // Get basic company/platform information
  app.get('/api/public/platform-info', async (req: Request, res: Response) => {
    try {
      // This could be expanded to include dynamic platform information
      // For now, return static information that could be made configurable
      const platformInfo = {
        name: 'FirmRix',
        tagline: 'Stop Juggling Spreadsheets. Start Automating Your Firm.',
        description: 'The all-in-one practice management platform with built-in AI to help you work smarter, not harder.',
        features: [
          {
            title: 'True Workflow Automation',
            description: 'Go beyond simple recurring tasks with intelligent automation that adapts to your firm\'s unique processes.',
          },
          {
            title: 'Integrated AI Co-pilot',
            description: 'Get intelligent suggestions and insights, not just data entry. Our AI helps you make better decisions faster.',
          },
          {
            title: 'Seamless Client Portal',
            description: 'Impress your clients with transparency and real-time access to their financial information and progress.',
          },
          {
            title: 'All-in-One, No Add-ons',
            description: 'One comprehensive price for everything you need to run your practice. No hidden fees or surprise charges.',
          },
        ],
        trialDays: 14,
        supportEmail: 'support@firmrix.com',
        salesEmail: 'sales@firmrix.com',
      };

      res.json(platformInfo);
    } catch (error) {
      console.error('Platform info error:', error);
      res.status(500).json({ message: 'Failed to fetch platform information' });
    }
  });

  // =============================================================================
  // SEO and Metadata
  // =============================================================================

  // Get SEO sitemap data
  app.get('/api/public/sitemap', async (req: Request, res: Response) => {
    try {
      // Get all published blog posts for sitemap
      const publishedPosts = await db
        .select({
          slug: blogPosts.slug,
          updatedAt: blogPosts.updatedAt,
          publishedAt: blogPosts.publishedAt,
        })
        .from(blogPosts)
        .where(eq(blogPosts.status, 'published'))
        .orderBy(desc(blogPosts.publishedAt));

      const sitemapData = {
        staticPages: [
          { path: '/', lastmod: new Date().toISOString(), priority: 1.0 },
          { path: '/pricing', lastmod: new Date().toISOString(), priority: 0.9 },
          { path: '/blog', lastmod: new Date().toISOString(), priority: 0.8 },
          { path: '/contact', lastmod: new Date().toISOString(), priority: 0.7 },
        ],
        blogPosts: publishedPosts.map(post => ({
          path: `/blog/${post.slug}`,
          lastmod: (post.updatedAt || post.publishedAt || new Date()).toISOString(),
          priority: 0.6,
        })),
      };

      res.json(sitemapData);
    } catch (error) {
      console.error('Sitemap error:', error);
      res.status(500).json({ message: 'Failed to generate sitemap data' });
    }
  });

  console.log('Public API routes registered successfully');
}