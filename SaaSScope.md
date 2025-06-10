# SaaS Scope & Architecture Document (SaaSScope.md)

**Project:** FirmRix - Accounting Firm Practice Management Solution
**Version:** 1.0
**Date:** 2024-12-16
**Purpose:** This document serves as the master blueprint for developing the SaaS-level infrastructure on top of the existing multi-tenant application. It defines the architecture and features for the SaaS Admin Portal and the public-facing Marketing Website. It is the constant reference for all AI-driven development to ensure consistency, isolation, and strategic alignment.

---

## Part I: Core Principles & Architecture

### 1. Guiding Philosophy

-   **Tenant Sanctity:** The core multi-tenant application is stable and functional. All new SaaS-level development MUST NOT interfere with its operation. Tenant data is sacred and is to be treated as read-only from the SaaS Admin layer, except for metadata and subscription status.
-   **Strict Isolation:** The SaaS Admin Portal and the Tenant Application must be logically and, where possible, physically separate. This includes separate authentication systems, dedicated database tables for SaaS data, and segregated API endpoints.
-   **Scalability:** The architecture must support growth from tens to thousands of tenants without significant rework.
-   **Data-Driven Control:** The SaaS owner must have all the tools and analytics necessary to manage tenants, control billing, and make informed business decisions.

### 2. High-Level Architecture

The system will be composed of three primary components:
1.  **Tenant Application (Existing):** The core multi-tenant platform used by accounting firms.
2.  **SaaS Admin Portal (New):** A secure, isolated portal for the business owner to manage the entire platform.
3.  **Marketing Website (New):** A public-facing, SEO-optimized website to attract and convert new customers, with content dynamically managed from the SaaS Admin Portal.

### 3. Database & API Isolation Strategy

-   **Database Schema:**
    -   **SaaS-Level Tables:** New tables will be created to manage the SaaS business logic. These tables will **NOT** have a `tenant_id` column.
        -   `saas_admins` (id, email, password_hash, role, etc.)
        -   `tenants` (id, company_name, primary_admin_user_id, status, created_at, trial_ends_at, subscription_id) - This is the central link.
        -   `packages` (id, name, description, monthly_price, annual_price, limits_json, is_active, is_publicly_visible)
        -   `subscriptions` (id, tenant_id, package_id, status, current_period_end, stripe_subscription_id)
        -   `coupons` (id, code, discount_type, value, duration, is_active)
        -   `blog_posts` (id, title, slug, content, author_id, status, featured_image_url, seo_title, seo_description)
    -   **Tenant-Level Tables (Existing):** All existing tables (`users`, `clients`, `tasks`, etc.) will continue to use `tenant_id` for data isolation. The `tenant_id` in these tables is a foreign key to the new `tenants.id` table.
-   **API Segregation:**
    -   **Tenant API:** ` /api/v1/*` (Existing) - Protected by tenant user authentication.
    -   **SaaS Admin API:** ` /api/saas-admin/*` (New) - Protected by `saas_admin` authentication.
    -   **Public API:** ` /api/public/*` (New) - Unauthenticated endpoints to fetch public data for the marketing site (e.g., publicly visible packages, blog posts).

---

## Part II: SaaS Admin Portal ("Control Tower")

### 1. Authentication & Security

-   **Login:** A dedicated login page for SaaS administrators (`/saas-admin/login`).
-   **User Table:** Uses the `saas_admins` table. No connection to the tenant `users` table.
-   **Permissions:** (Future) Role-based access for SaaS admins (e.g., Owner, Support, Finance). Initially, a single "Owner" role is sufficient.
-   **Impersonation:** This is a critical and dangerous feature.
    -   **Action:** `POST /api/saas-admin/tenants/:tenantId/impersonate`
    -   **Mechanism:** Generate a short-lived, single-use token. Redirect the admin to the tenant application's login with this token. The tenant app's auth system must have a way to validate this special token, create a temporary session for the specified tenant's SuperAdmin, and attach the `impersonating_by_saas_admin_id` to the session.
    -   **UI:** The tenant application UI MUST display a persistent, highly visible banner (e.g., "You are currently impersonating [Tenant Name]. Actions are being logged. [End Impersonation]").
    -   **Auditing:** Every impersonation session start and end MUST be logged in a dedicated audit table.

### 2. Feature: Tenant Management

-   **Dashboard:**
    -   **KPIs:** Implement cards for: Total Tenants, Active Trials, MRR (Monthly Recurring Revenue), Churn Rate (last 30 days), and New Sign-ups (last 30 days).
    -   **Visuals:** A line chart showing tenant growth over time. A list of the 5 most recently created tenants.
-   **Tenant Directory:**
    -   **API:** `GET /api/saas-admin/tenants` (with pagination, search, sort, filter).
    -   **UI:** A TanStack Table component displaying all tenants.
    -   **Actions:** Each row should have a "View Details" action.
