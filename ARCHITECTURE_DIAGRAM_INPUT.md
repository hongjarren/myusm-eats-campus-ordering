# USM Cafe - Architecture Diagram Generator Input

## WEB APPLICATION ARCHITECTURE

MyUSM Eats is developed based on the client-server architecture or the two-tier architecture due to its high suitability for managing the needs of MyUSM Eats such as multi-role user management, food ordering, delivery tracking, and administrative oversight. The architecture separates MyUSM Eats into a frontend client offering a user-friendly, easy-to-navigate interface for students to browse cafeterias and place orders, vendors to manage their stalls and process orders, delivery personnel to track and update delivery status, and administrators to oversee the entire system including user management, stall approvals, and report generation. For the backend, it is able to manage MyUSM Eats's core business logic, data processing and storage through Supabase, which provides PostgreSQL database, authentication services, real-time subscriptions, and file storage capabilities.

Unlike more complex multi-tier architecture with support for very high performance and many complex queries, the development of MyUSM Eats using two-tier architecture is simpler and the process of maintaining the web application is less complex in the long run. This provides us with great benefits given the time and resource constraints that we have for the development of the MyUSM Eats web application. Two-tier architecture provides MyUSM Eats with an excellent balance of performance, scalability and security without requiring additional layers which may cause significant overhead. It ensures that MyUSM Eats delivers a seamless and efficient experience to all the users, enhancing smooth food ordering, real-time order tracking, vendor operations, delivery management, and administrative oversight throughout the campus food service ecosystem.

As shown from the architecture diagram of MyUSM Eats above, Supabase is used for managing data in both the static and dynamic React pages. The client browser will make client requests to Supabase for static and dynamic pages. For static pages, it will be fetched and responded directly. For dynamic pages request, API calls will be made to the PostgreSQL cloud-based database to retrieve required data corresponding to the user actions before server response. Additionally, Supabase Realtime service enables real-time data synchronization through WebSocket connections, allowing immediate updates to order status, delivery tracking, and other dynamic content without requiring page refreshes.

---

## 1. PLAIN LANGUAGE DESCRIPTION

**MyUSM Eats** is a comprehensive online food ordering and delivery management system designed for the Universiti Sains Malaysia (USM) campus. The application serves four distinct user roles: Students (customers), Vendors (stall owners), Delivery Personnel (riders), and Administrators.

### System Overview
The application is a full-stack web application built with React and TypeScript on the frontend, using Supabase (PostgreSQL) as the backend database and authentication service. The system enables students to browse food stalls within campus cafeterias, place orders for pickup or delivery, track their orders in real-time, and manage their accounts. Vendors can register and manage their stalls, create and update menu items, process incoming orders, and track their sales. Delivery personnel receive order assignments (automatically or manually), update delivery status, and track their earnings. Administrators oversee the entire system, approve stall applications, manage users (block/unblock), generate reports, and configure system settings.

### Key Features
- **Multi-role Authentication**: Role-based access control with four user types (student, vendor, delivery, admin)
- **Stall Management**: Vendors can register stalls within cafeterias, with admin approval workflow
- **Menu Management**: Vendors can add, edit, and manage menu items with categories, pricing, and availability
- **Order Processing**: Complete order lifecycle from placement to completion with status tracking
- **Delivery System**: Automated and manual delivery assignment with real-time tracking using PostGIS for location data
- **Payment System**: Credit balance system for students with wallet functionality
- **Review System**: Customers can rate food and service quality
- **Promotional Codes**: Discount system with percentage or fixed amount discounts
- **Real-time Updates**: Order status updates visible to all relevant parties
- **Location-based Services**: PostGIS integration for delivery routing and nearest rider assignment

### Data Flow
1. **Student Flow**: Browse cafeterias → Select stall → Add items to cart → Checkout → Payment → Order tracking → Review
2. **Vendor Flow**: Register stall (pending approval) → Manage menu → Receive orders → Update order status → View sales
3. **Delivery Flow**: Receive assignment → Accept delivery → Update status (picked up → en route → delivered) → Track earnings
4. **Admin Flow**: Approve/reject stalls → Manage users → View system statistics → Generate reports → Configure settings

---

## 2. CODE STRUCTURE

### Frontend Architecture (React + TypeScript + Vite)

