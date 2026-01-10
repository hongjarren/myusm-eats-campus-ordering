# Admin Module - Implementation Guide

## Overview
This admin module provides comprehensive management capabilities for the USM Cafeteria Online Ordering System. The module is organized into 4 main sections with complete dark mode support, full accessibility compliance (WCAG 2.1 Level AA), and responsive design for all device sizes.

## Latest Updates (November 2025)

### ✅ Dark Mode Implementation
- **Toggle Functionality**: Users can switch between light and dark themes
- **Persistent State**: Theme preference saved to localStorage
- **Flash Prevention**: Inline script in index.html prevents flash of unstyled content
- **Component Theming**: All UI components, charts, tables, and forms properly themed
- **Chart Theming**: Recharts components (donut, line, bar) with custom dark mode colors
- **Contrast Optimization**: All text elements meet WCAG AA contrast requirements

### ✅ Accessibility Features (WCAG 2.1 Level AA Compliant)
- **Touch Targets**: All interactive elements have minimum 44×44px touch targets
- **Keyboard Navigation**: 
  - Tab key navigation for all interactive elements
  - Escape key to close modals
  - Focus management for modal dialogs
  - Visible focus indicators with outline styles
- **ARIA Labels**: Comprehensive ARIA labels, roles, and attributes
  - All buttons have descriptive aria-label attributes
  - Modals use role="dialog" and aria-modal="true"
  - Navigation tabs use aria-current="page"
  - Form controls have proper aria-labels
- **Alt Text**: All images have descriptive alternative text
- **Screen Reader Support**: Semantic HTML with proper heading hierarchy

### ✅ Mobile Responsiveness
- **Breakpoint Strategy**: Mobile-first design with sm (640px), md (768px), lg (1024px), xl (1280px)
- **Flexible Layouts**: Components adapt from mobile (320px) to desktop (2560px+)
- **Touch-Optimized**: Larger touch targets, improved spacing on mobile
- **Overflow Prevention**: Horizontal scroll eliminated on all screen sizes
- **Responsive Typography**: Text scales appropriately (text-xs → text-sm → text-base)
- **Adaptive Navigation**: Horizontal scroll navigation on mobile with icon stacking

### ✅ Performance Optimization
- **Code Splitting**: Manual chunks for vendor libraries (react, recharts, leaflet, supabase, jspdf, xlsx)
- **Lazy Loading**: Route-level React.lazy + Suspense for dashboard components
- **On-Demand Imports**: Dynamic imports for export libraries (xlsx, jsPDF) loaded only when needed
- **Bundle Sizes**:
  - AdminDashboard: ~102 KB
  - Recharts: ~216 KB
  - jsPDF: ~372 KB
  - xlsx: ~429 KB
- **Build Optimization**: Vite configuration with optimized chunk strategy

### ✅ Chart Rendering Fixes
- **ResponsiveContainer**: All charts wrapped in explicit-height divs for proper rendering
- **Chart Types**: Line charts (320px), Donut charts (340px), Bar charts (300px)
- **CSS Optimization**: Recharts-specific CSS rules for proper SVG rendering
- **Tooltip Theming**: Custom CSS variables for dark mode tooltips

## Features Implemented

### A. Dashboard (`AdminDashboard.tsx`)
**Primary Navigation:**
- Overview - System-wide KPIs and analytics
- People - User management hub
- Vendors & Stalls - Vendor operations management
- Operations - Café and system configuration
- Orders & Reports - Order oversight and reporting

**Overview Tab Features:**
- **KPI Cards**: Total Users, Active Orders, Total Revenue, Average Rating
- **Date Range Filtering**: Today, Week, Month, Year views with refresh capability
- **Category Navigation**: Browse orders by food category (All, Rice, Noodles, Western, Drinks, Snacks)
- **Revenue Trend Chart**: Line chart showing revenue over selected period with dark mode theming
- **Responsive Design**: Mobile-friendly layout with stacked navigation and horizontal scrolling

### B. User Management (`UserManagement.tsx`)
**People Tab - Sub-sections:**
1. **Vendors**: Approve or reject pending vendor accounts with detailed review
2. **Students**: View all students, block/unblock accounts, reset passwords, search by matric ID or hostel
3. **Delivery Riders**: View riders, monitor activity, activate/deactivate accounts

