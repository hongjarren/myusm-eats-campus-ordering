# USM Cafeteria Online Ordering System - Project Structure

## Overview
A comprehensive web application for USM cafeteria online ordering and delivery management system with role-based access for students, vendors, delivery personnel, and administrators.

## Database Schema

### Tables Created

1. **profiles** - Extended user information
   - Links to Supabase auth.users
   - Stores role (student/vendor/delivery/admin)
   - Contains matric ID, phone, hostel address

2. **cafes** - Cafeteria information
   - Managed by vendors
   - Location-based (Tekun, Aman, Fajar Harapan, etc.)
   - Operating hours and contact details

3. **categories** - Menu categories
   - Pre-seeded: Rice, Noodles, Western, Drinks, Snacks

4. **menu_items** - Food items
   - Belongs to cafes
   - Price, prep time, availability status
   - Categorized items with images

5. **orders** - Customer orders
   - Links customers to cafes
   - Order status tracking
   - Payment information
   - Delivery/pickup options

6. **order_items** - Items in each order
   - Junction table for orders and menu items
   - Quantity and special instructions

7. **deliveries** - Delivery tracking
   - Links riders to orders
   - Status updates (assigned → picked_up → en_route → delivered)
   - Timestamp tracking

8. **reviews** - Customer feedback
   - Rating system (overall, food, service)
   - Comments and vendor responses

9. **promo_codes** - Promotional discounts
   - Percentage or fixed amount
   - Usage limits and validity periods

## Application Structure

### Authentication System
- **Email/Password Authentication** via Supabase Auth
- **Role-based Registration** (Student, Vendor, Delivery, Admin)
- **Profile Management** with automatic profile creation on signup

### Modules Implemented

#### 1. User Module (Student/Customer) - `/src/components/Student/`
**Implemented Features:**
- Browse cafeterias by location
- View cafe listings with location filtering
- Dashboard with statistics
- Profile display

**To Be Developed:**
- Menu browsing per cafe
- Shopping cart functionality
- Checkout and payment
- Order tracking
- Order history
- Feedback and ratings

#### 2. Vendor/Cafeteria Module - `/src/components/Vendor/`
**Implemented Features:**
- Vendor dashboard with order statistics
- Recent orders display
- Revenue tracking
- Cafe information display

**To Be Developed:**
- Cafe registration/management
- Menu item CRUD operations
- Order status updates
- Sales reports and analytics
- Customer feedback management

#### 3. Delivery Module - `/src/components/Delivery/`
**Implemented Features:**
- Delivery dashboard
- Active deliveries list
- Delivery statistics
- Earnings tracking

**To Be Developed:**
- Delivery assignment system
- Status update functionality
- Route navigation/mapping
- Delivery history
- Performance metrics

#### 4. Admin Module - `/src/components/Admin/`
**Implemented Features:**
- System overview dashboard
- User, cafe, and order statistics
- System health monitoring
- Revenue tracking

**To Be Developed:**
- User management (approve/block)
- Cafe approval system
- System configuration
- Report generation
- Promo code management

#### 5. Recommendation Module
**To Be Developed:**
- Smart recommendations based on order history
- Trending items display
- Location-based suggestions
- Personalized promotions

## Component Structure

```
src/
├── lib/
│   └── supabase.ts                    # Supabase client & TypeScript types
├── contexts/
│   └── AuthContext.tsx                # Authentication context & hooks
├── components/
│   ├── Layout.tsx                     # Main layout with navigation
│   ├── Auth/
│   │   ├── LoginForm.tsx             # Login functionality
│   │   └── RegisterForm.tsx          # Registration functionality
│   ├── Student/
│   │   └── StudentDashboard.tsx      # Student main view
│   ├── Vendor/
│   │   └── VendorDashboard.tsx       # Vendor main view
│   ├── Delivery/
│   │   └── DeliveryDashboard.tsx     # Delivery personnel view
│   └── Admin/
│       └── AdminDashboard.tsx        # Admin main view
└── App.tsx                           # Main app with routing logic
```

## Security Implementation

### Row Level Security (RLS)
All tables have RLS enabled with policies for:
- Users can only view/edit their own data
- Vendors can only manage their own cafes and orders
- Delivery personnel can only view assigned deliveries
- Cross-module access properly secured

### Key Security Features
- Authentication required for all operations
- Role-based access control
- Ownership verification for updates
- Protected vendor and admin functions

## Next Development Steps

### Priority 1 - Student Module Completion
1. **Menu Browsing**
   - Create MenuView component
   - Implement menu item cards with images
   - Add filtering by category
   - Search functionality

2. **Shopping Cart**
   - Cart context for state management
   - Add/remove items
   - Quantity adjustment
   - Price calculation

3. **Checkout Process**
   - Delivery address selection
   - Payment method selection
   - Promo code application
   - Order confirmation

4. **Order Tracking**
   - Real-time status updates
   - Estimated time display
   - Order details view

### Priority 2 - Vendor Module Completion
1. **Cafe Management**
   - Cafe registration form
   - Edit cafe details
   - Operating hours management

2. **Menu Management**
   - Add/edit/delete menu items
   - Image upload functionality
   - Availability toggle
   - Category assignment

3. **Order Management**
   - Incoming order notifications
   - Order detail view
   - Status update interface
   - Order completion workflow

### Priority 3 - Delivery Module Completion
1. **Delivery Assignment**
   - Available deliveries list
   - Accept delivery functionality
   - Auto-assignment logic

2. **Delivery Tracking**
   - Status update buttons
   - Location tracking (Google Maps API)
   - Delivery proof upload
   - Customer contact info

### Priority 4 - Advanced Features
1. **Recommendation Engine**
   - Order history analysis
   - Trending items algorithm
   - Personalized suggestions
   - Special offers display

2. **Payment Integration**
   - Simulated payment gateway
   - Payment status tracking
   - Receipt generation

3. **Analytics & Reports**
   - Sales reports
   - Popular items analysis
   - Peak hours tracking
   - Customer insights

4. **Notifications**
   - Real-time order updates
   - Push notifications
   - Email notifications

## Running the Application

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Type Checking
```bash
npm run typecheck
```

## Environment Variables
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Technology Stack
- **Frontend:** React 18 + TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Build Tool:** Vite
- **State Management:** React Context API

## Database Relationships
- profiles (1) → (many) cafes
- cafes (1) → (many) menu_items
- profiles (1) → (many) orders
- orders (1) → (many) order_items
- orders (1) → (1) deliveries
- orders (1) → (many) reviews

## Key Features Implemented
✅ Database schema with RLS
✅ User authentication (login/register)
✅ Role-based dashboards
✅ Cafe browsing with location filter
✅ Order tracking foundation
✅ Vendor order management foundation
✅ Delivery assignment foundation
✅ Admin statistics dashboard

## Notes for Development
1. All database operations use Supabase client
2. TypeScript interfaces defined in `lib/supabase.ts`
3. Authentication state managed via Context API
4. All components follow responsive design principles
5. Tailwind CSS used for consistent styling
6. Icons from Lucide React library

## Testing Accounts
Create test accounts for each role:
- **Student:** student@student.usm.my
- **Vendor:** vendor@student.usm.my
- **Delivery:** delivery@student.usm.my
- **Admin:** admin@student.usm.my

## Project Deliverables Alignment
This backbone supports all required modules from your CMT322 project:
- ✅ User Module structure
- ✅ Vendor Module structure
- ✅ Delivery Module structure
- ✅ Admin Module structure
- 🚧 Recommendation Module (to be implemented)

The template is production-ready for demonstration and ready for feature completion.