```
src/
├── main.tsx                    # Application entry point with React Router
├── App.tsx                     # Main app component with role-based routing
├── index.css                   # Global styles (Tailwind CSS)
│
├── lib/
│   └── supabase.ts            # Supabase client configuration and TypeScript interfaces
│
├── contexts/
│   └── AuthContext.tsx        # Authentication context provider with user/profile state
│
└── components/
    ├── Layout.tsx              # Main layout wrapper with navigation
    │
    ├── Auth/
    │   ├── LoginForm.tsx       # User login with email/password
    │   ├── RegisterForm.tsx    # User registration with role selection
    │   └── UpdatePassword.tsx  # Password reset functionality
    │
    ├── Student/
    │   ├── StudentDashboard.tsx  # Main student view with cafe browsing
    │   ├── MenuList.tsx          # Menu display for selected stall
    │   ├── cart.tsx              # Shopping cart component
    │   └── checkout.tsx          # Checkout process with payment
    │
    ├── Vendor/
    │   ├── VendorDashboard.tsx   # Vendor dashboard with order management
    │   ├── RegisterStall.tsx     # Stall registration form
    │   ├── EditStall.tsx         # Stall information editing
    │   ├── ManageMenu.tsx        # Menu item CRUD operations
    │   ├── AddMenuItem.tsx       # Add new menu item
    │   ├── EditMenuItem.tsx      # Edit existing menu item
    │   ├── AllOrders.tsx         # Order list view
    │   ├── OrderList.tsx         # Order management component
    │   ├── OrderCard.tsx         # Individual order display
    │   ├── ToggleStallStatus.tsx  # Online/offline toggle
    │   └── PendingGate.tsx       # Pending approval message
    │
    ├── Delivery/
    │   ├── DeliveryDashboard.tsx  # Delivery personnel dashboard
    │   ├── DeliveryMap.tsx       # Map view for deliveries
    │   └── mockData.ts           # Mock data for development
    │
    └── Admin/
        ├── AdminDashboard.tsx    # Admin overview dashboard
        ├── UserManagement.tsx    # User blocking/unblocking
        ├── StallApplications.tsx # Stall approval workflow
        ├── OrderOversight.tsx    # System-wide order monitoring
        ├── ReportGeneration.tsx  # Analytics and reports
        ├── ManageCafes.tsx       # Cafe and system configuration
        └── Toast.tsx             # Notification component
```

### Key Technologies
- **React 18.3.1**: UI framework
- **TypeScript 5.5.3**: Type safety
- **Vite 7.1.12**: Build tool and dev server
- **React Router DOM 7.9.5**: Client-side routing
- **Tailwind CSS 3.4.1**: Utility-first CSS framework
- **Lucide React**: Icon library
- **Supabase JS 2.57.4**: Backend client library
- **React Leaflet 4.2.1**: Map components for delivery tracking
- **Recharts 3.3.0**: Chart library for analytics
- **jsPDF 3.0.3**: PDF generation for reports

### Routing Logic
```typescript
// Role-based routing in App.tsx
- Unauthenticated users → Login/Register screens
- Students → StudentDashboard at "/"
- Vendors → VendorDashboard at "/vendor/dashboard", "/vendor/menu", "/vendor/orders"
- Delivery → DeliveryDashboard at "/"
- Admin → AdminDashboard at "/"
```

### State Management
- **React Context API**: Global authentication state (AuthContext)
- **Local Component State**: useState hooks for component-specific data
- **Supabase Realtime**: Real-time subscriptions for order updates

---

## 3. DATABASE SCHEMA (PostgreSQL/Supabase)

### Core Tables