**Accessibility Features:**
- Min-h-[44px] touch targets on all buttons and tabs
- Keyboard navigation with Tab and Escape keys
- ARIA labels on search inputs and action buttons
- Focus-visible styles for keyboard users
- Modal accessibility with role="dialog" and aria-modal

### C. Stall Applications & Updates (`StallApplications.tsx`, `StallUpdateApprovals.tsx`)
**Vendors & Stalls Tab - Sub-sections:**
1. **Applications**: Review and approve new vendor stall applications
   - View stall details, images, and vendor information
   - Approve or reject with reason
   - Search and filter functionality
   - Image alt text for accessibility
2. **Update Requests**: Manage vendor stall update requests
   - Compare current vs. proposed changes
   - Side-by-side image comparison
   - Approve or reject modifications

### D. Order Oversight (`OrderOversight.tsx`)
**Orders & Reports Tab - Orders Sub-section:**
- **Active Orders Monitoring**: Real-time order tracking with filtering by café, status, and date range
- **Order Override**: Cancel orders if needed
- **Status Donut Chart**: Visual breakdown of order statuses with dark mode support
- **Vendor Performance Dashboard**: 
  - Total orders per café (bar chart)
  - Revenue per café (bar chart)
  - Average ratings
  - Average preparation time
  - Top menu items
- **Real-time Updates**: Uses Supabase postgres_changes subscription
- **Chart Accessibility**: All charts render properly with explicit height containers

### E. Manage Cafes (`ManageCafes.tsx`)
**Operations Tab - Sub-sections:**
1. **Manage Cafés**: Add, edit, delete cafés, assign vendors
2. **Manage Categories**: CRUD operations for food categories
3. **Manage Promo Codes**: Create promo codes with discount settings, expiry dates, usage limits, and activation toggle

**Modal Features:**
- Keyboard support (Escape to close)
- Focus management
- Responsive button layouts (flex-col on mobile, flex-row on desktop)
- Min-h-[44px] close buttons

### F. Report Generation (`ReportGeneration.tsx`)
**Orders & Reports Tab - Reports Sub-section:**
- **Monthly Sales Report**: Revenue by café with monthly trends (line chart)
- **Sales by Café**: Bar chart showing revenue distribution
- **Feedback Summary**: Average ratings per café, common complaints extraction
- **Order Statistics**: Total orders, top cafés, top menu items
- **Export Functionality**: 
  - Export to Excel (.xlsx) with dynamic import
  - Export to PDF with dynamic import
  - On-demand loading reduces initial bundle size
- **Chart Rendering**: All charts properly themed for dark mode with explicit height containers

## Components Architecture

### Core Components

1. **`AdminDashboard.tsx`** - Main dashboard container
   - Primary navigation with 5 main tabs
   - Overview tab with KPI cards and revenue chart
   - Category-based order filtering
   - Date range selection
   - Responsive header with mobile optimization
   - Dark mode toggle integration

2. **`UserManagement.tsx`** - User account management
   - Three sub-tabs: Vendors, Students, Delivery Riders
   - Search and filter functionality
   - Account activation/deactivation
   - Password reset capability
   - Vendor approval workflow
   - Accessibility: ARIA labels, keyboard navigation, focus management

3. **`StallApplications.tsx`** - Vendor stall application review
   - Application listing with search/filter
   - Detailed application view modal
   - Image preview with descriptive alt text
   - Approve/reject workflow
   - Responsive table design

4. **`StallUpdateApprovals.tsx`** - Stall update request management
   - Side-by-side comparison (current vs. proposed)
   - Image comparison functionality
   - Update approval/rejection
   - Modal accessibility with keyboard support

5. **`OrderOversight.tsx`** - Order monitoring and vendor performance
   - Real-time order tracking with Supabase subscriptions
   - Status donut chart (340px height)
   - Vendor performance bar charts (300px height)
   - Multi-criteria filtering (café, status, date)
   - Order cancellation capability
   - Chart theming for dark mode

6. **`ManageCafes.tsx`** - Café and system configuration
   - CRUD operations for cafés
   - Category management
   - Promo code creation and management
   - Modal forms with validation
   - Responsive form layouts

7. **`ReportGeneration.tsx`** - Analytics and reporting
   - Revenue trend line chart (320px height)
   - Sales by café bar chart (300px height)
   - Feedback analytics
   - Order statistics
   - Dynamic export functionality (Excel/PDF)
   - On-demand library loading

