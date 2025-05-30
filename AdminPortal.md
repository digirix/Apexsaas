# Admin Portal Documentation

## Overview

The Admin Portal is a comprehensive multi-tenant accounting management platform designed for enterprise-level client management, financial operations, and workflow automation. It provides deep, interactive insights and streamlined financial workflows with advanced security, role-based access controls, and intelligent automation capabilities.

---

## 🔐 Authentication & User Management

### Multi-Tenant Authentication System
- **Session-Based Authentication**: Secure login with Passport.js and express-session
- **Multi-Tenant Isolation**: Complete data separation between tenants
- **Role-Based Access Control**: 14 modules with granular CRUD permissions
- **SuperAdmin Capabilities**: Tenant-wide administrative privileges

### User Management Features
- **Team Management**: Add, edit, and manage team members
- **Designation & Department Setup**: Organizational structure configuration
- **Permission Management**: Visual interface with color-coded permission badges
- **Profile Management**: User profile updates and password management
- **Advanced Security**: Self-permission protection and SuperAdmin bypass logic

### Database Schema
```sql
-- Core User Tables
users (id, tenant_id, username, email, display_name, designation_id, department_id, is_super_admin, is_active)
user_permissions (id, tenant_id, user_id, module, access_level, can_create, can_read, can_update, can_delete)
designations (id, tenant_id, name)
departments (id, tenant_id, name)
```

---

## 📊 Dashboard & Analytics

### Executive Dashboard
The main dashboard provides comprehensive business insights:

#### Key Performance Indicators
- **Client Metrics**: Total clients and growth trends
- **Task Performance**: Status distribution and completion rates
- **Financial Overview**: Revenue tracking and payment status
- **Compliance Monitoring**: Upcoming deadlines and overdue items

#### Interactive Charts
- **Task Status Distribution**: Pie chart showing New, In Progress, Completed, Overdue tasks
- **Monthly Revenue Trends**: Line chart tracking financial performance
- **Client Distribution**: Geographic breakdown of client base
- **Service Utilization**: Analysis of most requested services

#### Real-Time Data Integration
```javascript
// Live dashboard data fetching
const { data: clients = [] } = useQuery({
  queryKey: ["/api/v1/clients"],
});

const { data: tasks = [] } = useQuery({
  queryKey: ["/api/v1/tasks"],
});

const { data: invoices = [] } = useQuery({
  queryKey: ["/api/v1/invoices"],
});
```

---

## 👥 Client Management System

### Comprehensive Client Operations
- **Full CRUD Operations**: Create, read, update, delete clients with validation
- **Contact Information Management**: Complete client profile with communication details
- **Hybrid Views**: Toggle between table and card views with advanced filtering
- **Advanced Search**: Multi-criteria search with pagination

### Entity Management
Each client can have multiple business entities with:

#### Entity Configuration
- **Country/State Selection**: Geographic jurisdiction setup
- **Entity Type Assignment**: Country-specific business structure classification
- **Tax Registration**: Business Tax ID and VAT/Sales Tax registration
- **Document Management**: File access links and WhatsApp group integration

#### Service Subscription System
Two-tier service management:
- **Required Services**: Mandatory services based on entity type and jurisdiction
- **Subscribed Services**: Active service subscriptions with billing configuration
- **Multi-Jurisdiction Support**: VAT/Sales Tax setup for multiple regions

### Database Integration
```sql
-- Client & Entity Schema
clients (id, tenant_id, display_name, email, status, contact_person, phone, address)
entities (id, tenant_id, client_id, name, country_id, state_id, entity_type_id, business_tax_id, is_vat_registered, vat_id)
entity_service_subscriptions (id, tenant_id, entity_id, service_type_id, is_required, is_subscribed)
entity_tax_jurisdictions (id, tenant_id, entity_id, tax_jurisdiction_id)
```

---

## ✅ Task & Workflow Management

### Manual Task Management
- **Task Creation**: Detailed task setup with categories, priorities, and assignments
- **Status Workflow**: Configurable task status transitions with validation rules
- **Assignment System**: User-based task assignment with notification integration
- **Due Date Tracking**: Calendar integration with deadline monitoring

### Auto-Generated Tasks Engine
Intelligent recurring task automation:

#### Recurring Task Features
- **Schedule-Based Generation**: Automatic task creation based on compliance calendars
- **Approval Workflow**: Admin review and approval of generated tasks
- **Bulk Operations**: Mass approval and rejection capabilities
- **Lead Time Management**: Configurable advance task creation

#### Configuration Management
```javascript
// Recurring task rule setup
const recurringTaskConfig = {
  serviceTypeId: serviceId,
  frequency: 'Monthly',
  leadTime: '7 days',
  autoApproval: false,
  assigneeId: defaultAssignee
};
```

### Compliance Calendar
- **Visual Calendar View**: Task and deadline visualization
- **Multi-Entity Support**: Compliance tracking across all client entities
- **Deadline Management**: Critical compliance date monitoring
- **Automatic Task Creation**: Integration with recurring task engine