#### **profiles**
Extended user profile information linked to Supabase Auth.
```sql
- id (uuid, PK, FK → auth.users)
- full_name (text, NOT NULL)
- matric_id (text, UNIQUE)
- phone (text)
- hostel_address (text)
- role (text, CHECK: 'student'|'vendor'|'delivery'|'admin')
- credit_balance (decimal)
- is_active (boolean, default: true)
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### **cafes**
Cafeteria/restaurant locations on campus.
```sql
- id (uuid, PK)
- vendor_id (uuid, FK → profiles.id)
- name (text, NOT NULL)
- location (text, NOT NULL)
- description (text)
- operating_hours (text)
- contact (text)
- image_url (text)
- is_active (boolean, default: true)
- created_at (timestamptz)
```

#### **stall**
Individual food stalls within cafeterias.
```sql
- id (uuid, PK)
- stallname (text)
- description (text)
- imageurl (text)
- cafeid (uuid, FK → cafes.id)
- vendorid (uuid, FK → profiles.id)
- categories (uuid[])
- operation_days (text[])
- open_time (text)
- close_time (text)
- stall_status (text)
- status (text, CHECK: 'pending'|'approved'|'rejected', default: 'pending')
- contact (text)
- available_payout (decimal)
- created_at (timestamptz)
```

#### **menu_items**
Food items available at stalls.
```sql
- id (uuid, PK)
- stallid (uuid, FK → stall.id) [Note: Some references use cafe_id]
- cafe_id (uuid, FK → cafes.id)
- name (text, NOT NULL)
- description (text)
- price (decimal(10,2), NOT NULL, CHECK >= 0)
- image_url (text)
- category (text)
- prep_time (integer, default: 15)
- is_available (boolean, default: true)
- created_at (timestamptz)
```

#### **categories**
Menu item categories.
```sql
- id (uuid, PK)
- name (text, UNIQUE, NOT NULL)
- description (text)
- sort_order (integer, default: 0)
```

#### **orders**
Customer orders.
```sql
- id (uuid, PK)
- customer_id (uuid, FK → profiles.id)
- cafe_id (uuid, FK → cafes.id)
- stall_id (uuid, FK → stall.id)
- order_number (text, UNIQUE, NOT NULL)
- status (text, CHECK: 'pending'|'preparing'|'ready'|'out_for_delivery'|'completed'|'cancelled')
- delivery_type (text, CHECK: 'pickup'|'delivery')
- delivery_address (text)
- subtotal (decimal(10,2), NOT NULL)
- delivery_fee (decimal(10,2))
- discount (decimal(10,2))
- total (decimal(10,2), NOT NULL)
- payment_method (text)
- payment_status (text, CHECK: 'pending'|'paid'|'failed')
- promo_code (text)
- notes (text)
- estimated_delivery_time (timestamptz)
- created_at (timestamptz)
- completed_at (timestamptz)
```

#### **order_items**
Items within each order.
```sql
- id (uuid, PK)
- order_id (uuid, FK → orders.id)
- menu_item_id (uuid, FK → menu_items.id)
- quantity (integer, NOT NULL, CHECK > 0)
- price (decimal(10,2), NOT NULL)
- special_instructions (text)
```

#### **deliveries**
Delivery assignments and tracking.
```sql
- id (uuid, PK)
- order_id (uuid, FK → orders.id)
- rider_id (uuid, FK → profiles.id)
- status (text, CHECK: 'assigned'|'picked_up'|'en_route'|'delivered')
- current_location (geography(POINT)) [PostGIS]
- last_location_update (timestamptz)
- status_history (jsonb[])
- pickup_time (timestamptz)
- delivery_time (timestamptz)
- created_at (timestamptz)
```

#### **reviews**
Customer feedback and ratings.
```sql
- id (uuid, PK)
- order_id (uuid, FK → orders.id)
- customer_id (uuid, FK → profiles.id)
- cafe_id (uuid, FK → cafes.id)
- rating (integer, CHECK: 1-5)
- food_rating (integer, CHECK: 1-5)
- service_rating (integer, CHECK: 1-5)
- comment (text)
- vendor_response (text)
- created_at (timestamptz)
```

#### **promo_codes**
Promotional discount codes.
```sql
- id (uuid, PK)
- code (text, UNIQUE, NOT NULL)
- description (text)
- discount_type (text, CHECK: 'percentage'|'fixed')
- discount_value (decimal(10,2), NOT NULL)
- min_order_amount (decimal(10,2))
- valid_from (timestamptz)
- valid_until (timestamptz)
- usage_limit (integer)
- usage_count (integer, default: 0)
- is_active (boolean, default: true)
```

### Database Functions

#### **generate_order_number()**
Generates unique order numbers in format: ORDYYYYMMDD####

#### **update_updated_at_column()**
Trigger function to automatically update `updated_at` timestamp

#### **update_delivery_status_history()**
Tracks delivery status changes in JSONB array

#### **update_delivery_location(lat, lon)**
Updates rider's current location using PostGIS

#### **calculate_distance(lat1, lon1, lat2, lon2)**
Calculates distance between two geographic points

#### **find_nearest_rider(order_lat, order_lon)**
Finds the nearest available delivery rider

#### **auto_assign_delivery()**
Trigger function that automatically assigns deliveries to nearest rider

#### **reassign_delivery(delivery_id)**
Manually reassigns a delivery to the nearest available rider

### Row Level Security (RLS)
All tables have RLS enabled with policies for:
- **Profiles**: Users can only view/edit their own profile
- **Cafes**: Anyone can view active cafes; vendors manage their own
- **Menu Items**: Public can view available items; vendors manage their own
- **Orders**: Customers view their orders; vendors view their cafe orders; delivery view assigned orders
- **Order Items**: Access based on order ownership
- **Deliveries**: Riders view assigned deliveries; customers view their order deliveries
- **Reviews**: Public read access; customers create; vendors respond
- **Promo Codes**: Public can view active codes

---

## 4. INFRASTRUCTURE SCRIPT

### Environment Setup

```bash
# Node.js version: 18+ recommended
# Package Manager: npm

# Install dependencies
npm install

# Environment variables (.env file)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Development server
npm run dev          # Starts Vite dev server on http://localhost:5173

# Production build
npm run build        # Creates optimized production build in /dist
npm run preview      # Preview production build locally

# Type checking
npm run typecheck    # TypeScript type checking without emitting files