8. **`Toast.tsx`** - Notification system
   - Success, error, info, warning variants
   - Auto-dismiss with customizable duration
   - Stacking support for multiple toasts
   - Animation with reduced motion support
   - Accessible notifications

### Styling Architecture

**Global Styles (`src/index.css`):**
- Base layer: Dark mode foundations, form controls, tables, focus-visible styles
- Component layer: Reusable utility classes (`.surface`, `.card`, `.nav-tab`, `.btn`, `.pill-tab`)
- Responsive utilities: Mobile-first responsive classes with breakpoint scaling
- Chart optimization: Recharts-specific CSS for proper rendering
- Animation keyframes: fadeIn, fadeSlideIn, scalePulse, toast-enter
- Accessibility: Touch-friendly scrolling, reduced motion support

**Theming Strategy:**
- TailwindCSS with `darkMode: 'class'` strategy
- CSS variables for tooltip colors (`--tooltip-bg`, `--tooltip-border`, `--tooltip-text`)
- Shared component classes for consistency
- Context-based dark mode with localStorage persistence

## Technology Stack

### Frontend Framework
- **React 18**: Component-based UI framework
- **TypeScript 5.5**: Type-safe development
- **Vite 7**: Build tool with hot module replacement
- **React Router DOM**: Client-side routing

### Styling & UI
- **TailwindCSS 3.4**: Utility-first CSS framework with dark mode support
- **Lucide React**: Icon library for UI elements
- **Custom CSS**: Animation keyframes and component utilities

### Data Visualization
- **Recharts**: Chart library for data visualization
  - Line charts for revenue trends
  - Donut/Pie charts for status distribution
  - Bar charts for comparative metrics
  - Responsive containers with explicit height wrappers

### Backend & Database
- **Supabase**: Backend-as-a-Service
  - PostgreSQL database
  - Real-time subscriptions for live updates
  - Authentication and authorization
  - Row Level Security (RLS) policies
  - File storage for images

### Export & Reporting
- **xlsx**: Excel file generation (dynamic import, ~429 KB)
- **jsPDF + jspdf-autotable**: PDF generation (dynamic import, ~372 KB)
- On-demand loading to optimize initial bundle size

### Performance Optimization
- **Code Splitting**: Vite manual chunks configuration
- **Lazy Loading**: React.lazy + Suspense for route-level splitting
- **Dynamic Imports**: On-demand loading for heavy libraries
- **Bundle Analysis**: Optimized chunk sizes with warning threshold management

## Database Schema & Configuration

### Required Database Tables

1. **profiles** - Extended user information
   - `id` (uuid, primary key, references auth.users)
   - `email` (text)
   - `role` (text) - 'admin', 'vendor', 'student', 'delivery', 'pending_vendor'
   - `full_name` (text)
   - `matric_id` (text, for students)
   - `phone` (text)
   - `hostel_address` (text, for students)
   - `is_active` (boolean, default true) - For account blocking/deactivation
   - `created_at` (timestamp)

2. **stalls** - Vendor stall information
   - `id` (uuid, primary key)
   - `name` (text)
   - `cafe_id` (uuid, references cafes)
   - `vendor_id` (uuid, references profiles)
   - `category` (text)
   - `description` (text)
   - `image_url` (text)
   - `status` (text) - 'pending', 'approved', 'rejected', 'active', 'inactive'
   - `created_at` (timestamp)

3. **stall_update_requests** - Stall modification requests
   - `id` (uuid, primary key)
   - `stall_id` (uuid, references stalls)
   - `vendor_id` (uuid, references profiles)
   - `current_name`, `updated_name` (text)
   - `current_category`, `updated_category` (text)
   - `current_description`, `updated_description` (text)
   - `current_image_url`, `updated_image_url` (text)
   - `status` (text) - 'pending', 'approved', 'rejected'
   - `created_at` (timestamp)

4. **cafes** - Cafeteria locations
   - `id` (uuid, primary key)
   - `name` (text)
   - `location` (text)
   - `operating_hours` (text)
   - `contact` (text)

5. **categories** - Food categories
   - `id` (uuid, primary key)
   - `name` (text) - 'Rice', 'Noodles', 'Western', 'Drinks', 'Snacks'