---

## 💰 Finance Module

### Invoice Management
Complete invoice lifecycle management:

#### Invoice Creation & Processing
- **Task-Based Invoicing**: Direct invoice creation from completed tasks
- **Service Rate Integration**: Automatic pricing from service type configuration
- **Multi-Currency Support**: Currency handling based on entity location
- **Tax Calculations**: Automated tax computation based on jurisdiction

#### Payment Processing
- **Payment Recording**: Multiple payment method support
- **Payment Gateway Integration**: Stripe and other payment processors
- **Payment Tracking**: Status monitoring and reconciliation
- **Outstanding Balance Management**: Automated aging reports

### Chart of Accounts
Hierarchical accounting structure:

#### Four-Level Hierarchy
- **Main Groups**: Balance Sheet, Income Statement
- **Element Groups**: Assets, Liabilities, Equity, Revenues, Expenses
- **Sub-Element Groups**: Current Assets, Non-Current Assets, etc.
- **Detailed Groups**: Cash and Cash Equivalents, Accounts Receivable, etc.

#### Journal Entries
- **Manual Entry Creation**: Double-entry bookkeeping support
- **Automated Entries**: System-generated entries from invoices and payments
- **Entry Validation**: Balance verification and audit trails
- **Financial Reporting**: Real-time financial statement generation

### Financial Reports
- **Profit & Loss Statement**: Revenue and expense analysis
- **Balance Sheet**: Asset, liability, and equity reporting
- **Cash Flow Statement**: Cash movement tracking
- **Tax Summary Reports**: Tax liability and payment tracking
- **Custom Report Builder**: User-configurable financial analytics

---

## ⚙️ System Setup & Configuration

### Regional Configuration
- **Countries Management**: Global country database with currency assignments
- **States/Provinces**: Regional subdivision management
- **Currencies**: Multi-currency support with exchange rate handling
- **Time Zones**: Geographic time zone configuration

### Business Configuration
- **Entity Types**: Country-specific business structure definitions
- **Service Types**: Service offerings with pricing and billing basis
- **Tax Jurisdictions**: VAT/Sales Tax setup and management
- **Task Categories**: Categorization system for task organization

### Workflow Configuration
- **Task Status Setup**: Customizable task status definitions
- **Status Workflow Rules**: Transition validation and restrictions
- **Approval Workflows**: Multi-level approval process configuration
- **Notification Settings**: Communication preference management

---

## 🤖 AI & Automation Features

### AI Configuration & Integration
- **Provider Setup**: OpenAI and custom AI provider configuration
- **Model Selection**: Support for various AI models including GPT and Gemini
- **API Key Management**: Secure credential storage and validation
- **Usage Monitoring**: AI service consumption tracking

### AI-Powered Features
- **Interactive Chat Assistant**: Real-time AI assistance for users
- **Task Suggestions**: AI-powered task detail recommendations
- **Service Recommendations**: Intelligent service suggestions for entities
- **Query Processing**: Natural language query handling for database operations

### AI Reporting & Analytics
- **Automated Report Generation**: AI-generated financial insights
- **Data Analysis**: Pattern recognition and trend analysis
- **Business Intelligence**: Predictive analytics for business planning
- **Custom Query Processing**: AI-assisted database querying

---

## 🔄 Workflow Automation Engine

### Visual Workflow Builder
Drag-and-drop interface for workflow creation:

#### Trigger System
- **Webhook Triggers**: External system integration
- **Schedule Triggers**: Time-based automation
- **Database Change Triggers**: Data-driven workflow initiation
- **Form Submission Triggers**: User action-based workflows

#### Action Engine
- **HTTP Requests**: External API integration
- **Database Operations**: Automated data manipulation
- **Notification Actions**: User communication automation
- **Email Actions**: Automated email workflows

### Workflow Management
- **Template Gallery**: Pre-built workflow templates
- **Execution Logs**: Detailed workflow execution tracking
- **Real-time Testing**: Manual workflow testing capabilities
- **Performance Monitoring**: Workflow efficiency analytics

---

## 🔔 Notification System

### Real-Time Notification Engine
- **WebSocket Integration**: Instant notification delivery
- **Notification Types**: Task assignments, workflow alerts, system notifications
- **Severity Levels**: INFO, WARNING, CRITICAL, SUCCESS indicators
- **Deep Linking**: Navigation to related entities from notifications

### Notification Management
- **Notification Bell**: Header indicator with unread count
- **Dropdown Panel**: Recent notifications display
- **Mark as Read**: Individual and bulk read status management
- **Notification History**: Complete notification audit trail

---

## 🏗️ Database Architecture

### Core Database Schema
The system uses PostgreSQL with Drizzle ORM for type-safe database operations:

#### Multi-Tenant Structure
- **Tenant Isolation**: All tables include tenant_id for complete data separation
- **Foreign Key Relationships**: Comprehensive referential integrity
- **Indexed Queries**: Optimized database performance
- **Audit Trails**: Complete change tracking and history

