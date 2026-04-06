# El Farouk Group - POS & E-Commerce System

## Project Overview
نظام متكامل يجمع بين:
- **POS System**: نظام نقاط البيع للموظفين والإدارة
- **E-Commerce Store**: متجر إلكتروني للعملاء مُحسّن للأداء العالي

---

## Development Commands
```bash
npm run dev        # Start development server (http://localhost:3000)
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint checks
npm run typecheck  # Run TypeScript checks
```

---

## Project Structure
```
justatree/
├── app/
│   ├── (dashboard)/           # POS & Admin System (للموظفين)
│   │   ├── dashboard/         # لوحة التحكم الرئيسية
│   │   ├── pos/               # نقطة البيع
│   │   ├── products/          # إدارة المنتجات
│   │   ├── inventory/         # إدارة المخزون
│   │   ├── customers/         # إدارة العملاء
│   │   ├── suppliers/         # إدارة الموردين
│   │   ├── customer-orders/   # طلبات العملاء
│   │   ├── reports/           # التقارير
│   │   ├── permissions/       # الصلاحيات
│   │   ├── settings/          # الإعدادات
│   │   ├── payment-methods/   # طرق الدفع
│   │   ├── safes/             # الخزائن
│   │   └── whatsapp/          # رسائل واتساب
│   │
│   ├── (website)/             # E-Commerce Store (للعملاء)
│   │   ├── profile/           # بروفايل العميل
│   │   ├── my-orders/         # طلباتي
│   │   ├── my-invoices/       # فواتيري
│   │   ├── shipping/          # تتبع الشحن
│   │   └── admin/products/    # إدارة منتجات المتجر
│   │
│   ├── auth/                  # صفحات المصادقة
│   ├── product/[id]/          # صفحة تفاصيل المنتج
│   ├── prepare-order/         # تجهيز الطلب
│   │
│   ├── api/                   # API Routes
│   │   ├── auth/[...nextauth]/ # NextAuth.js endpoints
│   │   ├── supabase/          # Supabase proxy
│   │   ├── user/orders/       # طلبات المستخدم
│   │   ├── revalidate/        # Cache revalidation
│   │   └── analyze-receipt/   # تحليل الإيصالات
│   │
│   ├── components/            # Reusable Components
│   │   ├── auth/              # مكونات المصادقة
│   │   ├── layout/            # مكونات التخطيط
│   │   ├── tables/            # الجداول
│   │   └── ui/                # مكونات UI الأساسية
│   │
│   ├── lib/                   # Utility Libraries
│   │   ├── auth/              # Auth utilities
│   │   ├── cache/             # Memory caching
│   │   ├── contexts/          # React Contexts
│   │   ├── hooks/             # Custom React Hooks
│   │   ├── services/          # Business services
│   │   └── utils/             # Helper functions
│   │
│   ├── types/                 # TypeScript Definitions
│   ├── globals.css            # Global Styles
│   ├── layout.tsx             # Root Layout
│   └── providers.tsx          # App Providers
│
├── lib/                       # Shared Libraries
│   ├── auth.ts                # NextAuth configuration
│   ├── supabase.ts            # Supabase client
│   └── hooks/                 # Shared hooks
│
├── components/                # Shared Components
├── types/                     # Shared Types
├── public/                    # Static Assets
│   └── manifest.json          # PWA Manifest
├── ui-designs/                # UI Reference Designs
├── middleware.ts              # Next.js Middleware
└── ...config files
```

---

## Database Configuration

### Connection Details
- **Supabase Project ID**: `hecedrbnbknohssgaoso`
- **Region**: eu-central-1
- **Status**: ACTIVE_HEALTHY
- **Database Version**: PostgreSQL 17.6.1.021

### CRITICAL: Schema Usage
```
Schema Name: justatree (NOT public)
```

**IMPORTANT**: This project uses the `justatree` schema, NOT the default `public` schema.
- All queries MUST use `justatree` schema
- Example: `justatree.products`, `justatree.customers`
- The `public` schema contains only utility tables

### CRITICAL: Authentication & Security
```
Authentication: NextAuth.js (NOT Supabase Auth)
RLS: DISABLED (Security at application level)
```

**Why NOT Supabase Auth?**
- Supabase Auth limit: 100,000 MAU (Monthly Active Users)
- After limit, costs become very expensive
- External auth provides more control and scalability

**Authentication Tables** (in `justatree` schema):
- `auth_users` - User accounts
- `auth_sessions` - Active sessions
- `auth_accounts` - OAuth provider accounts
- `auth_verification_tokens` - Email verification

**Security Model**:
- NO RLS (Row Level Security) - Supabase RLS is disabled
- Security handled at application level in Next.js API routes
- All operations go through server-side validation

### Database Tables (65 total in `justatree` schema)

#### Authentication
- `auth_users`, `auth_sessions`, `auth_accounts`, `auth_verification_tokens`

#### Products & Categories
- `products`, `categories`, `product_images`, `product_videos`
- `product_variants`, `product_sizes`, `product_votes`, `product_ratings`
- `product_size_groups`, `product_size_group_items`

#### Inventory & Stock
- `inventory`, `branch_stocks`, `warehouse_stocks`
- `branches`, `warehouses`