6. **orders** - Customer orders
   - `id` (uuid, primary key)
   - `customer_id` (uuid, references profiles)
   - `cafe_id` (uuid, references cafes)
   - `status` (text) - 'pending', 'preparing', 'ready', 'completed', 'cancelled'
   - `total_amount` (numeric)
   - `created_at` (timestamp)

7. **promo_codes** - Promotional codes
   - `id` (uuid, primary key)
   - `code` (text, unique)
   - `discount_type` (text) - 'percentage', 'fixed'
   - `discount_value` (numeric)
   - `expiry_date` (timestamp)
   - `usage_limit` (integer)
   - `is_active` (boolean)

8. **reviews** - Customer feedback
   - `id` (uuid, primary key)
   - `order_id` (uuid, references orders)
   - `rating` (integer) - 1-5
   - `comment` (text)
   - `created_at` (timestamp)

### Supabase Configuration

#### 1. Row Level Security (RLS) Policies

**Admin Full Access Policies:**
```sql
-- Profiles: Admin can view all
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Profiles: Admin can update all
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Orders: Admin can view and update all
CREATE POLICY "Admins can manage all orders"
  ON orders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Stalls: Admin can manage all
CREATE POLICY "Admins can manage all stalls"
  ON stalls FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Stall Update Requests: Admin can manage all
CREATE POLICY "Admins can manage stall update requests"
  ON stall_update_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Cafes, Categories, Promo Codes: Admin full access
CREATE POLICY "Admins can manage cafes"
  ON cafes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );
```

#### 2. Real-time Subscriptions Setup

Enable real-time for tables in Supabase Dashboard:
- orders (for live order updates)
- stalls (for application status changes)
- stall_update_requests (for update request changes)

#### 3. Storage Configuration

Configure Supabase Storage bucket for images:
- Bucket name: `stall-images`
- Public access: Enabled
- File size limit: 5MB recommended
- Allowed file types: image/jpeg, image/png, image/webp

#### 4. Vendor Approval Workflow

**Implementation:**
- New vendors register with `role = 'pending_vendor'`
- Admin reviews in UserManagement > Vendors tab
- On approval: Update `role = 'vendor'`
- On rejection: Update `role = 'rejected_vendor'` or delete profile

**SQL for approval:**
```sql
UPDATE profiles 
SET role = 'vendor' 
WHERE id = '<vendor-id>';
```

#### 5. Password Reset

**Option 1: Supabase Dashboard (Manual)**
- Navigate to Authentication > Users
- Select user and click "Send Password Reset Email"

**Option 2: Programmatic (Recommended for scale)**
```typescript
// Requires admin service role key
const { error } = await supabase.auth.admin.updateUserById(
  userId,
  { password: 'new-temporary-password' }
);
```

**Option 3: Self-Service**
- Provide "Forgot Password" link in login form
- Users receive reset email automatically

## Key Database Queries

### User Management Queries

**1. Fetch Pending Vendors:**
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('role', 'pending_vendor')
  .order('created_at', { ascending: false });
```

**2. Approve Vendor:**
```typescript
const { error } = await supabase
  .from('profiles')
  .update({ role: 'vendor' })
  .eq('id', vendorId);
```

**3. Block/Unblock Student:**
```typescript
const { error } = await supabase
  .from('profiles')
  .update({ is_active: false }) // or true to unblock
  .eq('id', studentId);
```

**4. Search Students by Matric ID:**
```typescript
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('role', 'student')
  .ilike('matric_id', `%${searchQuery}%`);
```

### Order Management Queries

**5. Fetch Orders with Real-time Subscription:**
```typescript
const { data } = await supabase
  .from('orders')
  .select(`
    *,
    profiles!customer_id(full_name, email),
    cafes(name, location)
  `)
  .order('created_at', { ascending: false });

// Real-time subscription
supabase
  .channel('orders-channel')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'orders' },
    payload => { /* handle update */ }
  )
  .subscribe();
```

**6. Cancel Order:**
```typescript
const { error } = await supabase
  .from('orders')
  .update({ status: 'cancelled' })
  .eq('id', orderId);
```

### Stall Management Queries

**7. Fetch Pending Stall Applications:**
```typescript
const { data } = await supabase
  .from('stalls')
  .select(`
    *,
    profiles!vendor_id(full_name, email, phone),
    cafes(name, location)
  `)
  .eq('status', 'pending')
  .order('created_at', { ascending: false });