-   **Detailed Tenant View:**
    -   **API:** `GET /api/saas-admin/tenants/:tenantId`
    -   **UI:** A tabbed interface.
        -   **Overview:** Displays static info and key usage metrics (User Count, Entity Count, Task Count). These metrics should be calculated via performant read-only queries on the tenant tables.
        -   **Subscription & Billing:** Manages the tenant's package (`PUT /api/saas-admin/tenants/:tenantId/subscription`), shows billing history from Stripe, and provides a button to access the Stripe Customer Portal.
        -   **Actions:** Buttons for "Suspend," "Unsuspend," "Impersonate," and "Cancel Subscription." Each action hits a specific, secure API endpoint.

### 3. Feature: Billing & Package Management

-   **Package Manager:**
    -   **API:** Full CRUD at ` /api/saas-admin/packages`.
    -   **UI:** A form to create/edit packages. It must include fields for name, price, and a JSON editor or dynamic form fields to define the limits (e.g., `{ "maxUsers": 5, "maxEntities": 50, "modules": ["Tasks", "Finance"], "aiAccess": false }`). Also include a toggle for "Visible on Pricing Page."
-   **Usage-Based Pricing:**
    -   **API:** `PUT /api/saas-admin/settings/usage-pricing`
    -   **UI:** A settings page with input fields for "Price per User/Month," "Price per Entity/Month."
-   **Billing Logic:**
    -   **For Packages:** A scheduled job (e.g., nightly cron) or webhook from Stripe will handle recurring billing.
    -   **For Usage-Based:** A scheduled job must run at the end of each billing cycle. It will:
        1.  Query tenant tables to count active users and entities for that tenant.
        2.  Calculate the total bill based on the configured usage rates.
        3.  Use the Stripe API to create an invoice for the tenant with the calculated line items.

### 4. Feature: Platform Content Management

-   **Blog Manager:**
    -   **API:** Full CRUD at ` /api/saas-admin/blog-posts`. The `create` and `update` endpoints should auto-generate a URL-friendly `slug` from the title if one is not provided.
    -   **UI:** A list of all blog posts with edit/delete actions. The editor should be a rich-text editor (e.g., TipTap, TinyMCE) and include fields for SEO Title and Meta Description.
-   **Pricing Page Manager:**
    -   This is primarily handled by the "Visible on Pricing Page" toggle within the Package Manager. The public pricing page will fetch only the visible packages.

---

## Part III: Marketing Website

### 1. Goal & Strategy

-   The primary goal is **conversion** (driving free trial sign-ups). The secondary goal is to build **authority and organic traffic** through SEO and content marketing.
-   The website must be fast, mobile-friendly, and professionally designed.

### 2. Technology Stack

-   **Framework:** Next.js (recommended for its balance of static site generation, server-side rendering, and excellent SEO capabilities).
-   **Styling:** Tailwind CSS for utility-first styling.
-   **Deployment:** Vercel or Netlify for easy, fast deployments.
-   **Data Source:** This website is a "headless" client. It will fetch all dynamic content (packages, blog posts) from the new `/api/public/*` endpoints of the main application.

### 3. Page & Content Blueprints

-   **Homepage:**
    -   **Hero:** Strong, benefit-oriented headline. e.g., "Stop Juggling Spreadsheets. Start Automating Your Firm." Sub-headline: "The all-in-one practice management platform with built-in AI to help you work smarter, not harder." CTA: "Start Your Free 14-Day Trial".
    -   **USPs (Unique Selling Propositions):** Focus on what makes you different.
        -   **"True Workflow Automation:"** Go beyond simple recurring tasks.
        -   **"Integrated AI Co-pilot:"** Get suggestions, not just data entry.
        -   **"Seamless Client Portal:"** Impress your clients with transparency.
        -   **"All-in-One, No Add-ons:"** One price for everything you need to run your practice.
-   **Pricing Page:**
    -   **API:** `GET /api/public/packages`
    -   **UI:** A toggle for "Billed Monthly / Billed Annually (Save 20%)". A clear comparison table showing features included in each package. A dedicated section explaining the "Pay-as-you-go" custom plan.
-   **Blog:**
    -   **API:** `GET /api/public/blog-posts` for the list, `GET /api/public/blog-posts/:slug` for a single post.
    -   **SEO:** Each blog post page must use the `seo_title` and `seo_description` from the database for its `<title>` and `<meta name="description">` tags. The page's canonical URL should be set correctly.
-   **Sign-up Flow:**
    -   The "Start Trial" button on the marketing site will link to the registration page of the main Tenant Application (e.g., `app.yourdomain.com/register`).
    -   The registration form will create a new record in the `tenants` table, create the SuperAdmin user in the `users` table, and create a trial subscription in the `subscriptions` table.