#### Sales & Orders
- `sales`, `sale_items`, `orders`, `order_items`, `cart_items`

#### Customers & Suppliers
- `customers`, `customer_groups`, `customer_payments`, `customer_merges`
- `suppliers`, `supplier_groups`, `supplier_payments`, `supplier_merges`

#### Purchases
- `purchase_invoices`, `purchase_invoice_items`

#### Cash & Finance
- `cash_drawers`, `cash_drawer_transactions`, `cashbox_entries`
- `expenses`, `payment_methods`, `payment_receipts`

#### Shipping
- `shipping_companies`, `shipping_governorates`, `shipping_areas`

#### Store/E-commerce
- `store_categories`, `store_category_products`, `store_theme_colors`
- `custom_sections`, `favorites`

#### Settings & System
- `system_settings`, `user_preferences`, `user_profiles`, `user_roles`
- `user_column_preferences`, `records`, `pos_tabs_state`

---

## Architecture: Dual System Design

### 1. POS System (Dashboard)
للموظفين والإدارة - يتطلب Real-time وميزات متقدمة

**Features:**
- Real-time data subscriptions
- Full CRUD operations
- Complex queries and reports
- Role-based access control

### 2. E-Commerce Store (Website)
للعملاء - مُحسّن للأداء العالي وتحمل عدد كبير من المستخدمين

**Performance Strategy:**
```
Priority: High Performance + Low Server Cost + Scalability
Goal: Handle 50,000+ monthly users efficiently
```

#### CDN & Static Optimization
- **Static Generation (SSG)**: Product pages generated at build time
- **CDN Caching**: Static assets served from edge locations
- **Image Optimization**: WebP format, lazy loading, responsive images
- **Incremental Static Regeneration (ISR)**: Update static pages without rebuild

#### Server Load Reduction
- **NO real-time subscriptions** for customer-facing pages
- **Minimal server queries**: Only essential data fetched
- **Memory-only caching**: No expensive database hits
- **API Routes caching**: Response caching with proper headers

#### Dynamic Data (When Needed)
بعض البيانات لازم تيجي من السيرفر للعميل:
- **كشف حساب العميل**: رصيد، مديونية
- **طلباتي**: حالة الطلب، تتبع الشحن
- **الكمية المتاحة**: Stock availability (real-time check at checkout)
- **الأسعار الخاصة**: Customer-specific pricing

#### Balance: Performance + User Experience
```
Static Data (CDN):          Dynamic Data (Server):
├── Product info            ├── Customer balance
├── Product images          ├── Order status
├── Categories              ├── Stock quantity
├── Store design            ├── Cart operations
└── General content         └── Checkout process
```

---

## Key Technologies

### Core Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: NextAuth.js v5 (Auth.js)

### Key Dependencies
```json
{
  "next": "14.2.5",
  "next-auth": "^5.0.0-beta.30",
  "@supabase/supabase-js": "^2.39.3",
  "swr": "^2.3.6",
  "@dnd-kit/core": "^6.3.1",
  "xlsx": "^0.18.5",
  "jsbarcode": "^3.12.1",
  "react-barcode": "^1.6.1"
}
```

### React Contexts (Providers)
```tsx
<Providers>
  <ThemeProvider>           // Theme management
    <SystemSettingsProvider> // System settings
      <CurrencyProvider>     // Currency handling
        <UserProfileProvider> // User profile
          <CartProvider>      // Shopping cart
            {children}
          </CartProvider>
        </UserProfileProvider>
      </CurrencyProvider>
    </SystemSettingsProvider>
  </ThemeProvider>
</Providers>
```

---

## UI Design Requirements

### Theme
- **Style**: Dark theme with blue accents
- **Language**: Arabic RTL interface
- **Font**: Cairo Arabic font family

### Colors
```css
Primary Dark:   #2B3544
Darker:         #1F2937
Blue:           #3B82F6
Green:          #10B981 (active/success)
Red:            #EF4444 (inactive/error)
Orange:         #F59E0B (warning)
Gray:           #6B7280
Theme Color:    #DC2626 (Store branding)
```

### Design References
Located in `/ui-designs/`:
- `pos.png` - POS page
- `products.png` - Products page
- `inventory.png` - Inventory page
- `customers.png` - Customers page
- `suppliers.png` - Suppliers page
- `records.png` - Records page
- `menu.png` - Navigation menu

### Scrollbar Styling
```css
/* Hide scrollbars but keep functionality */
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
```

---

## PWA Configuration
The app is a Progressive Web App:
- **Manifest**: `/public/manifest.json`
- **Icons**: El Farouk Group branding
- **Theme Color**: #DC2626
- **Installable**: Add to homescreen support

---

## Environment Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# NextAuth
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

---

## Important Notes

### Schema Reminder
Always use `justatree` schema, not `public`:
```sql
-- Correct
SELECT * FROM justatree.products;

-- Wrong
SELECT * FROM public.products;
SELECT * FROM products;
```

### No Supabase Auth/RLS
- Authentication via NextAuth.js
- No RLS policies - security at API level
- Validate sessions in API routes

### Performance First (Store)
- Minimize server calls for customer pages
- Use CDN for static content
- Only fetch dynamic data when necessary