```

**8. Approve Stall Application:**
```typescript
const { error } = await supabase
  .from('stalls')
  .update({ status: 'approved' })
  .eq('id', stallId);
```

**9. Fetch Stall Update Requests:**
```typescript
const { data } = await supabase
  .from('stall_update_requests')
  .select(`
    *,
    stalls(name),
    profiles!vendor_id(full_name, email)
  `)
  .eq('status', 'pending')
  .order('created_at', { ascending: false });
```

### Analytics & Reporting Queries

**10. Sales Report by Café:**
```typescript
const { data } = await supabase
  .from('orders')
  .select('cafe_id, total_amount, created_at, cafes(name)')
  .gte('created_at', startDate)
  .lte('created_at', endDate)
  .eq('status', 'completed');

// Aggregate in JavaScript
const salesByCafe = data.reduce((acc, order) => {
  const cafeName = order.cafes.name;
  acc[cafeName] = (acc[cafeName] || 0) + order.total_amount;
  return acc;
}, {});
```

**11. Vendor Performance Metrics:**
```typescript
const { data } = await supabase
  .from('orders')
  .select(`
    id,
    cafe_id,
    cafes(name),
    reviews(rating),
    created_at,
    completed_at
  `)
  .eq('status', 'completed')
  .gte('created_at', startDate);

// Calculate averages in JavaScript
```

**12. Order Statistics:**
```typescript
const { count } = await supabase
  .from('orders')
  .select('*', { count: 'exact', head: true })
  .gte('created_at', startDate)
  .lte('created_at', endDate);
```

### System Configuration Queries

**13. Manage Cafés:**
```typescript
// Create
const { data, error } = await supabase
  .from('cafes')
  .insert([{ name, location, operating_hours, contact }]);

// Update
const { error } = await supabase
  .from('cafes')
  .update({ name, location })
  .eq('id', cafeId);

// Delete
const { error } = await supabase
  .from('cafes')
  .delete()
  .eq('id', cafeId);
```

**14. Manage Promo Codes:**
```typescript
const { data, error } = await supabase
  .from('promo_codes')
  .insert([{
    code,
    discount_type,
    discount_value,
    expiry_date,
    usage_limit,
    is_active: true
  }]);
```

## Feature Usage Guide

### Dark Mode Toggle

**Implementation:**
- Toggle button in Layout header (top-right)
- State persisted to localStorage as 'darkMode'
- HTML class 'dark' added/removed from document root
- All components automatically adapt via TailwindCSS dark: variants

**User Experience:**
- Smooth transitions (200ms duration)
- No flash on page load
- Consistent theming across all charts and UI elements

### Toast Notifications

**Usage in Components:**
```typescript
import { useToast } from './Toast';