#### Key Database Tables
```sql
-- Core Business Tables
tenants, tenant_settings, users, user_permissions
clients, entities, entity_service_subscriptions, entity_tax_jurisdictions
tasks, task_categories, task_statuses, task_status_workflow_rules
invoices, invoice_line_items, payments, payment_gateway_settings
chart_of_accounts, journal_entries, journal_entry_lines

-- Setup and Configuration
countries, currencies, states, entity_types, service_types, tax_jurisdictions
designations, departments

-- AI and Automation
ai_configurations, ai_interactions, ai_assistant_customizations
workflows, workflow_triggers, workflow_actions, workflow_execution_logs

-- Notification System
notifications
```

---

## 🔒 Security & Permissions

### Granular Permission System
14 modules with individual CRUD permissions:

#### Available Modules
- User Management
- Clients Management
- Tasks Management
- Finance Module
- System Setup
- Auto Generated Tasks
- Compliance Calendar
- AI Features
- AI Reporting
- System Settings
- Financial Reports
- Workflow Automation
- Client Portal Management
- Dashboard Access

#### Permission Levels
- **Full Access**: Complete CRUD operations
- **Partial Access**: Limited operations based on role
- **Restricted Access**: Read-only or specific operation access

### Security Features
- **Password Hashing**: Bcrypt encryption for all passwords
- **Session Management**: Secure session handling with configurable timeouts
- **SQL Injection Protection**: Parameterized queries throughout
- **CSRF Protection**: Cross-site request forgery prevention
- **Input Validation**: Comprehensive data validation using Zod schemas

---

## 🎨 User Interface & Experience

### Modern Web Application
- **React + TypeScript**: Type-safe frontend development
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Component Library**: Consistent UI with Shadcn/UI components
- **Dark/Light Themes**: User preference-based theming

### Navigation & Layout
- **Sidebar Navigation**: Module-based navigation with permission filtering
- **Breadcrumb Navigation**: Context-aware navigation paths
- **Search Functionality**: Global search across entities and data
- **Quick Actions**: Contextual action menus throughout the interface

### Performance Optimizations
- **Query Caching**: Intelligent caching with TanStack Query
- **Code Splitting**: Component-based lazy loading
- **Optimistic Updates**: Immediate UI feedback for user actions
- **Real-time Updates**: WebSocket integration for live data

---

## 🚀 API Architecture

### RESTful API Design
- **Express.js Backend**: Robust server framework
- **Route Organization**: Modular route structure by feature
- **Middleware Integration**: Authentication, permission, and validation middleware
- **Error Handling**: Comprehensive error management and logging

### API Endpoints Structure
```javascript
// Core API Routes
/api/v1/auth/*          // Authentication endpoints
/api/v1/clients/*       // Client management
/api/v1/entities/*      // Entity operations
/api/v1/tasks/*         // Task management
/api/v1/finance/*       // Financial operations
/api/v1/setup/*         // System configuration
/api/v1/ai/*            // AI services
/api/v1/workflow/*      // Workflow automation
/api/v1/notifications/* // Notification system
```

---

## 📈 Business Intelligence & Reporting

### Financial Analytics
- **Revenue Tracking**: Multi-dimensional revenue analysis
- **Expense Management**: Comprehensive expense tracking and categorization
- **Profitability Analysis**: Client and service profitability metrics
- **Cash Flow Monitoring**: Real-time cash position tracking

### Operational Analytics
- **Task Performance**: Completion rates and efficiency metrics
- **Client Satisfaction**: Service delivery performance tracking
- **Resource Utilization**: Team productivity and capacity analysis
- **Compliance Monitoring**: Regulatory deadline tracking and reporting

### Custom Report Builder
- **Drag-and-Drop Interface**: User-friendly report creation
- **Multiple Data Sources**: Integration across all system modules
- **Export Capabilities**: PDF, Excel, and CSV export options
- **Scheduled Reports**: Automated report generation and delivery

---

## 🔧 Technical Implementation

### Development Stack
- **Frontend**: React, TypeScript, TailwindCSS, Shadcn/UI
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with session management
- **Real-time**: WebSocket integration
- **AI Integration**: OpenAI API with custom model support

### Deployment Architecture
- **Containerization**: Docker support for consistent deployments
- **Environment Configuration**: Comprehensive environment variable management
- **Database Migrations**: Automated schema management with Drizzle
- **Monitoring**: Application performance and error tracking

### Data Management
- **Backup Systems**: Automated database backup and recovery
- **Data Validation**: Server-side validation with Zod schemas
- **Audit Logging**: Comprehensive change tracking
- **Performance Monitoring**: Query optimization and performance tracking

---

This documentation represents the current state of the Admin Portal implementation, featuring a comprehensive, secure, and scalable accounting management platform with advanced automation, AI integration, and multi-tenant capabilities designed for enterprise-level accounting firms.