# Linting
npm run lint         # ESLint code quality checks
```

### Supabase Infrastructure

```sql
-- Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- UUID generation
CREATE EXTENSION IF NOT EXISTS "postgis";     -- Geographic data support

-- Database Configuration
-- Database: PostgreSQL 15+
-- Authentication: Supabase Auth (JWT-based)
-- Storage: Supabase Storage (for images)
-- Realtime: Supabase Realtime (for order updates)

-- Connection Details
-- Host: [Supabase Project URL]
-- Port: 5432 (PostgreSQL)
-- Database: postgres
-- SSL: Required
```

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT BROWSER                       │
│  (React SPA - Static files served via CDN/Vercel)       │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS
                     │
┌────────────────────▼────────────────────────────────────┐
│              STATIC HOSTING (Vercel/Netlify)            │
│  - Serves React build files                             │
│  - Handles client-side routing                          │
└────────────────────┬────────────────────────────────────┘
                     │ API Calls
                     │
┌────────────────────▼────────────────────────────────────┐
│              SUPABASE BACKEND                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Authentication Service (Supabase Auth)          │  │
│  │  - Email/Password authentication                │  │
│  │  - JWT token management                          │  │
│  │  - Session management                           │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database                             │  │
│  │  - All application data                          │  │
│  │  - Row Level Security (RLS)                     │  │
│  │  - PostGIS for location data                    │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Realtime Service                                │  │
│  │  - WebSocket connections                         │  │
│  │  - Real-time order updates                      │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Storage Service                                 │  │
│  │  - Image uploads (menu items, stalls)            │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Build Configuration

```typescript
// vite.config.ts
- Build tool: Vite
- Framework: React (via @vitejs/plugin-react)
- Output: Static files in /dist directory
- Optimization: Tree-shaking, code splitting, minification
```

### Security Configuration

```typescript
// Authentication Flow
1. User registers/logs in via Supabase Auth
2. Supabase returns JWT token
3. Token stored in browser (localStorage/sessionStorage)
4. All API requests include token in Authorization header
5. Supabase validates token and applies RLS policies

// CORS Configuration
- Handled by Supabase
- Allowed origins: [Your deployment domain]
- Credentials: Included

// Environment Variables
- VITE_SUPABASE_URL: Public Supabase project URL
- VITE_SUPABASE_ANON_KEY: Public anonymous key (safe for client-side)
- Service role key: NEVER exposed to client (server-side only)
```

### Data Flow Architecture

```
┌─────────────┐
│   Student   │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. Browse Cafes
       │ 2. Select Stall
       │ 3. Add to Cart
       │ 4. Checkout
       ▼
┌─────────────────────────────────────┐
│      React Frontend (Vite)          │
│  - State Management (Context API)    │
│  - UI Components (React)             │
│  - Routing (React Router)           │
└──────┬──────────────────────────────┘
       │
       │ HTTP/REST API Calls
       │ (Supabase JS Client)
       ▼
┌─────────────────────────────────────┐
│      Supabase Backend                │
│  ┌──────────────────────────────┐   │
│  │  Auth Service                │   │
│  │  - Validates credentials     │   │
│  │  - Issues JWT tokens         │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │  PostgreSQL Database          │   │
│  │  - RLS policies enforce       │   │
│  │  - Triggers auto-assign       │   │
│  │  - Functions calculate       │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │  Realtime Subscriptions       │   │
│  │  - Order status updates      │   │
│  │  - Delivery location updates │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
       │
       │ WebSocket/Realtime
       │
       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Vendor    │     │  Delivery  │     │    Admin    │
│  Dashboard  │     │  Dashboard  │     │  Dashboard  │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Key Infrastructure Components

1. **Frontend Hosting**: Static file hosting (Vercel, Netlify, or similar)
2. **Backend**: Supabase (BaaS - Backend as a Service)
   - PostgreSQL database
   - Authentication service
   - Realtime subscriptions
   - Storage for images
3. **CDN**: Automatic via hosting platform for static assets
4. **SSL/TLS**: Automatic HTTPS via hosting platform
5. **Database**: PostgreSQL 15+ with PostGIS extension
6. **API**: RESTful API via Supabase client library
7. **Real-time**: WebSocket connections via Supabase Realtime

---

## SUMMARY FOR DIAGRAM GENERATOR

**Application Type**: Full-stack web application (SPA)
**Frontend**: React 18 + TypeScript + Vite
**Backend**: Supabase (PostgreSQL + Auth + Realtime + Storage)
**Architecture Pattern**: Client-Server with BaaS
**Authentication**: JWT-based via Supabase Auth
**Database**: PostgreSQL with PostGIS
**Key Features**: Multi-role system, real-time updates, location-based services, automated delivery assignment
**Deployment**: Static frontend + Supabase cloud backend
**Security**: Row Level Security (RLS) policies, role-based access control