function MyComponent() {
  const { showToast } = useToast();
  
  const handleAction = async () => {
    try {
      // ... perform action
      showToast('Action completed successfully!', 'success');
    } catch (error) {
      showToast('Action failed: ' + error.message, 'error');
    }
  };
}
```

**Toast Types:**
- `success` - Green background, checkmark icon
- `error` - Red background, X icon
- `info` - Blue background, info icon
- `warning` - Yellow background, alert icon

### Export Functionality

**Excel Export:**
```typescript
const exportExcel = async () => {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, 'admin_report.xlsx');
};
```

**PDF Export:**
```typescript
const exportPDF = async () => {
  const jsPDF = (await import('jspdf')).default;
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF();
  doc.text('Report Title', 14, 15);
  autoTable(doc, {
    head: [headers],
    body: data,
    startY: 25
  });
  doc.save('admin_report.pdf');
};
```

**Benefits:**
- Libraries loaded only when export button clicked
- Reduces initial page load time
- Better performance for users who don't export

### Real-time Updates

**Order Oversight Real-time:**
```typescript
useEffect(() => {
  const channel = supabase
    .channel('orders-changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      (payload) => {
        console.log('Order change:', payload);
        fetchOrders(); // Refresh order list
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

**Benefits:**
- No manual refresh needed
- Instant updates when orders change
- Better user experience for monitoring

### Responsive Design

**Breakpoint Usage:**
- `sm:` (640px+): Tablet portrait
- `md:` (768px+): Tablet landscape
- `lg:` (1024px+): Desktop
- `xl:` (1280px+): Large desktop

**Mobile Optimizations:**
- Navigation allows horizontal scroll with touch
- KPI cards stack vertically
- Tables scroll horizontally
- Touch targets minimum 44×44px
- Increased padding on interactive elements

### Accessibility Features

**Keyboard Navigation:**
- Tab through all interactive elements
- Enter/Space to activate buttons
- Escape to close modals
- Focus visible on all controls

**Screen Reader Support:**
- All buttons have descriptive aria-labels
- Images have meaningful alt text
- Modals announce when opened
- Form controls properly labeled

**Color Contrast:**
- WCAG AA compliant contrast ratios
- Dark mode maintains proper contrast
- No color-only information conveyance

## Project File Structure

```
usm-cafeteria-online-ordering/
├── src/
│   ├── components/
│   │   ├── Admin/
│   │   │   ├── AdminDashboard.tsx           # Main dashboard with 5-tab navigation
│   │   │   ├── UserManagement.tsx           # User account management (Vendors/Students/Riders)
│   │   │   ├── StallApplications.tsx        # Vendor stall application review
│   │   │   ├── StallUpdateApprovals.tsx     # Stall modification approval
│   │   │   ├── OrderOversight.tsx           # Order monitoring & vendor performance
│   │   │   ├── ManageCafes.tsx              # Café/category/promo management
│   │   │   ├── ReportGeneration.tsx         # Analytics & export functionality
│   │   │   └── Toast.tsx                    # Toast notification system
│   │   ├── Auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── UpdatePassword.tsx
│   │   ├── Layout.tsx                        # Main layout with dark mode toggle
│   │   └── ... (Vendor, Student, Delivery modules)
│   ├── contexts/
│   │   ├── AuthContext.tsx                   # Authentication state management
│   │   └── DarkModeContext.tsx               # Dark mode state management
│   ├── lib/
│   │   └── supabase.ts                       # Supabase client configuration
│   ├── App.tsx                               # Route configuration with lazy loading
│   ├── main.tsx                              # App entry point
│   └── index.css                             # Global styles, dark mode, animations
├── supabase/
│   └── migrations/                           # Database migration files
├── vite.config.ts                            # Vite build configuration with code splitting
├── tailwind.config.js                        # TailwindCSS configuration
├── tsconfig.json                             # TypeScript configuration
├── package.json                              # Dependencies and scripts
└── index.html                                # HTML entry with dark mode flash prevention
```

## Build Configuration

### Vite Configuration (`vite.config.ts`)

**Manual Chunks Strategy:**
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        'recharts': ['recharts'],
        'leaflet': ['leaflet', 'react-leaflet'],
        'supabase': ['@supabase/supabase-js'],
        'jspdf': ['jspdf', 'jspdf-autotable'],
        'xlsx': ['xlsx'],
        'router': ['react-router-dom'],
        'icons': ['lucide-react'],
        'uuid': ['uuid']
      }
    }
  },
  chunkSizeWarningLimit: 1200
}
```

**Benefits:**
- Optimized bundle sizes
- Better browser caching
- Faster subsequent page loads
- Parallel chunk downloads

### Route-Level Code Splitting (`App.tsx`)

```typescript
const AdminDashboard = lazy(() => import('./components/Admin/AdminDashboard'));
const StudentDashboard = lazy(() => import('./components/Student/StudentDashboard'));
const VendorDashboard = lazy(() => import('./components/Vendor/VendorDashboard'));
const DeliveryDashboard = lazy(() => import('./components/Delivery/DeliveryDashboard'));

// Wrap routes in Suspense
<Suspense fallback={<div>Loading...</div>}>
  <Routes>
    <Route path="/admin" element={<AdminDashboard />} />
    ...
  </Routes>
