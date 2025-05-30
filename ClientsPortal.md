# Client Portal Documentation

## Overview

The Client Portal is a comprehensive, secure web application that provides clients with direct access to their accounting data, compliance status, task management, and financial information. It operates as a separate authentication system with dedicated routes, ensuring complete security isolation from the main admin application.

---

## 🔐 Authentication & Security Features

### Separate Authentication System
- **Independent Session Management**: Uses dedicated session cookies (`client-portal.sid`) separate from admin sessions
- **Custom Authentication Strategy**: Implements `client-portal-local` strategy using Passport.js
- **Multi-tenant Security**: Each client can only access data within their specific tenant scope
- **Password Management**: Secure password hashing with bcrypt and password reset capabilities

### Database Schema
The client portal authentication is built on a dedicated database table:

```sql
-- Client Portal Access Table
CREATE TABLE client_portal_access (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  last_login TIMESTAMP,
  password_reset_required BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  UNIQUE(tenant_id, client_id),
  UNIQUE(tenant_id, username)
);
```

---

## 🏠 Dashboard Features

### Main Dashboard Overview
The client portal dashboard provides a comprehensive view of the client's accounting status with the following key components:

#### 1. **Entity Management Display**
- **Compact Entity Cards**: Small, uniform cards showing all client entities
- **Horizontal Distribution**: Responsive grid layout for optimal viewing
- **Real-time Data**: Direct integration with actual entity information
- **Entity Selection**: Interactive selection for detailed compliance analysis

#### 2. **Compliance Analysis Engine**
Real-time compliance tracking with sophisticated metrics:

- **Service Subscription Tracking**: Displays Required vs Subscribed service status
- **Compliance Rate Calculation**: Automated calculation based on required services
- **Upcoming Deadlines**: Tracks tasks due within 30 days
- **Status Indicators**: Visual compliance status with color-coded alerts

#### 3. **Multi-Tab Interface**
- **Overview Tab**: Entity information and compliance summary
- **Tasks Tab**: Task management and status tracking
- **Documents Tab**: Document access and management
- **Invoices Tab**: Invoice viewing and payment status

### Customization Features
The dashboard supports extensive customization through tenant settings:

```javascript
// Customizable Elements
- Header Title and Subtitle
- Company Branding (Logo, Name, Contact Info)
- Business Hours Display
- Footer Configuration
- Support Contact Information
- Disclaimer Text
- Additional Links
```

---

## 📊 Real-Time Data Integration

### Database Connection Architecture

#### 1. **Unified Storage System**
The client portal uses the same `DatabaseStorage` instance as the admin portal, ensuring data consistency:

```javascript
// Storage Integration
- Shared database connection pool
- Consistent data models and schemas
- Real-time synchronization with admin changes
- Tenant-isolated data access
```

#### 2. **API Endpoint Structure**
Client portal uses a hybrid API approach for optimal performance:

**Client Portal Specific Endpoints:**
- `/api/client-portal/profile` - Client profile information
- `/api/client-portal/entities` - Client's entities list
- `/api/client-portal/tasks` - Task management
- `/api/client-portal/invoices` - Invoice data
- `/api/client-portal/documents` - Document access

**Shared Admin Endpoints:**
- `/api/v1/entities/{id}/services` - Service configuration data
- `/api/v1/setup/service-types` - Available services
- `/api/v1/tenant/settings` - Portal customization

#### 3. **Data Flow Implementation**

**Entity Services Integration:**
```javascript
// Real-time service data fetching
const { data: entityServices = [] } = useQuery({
  queryKey: ['/api/v1/entities', selectedEntityId, 'services'],
  queryFn: () => apiRequest(`/api/v1/entities/${selectedEntityId}/services`),
  enabled: !!selectedEntityId
});
```

**Task Management Integration:**
```javascript
// Dynamic task filtering by entity
const { data: clientTasks = [] } = useQuery({
  queryKey: ['/api/client-portal/tasks', selectedEntityId],
  queryFn: () => apiRequest(`/api/client-portal/tasks${selectedEntityId ? `?entityId=${selectedEntityId}` : ''}`)
});
```

---

## 🛠 Administrative Features

### Portal Access Management
Administrators can manage client portal access through the main application:

#### 1. **Access Creation & Configuration**
- **Automatic Username Generation**: Based on client information
- **Secure Password Generation**: 12-character random passwords
- **Account Activation Control**: Enable/disable portal access
- **Portal URL Generation**: Direct links for client access

#### 2. **Password Reset System**
- **Admin-initiated Reset**: Generate new passwords for clients
- **Password Requirements**: Enforced security standards
- **Reset Confirmation**: Secure password delivery system

#### 3. **Access Monitoring**
- **Last Login Tracking**: Monitor client portal usage
- **Session Management**: Track active client sessions
- **Activity Logging**: Comprehensive audit trail

---

## 📱 User Interface Features

### Responsive Design
- **Mobile-First Approach**: Optimized for all device sizes
- **Touch-Friendly Navigation**: Intuitive mobile interactions
- **Adaptive Layouts**: Automatic adjustment to screen sizes

### Navigation Structure
```
Client Portal
├── Dashboard (Entity Overview)
├── Entity Details
│   ├── Overview Tab
│   ├── Tasks Tab
│   ├── Documents Tab
│   └── Invoices Tab
└── Profile Management
```

### Real-Time Features
- **Live Data Updates**: Automatic refresh of critical information
- **Status Indicators**: Real-time compliance and task status
- **Interactive Elements**: Click-to-select entity cards
- **Dynamic Content**: Context-sensitive information display

---

## 🔄 Data Synchronization

### Real-Time Database Integration

#### 1. **Entity Information Sync**
```javascript
// Direct database queries for entity data
const entityResults = await db
  .select()
  .from(entities)
  .where(and(
    eq(entities.clientId, user.clientId),
    eq(entities.tenantId, user.tenantId)
  ));
```

#### 2. **Service Configuration Sync**
```javascript
// Real-time service subscription status
const serviceResults = await db
  .select()
  .from(entityServiceSubscriptions)
  .where(eq(entityServiceSubscriptions.entityId, entityId));
```

#### 3. **Task Management Sync**
```javascript
// Dynamic task filtering and status updates
const taskResults = await db
  .select()
  .from(tasks)
  .where(and(
    eq(tasks.clientId, user.clientId),
    eq(tasks.tenantId, user.tenantId),
    entityId ? eq(tasks.entityId, entityId) : undefined
  ));
```

#### 4. **Compliance Analysis**
Real-time compliance calculations based on:
- Required vs Subscribed services from `entityServiceSubscriptions`
- Upcoming task deadlines from `tasks` table
- Service type configurations from `serviceTypes`
- Entity-specific requirements

---

## 🚀 Technical Implementation

### Frontend Architecture
- **React + TypeScript**: Type-safe frontend development
- **TanStack Query**: Intelligent data fetching and caching
- **Wouter**: Lightweight client-side routing
- **Shadcn/UI**: Consistent component library

### Backend Integration
- **Express.js**: RESTful API endpoints
- **Drizzle ORM**: Type-safe database operations
- **PostgreSQL**: Robust data persistence
- **Passport.js**: Authentication middleware

### Security Features
- **Session Isolation**: Separate cookie domains
- **Input Validation**: Zod schema validation
- **SQL Injection Protection**: Parameterized queries
- **CSRF Protection**: Cross-site request forgery prevention

---

## 📈 Performance Optimizations

### Caching Strategy
- **Query Caching**: Intelligent cache invalidation
- **Conditional Requests**: 304 Not Modified responses
- **Data Persistence**: Optimized database connections

### Load Performance
- **Lazy Loading**: Component-based code splitting
- **Optimized Queries**: Efficient database operations
- **Minimal Data Transfer**: Focused API responses

---

## 🔧 Deployment & Configuration

### Environment Variables
```bash
CLIENT_PORTAL_SESSION_SECRET=your-session-secret
DATABASE_URL=postgresql://connection-string
```

### Database Setup
The client portal requires the following database migrations:
1. `add-client-portal-schema.ts` - Core portal access table
2. `add-client-portal-fields.ts` - Additional portal fields

### Route Configuration
Client portal routes are automatically configured in the Express application with dedicated middleware for authentication and session management.

---

This documentation represents the current state of the Client Portal implementation, featuring a fully functional, secure, and data-integrated client access system that provides real-time visibility into accounting operations and compliance status.