</Suspense>
```

**Bundle Sizes (Production Build):**
- `index.css`: 55.97 kB (gzip: 9.17 kB)
- `AdminDashboard`: 102.07 kB (gzip: 19.71 kB)
- `react-vendor`: 205 kB (gzip: ~65 kB)
- `recharts`: 216.66 kB (gzip: 57.19 kB)
- `jspdf`: 371.96 kB (gzip: 121.27 kB) - *loaded on-demand*
- `xlsx`: 429.49 kB (gzip: 143.07 kB) - *loaded on-demand*

## Testing & Quality Assurance

### Accessibility Testing Checklist

- [x] Touch targets minimum 44×44px (WCAG 2.1 Level AA)
- [x] Keyboard navigation (Tab, Shift+Tab, Enter, Escape)
- [x] Focus visible indicators on all interactive elements
- [x] ARIA labels on all buttons and controls
- [x] Alt text on all images
- [x] Modal accessibility (role="dialog", aria-modal, focus trap)
- [x] Color contrast ratios meet WCAG AA standards (4.5:1 for normal text)
- [x] Screen reader semantic HTML (proper heading hierarchy)
- [x] Form labels and error messages
- [x] No color-only information

### Responsive Design Testing

**Test Scenarios:**
- [x] Mobile portrait (320px - 480px)
- [x] Mobile landscape (481px - 767px)
- [x] Tablet portrait (768px - 1023px)
- [x] Tablet landscape (1024px - 1279px)
- [x] Desktop (1280px - 1919px)
- [x] Large desktop (1920px+)

**Responsive Features:**
- [x] Navigation adapts (horizontal scroll on mobile)
- [x] KPI cards stack appropriately
- [x] Tables scroll horizontally on narrow screens
- [x] Charts maintain readability
- [x] Modals fit screen with max-h-[90vh]
- [x] Touch-friendly controls on mobile
- [x] No horizontal overflow

### Functional Testing Checklist

**User Management:**
- [x] View pending vendors
- [x] Approve/reject vendor applications
- [x] View all students with search/filter
- [x] Block/unblock student accounts
- [x] View delivery riders
- [x] Activate/deactivate rider accounts
- [x] Password reset functionality

**Stall Management:**
- [x] View pending stall applications
- [x] Review stall details and images
- [x] Approve/reject applications
- [x] View stall update requests
- [x] Compare current vs. proposed changes
- [x] Approve/reject update requests

**Order Management:**
- [x] View active orders with filtering
- [x] Filter by café, status, date range
- [x] Real-time order updates
- [x] Cancel orders
- [x] Status donut chart visualization
- [x] Vendor performance metrics
- [x] Revenue tracking by café

**System Configuration:**
- [x] Create/edit/delete cafés
- [x] Manage food categories
- [x] Create promo codes
- [x] Set expiry dates and usage limits
- [x] Toggle promo code activation

**Analytics & Reporting:**
- [x] View sales reports by café
- [x] Revenue trend charts
- [x] Feedback summary with ratings
- [x] Order statistics
- [x] Export to Excel (.xlsx)
- [x] Export to PDF

**UI/UX Features:**
- [x] Dark mode toggle
- [x] Theme persistence (localStorage)
- [x] Toast notifications (success/error/info/warning)
- [x] Loading states
- [x] Error handling
- [x] Form validation

### Performance Testing

**Metrics:**
- [x] Initial bundle load < 600 KB (excluding on-demand libraries)
- [x] Page load time < 3 seconds on 3G
- [x] Time to Interactive < 5 seconds
- [x] Chart rendering < 500ms
- [x] Real-time updates < 1 second latency
- [x] Export generation < 2 seconds for typical datasets

### Browser Compatibility

**Tested Browsers:**
- [x] Chrome 90+ (Chromium-based)
- [x] Firefox 88+
- [x] Safari 14+
- [x] Edge 90+
- [x] Mobile Safari (iOS 14+)
- [x] Chrome Mobile (Android 10+)

## Deployment Checklist

### Pre-Deployment

1. **Environment Variables:**
   - [ ] Set Supabase URL and Anon Key
   - [ ] Configure production API endpoints
   - [ ] Set up environment-specific configs

2. **Database:**
   - [ ] Run all migrations
   - [ ] Configure RLS policies
   - [ ] Set up admin user accounts
   - [ ] Enable real-time for required tables
   - [ ] Configure storage buckets

3. **Build:**
   - [ ] Run `npm run typecheck` (verify no errors)
   - [ ] Run `npm run build` (verify successful build)
   - [ ] Test production build locally
   - [ ] Verify all chunks generated correctly

4. **Security:**
   - [ ] Review RLS policies
   - [ ] Ensure admin-only routes protected
   - [ ] Validate file upload restrictions
   - [ ] Check for exposed API keys

### Post-Deployment

1. **Verification:**
   - [ ] Test admin login
   - [ ] Verify all dashboard tabs load
   - [ ] Test critical user flows
   - [ ] Verify real-time subscriptions work
   - [ ] Check chart rendering
   - [ ] Test export functionality
   - [ ] Verify dark mode toggle

2. **Monitoring:**
   - [ ] Set up error tracking
   - [ ] Monitor performance metrics
   - [ ] Track user analytics
   - [ ] Monitor Supabase usage

## Troubleshooting Guide

### Common Issues

**1. Charts Not Rendering**
- **Symptom:** Blank space where charts should appear
- **Solution:** Ensure ResponsiveContainer wrapped in div with explicit height
```tsx
<div style={{ height: '320px' }}>
  <ResponsiveContainer width="100%" height="100%">
    <LineChart>...</LineChart>
  </ResponsiveContainer>
</div>
```

**2. Dark Mode Flash on Load**
- **Symptom:** Brief light mode flash before dark mode applies
- **Solution:** Verify inline script in `index.html` executes before React loads
```html
<script>
  if (localStorage.getItem('darkMode') === 'true') {
    document.documentElement.classList.add('dark');
  }
</script>
```

**3. Real-time Updates Not Working**
- **Symptom:** Orders/data don't update automatically
- **Solution:** Check Supabase real-time configuration and RLS policies
- Enable real-time for tables in Supabase Dashboard > Database > Replication
- Verify channel subscription is active

**4. Export Buttons Not Working**
- **Symptom:** Nothing happens when clicking Export
- **Solution:** Check browser console for import errors
- Verify dynamic import syntax: `const XLSX = await import('xlsx');`
- Ensure libraries installed: `npm install xlsx jspdf jspdf-autotable`

**5. Horizontal Overflow on Mobile**
- **Symptom:** Page scrolls horizontally on mobile
- **Solution:** Verify `overflow-x-hidden` on html and body in `index.css`
- Check for fixed-width elements without responsive classes
- Use `w-full max-w-full` on container elements

**6. Touch Targets Too Small**
- **Symptom:** Buttons hard to tap on mobile
- **Solution:** Add `min-h-[44px]` class to all interactive elements
- Increase padding on mobile: `px-3 py-2` minimum

**7. Slow Initial Load**
- **Symptom:** Long wait time on first page load
- **Solution:** Verify code splitting and lazy loading implemented
- Check bundle sizes with `npm run build`
- Ensure heavy libraries (xlsx, jspdf) use dynamic imports

## Maintenance & Updates

### Regular Maintenance Tasks

**Weekly:**
- Review user feedback and error logs
- Monitor Supabase usage and performance
- Check for failed orders or system issues

**Monthly:**
- Update dependencies (`npm update`)
- Review and optimize database queries
- Analyze performance metrics
- Clean up old data if needed

**Quarterly:**
- Security audit of RLS policies
- Performance optimization review
- Accessibility audit with tools (Lighthouse, axe DevTools)
- Update documentation

### Future Enhancement Ideas

1. **Advanced Analytics:**
   - Peak order times heatmap
   - Customer behavior analysis
   - Predictive analytics for demand

2. **Enhanced Reporting:**
   - Custom date ranges for reports
   - Scheduled email reports
   - Comparative period analysis

3. **Automation:**
   - Auto-approve vendors meeting criteria
   - Automated fraud detection
   - Smart promo code suggestions

4. **User Experience:**
   - Bulk operations (approve multiple vendors)
   - Advanced search with multiple filters
   - Export customization options

5. **Integration:**
   - Payment gateway integration
   - SMS notifications for critical actions
   - Third-party analytics tools

## Support & Documentation

### Additional Resources

- **Supabase Documentation:** https://supabase.com/docs
- **Recharts Documentation:** https://recharts.org/en-US
- **TailwindCSS Documentation:** https://tailwindcss.com/docs
- **React Documentation:** https://react.dev
- **WCAG Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/

### Getting Help

**For Technical Issues:**
1. Check browser console for errors
2. Review this documentation's Troubleshooting section
3. Check Supabase Dashboard for API errors
4. Review RLS policies in Supabase

**For Feature Requests:**
1. Document the use case
2. Describe expected behavior
3. Provide mockups if applicable

### Version History

**v2.0.0 (November 2025) - Latest**
- Added dark mode with toggle functionality
- Implemented WCAG 2.1 Level AA accessibility
- Full mobile responsiveness (320px to 2560px+)
- Chart rendering optimization
- Performance improvements with code splitting
- On-demand library loading for exports

**v1.0.0 (October 2025) - Initial Release**
- Core admin functionality
- User management
- Order oversight
- Report generation
- Basic responsive design

