# Template System Documentation

## نظرة عامة

نظام Templates يفصل تصميم المتجر (Design) عن المنطق البرمجي (Engine) بحيث:
- تحديثات المشروع تنتقل بـ `git rebase` بدون تغيير شكل المتجر
- كل عميل يقدر يكون ليه template مختلف 100%

## الهيكل

```
justatree/
├── templates/                    # مجلد القوالب
│   └── default/                  # القالب الافتراضي
│       ├── index.ts              # تصدير كل الـ components
│       ├── MobileHome.tsx        # التصميم للموبايل
│       ├── TabletHome.tsx        # التصميم للتابلت
│       ├── DesktopHome.tsx       # التصميم للديسكتوب
│       ├── CategoryCarousel.tsx
│       ├── ProductCarousel.tsx
│       ├── CustomSectionCarousel.tsx
│       ├── FeaturedProductsCarousel.tsx
│       ├── SearchOverlay.tsx
│       ├── QuantityModal.tsx
│       ├── SocialMediaGrid.tsx
│       ├── ShapeSelector.tsx
│       ├── FavoriteButton.tsx
│       └── ProductVoteModal.tsx
│
├── components/website/           # Engine Components (Logic)
│   ├── ClientHomePage.tsx        # Controller - يحمل Template
│   ├── InteractiveProductCard.tsx # Logic component
│   ├── ProductVoteCard.tsx       # Logic component
│   ├── StockBadge.tsx            # Logic component
│   └── shared/
│       └── types.ts              # Types مشتركة
│
├── template.config.ts            # تحديد Template النشط
└── .gitattributes                # إعدادات Git للحفاظ على Templates
```

## كيفية إنشاء Template جديد

### 1. نسخ القالب الافتراضي
```bash
cp -r templates/default templates/my-template
```

### 2. تعديل الـ Components
عدّل الملفات في `templates/my-template/` حسب التصميم المطلوب.

### 3. تحديث الـ Config
في ملف `template.config.ts`:
```typescript
export const ACTIVE_TEMPLATE = 'my-template';

export const TEMPLATES: Record<string, TemplateInfo> = {
  default: { ... },
  'my-template': {
    name: 'My Custom Template',
    description: 'قالب مخصص للمتجر',
    author: 'Your Name',
    version: '1.0.0'
  }
};
```

## الـ Components المطلوبة

كل template يجب أن يحتوي على هذه الـ components:

### Main Pages (مطلوبة)
| Component | الوصف |
|-----------|-------|
| `MobileHome` | صفحة الهاتف الرئيسية |
| `TabletHome` | صفحة التابلت الرئيسية |
| `DesktopHome` | صفحة الكمبيوتر الرئيسية |

### UI Components (اختيارية)
| Component | الوصف |
|-----------|-------|
| `CategoryCarousel` | عرض الفئات بشكل carousel |
| `ProductCarousel` | عرض المنتجات بشكل carousel |
| `CustomSectionCarousel` | أقسام مخصصة |
| `FeaturedProductsCarousel` | المنتجات المميزة |
| `SearchOverlay` | نافذة البحث |
| `QuantityModal` | نافذة تحديد الكمية |
| `SocialMediaGrid` | روابط السوشيال ميديا |
| `ShapeSelector` | اختيار شكل المنتج |
| `FavoriteButton` | زر المفضلة |
| `ProductVoteModal` | نافذة التصويت |

## الـ Props المتوقعة

### MobileHome / TabletHome / DesktopHome
```typescript
interface HomeProps {
  userInfo: UserInfo;
  onCartUpdate: (cart: any[]) => void;
  onRemoveFromCart: (productId: string | number) => void;
  onUpdateQuantity: (productId: string | number, quantity: number) => void;
  onClearCart: () => void;
}
```

### InteractiveProductCard (من Engine)
```typescript
interface InteractiveProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => Promise<void>;
  deviceType: 'desktop' | 'tablet' | 'mobile';
  onProductClick?: (productId: string) => void;
  displaySettings: DisplaySettings;
}
```

## إعدادات Git

ملف `.gitattributes` يضمن عدم تغيير Templates أثناء `git rebase`:

```
templates/** merge=ours
template.config.ts merge=ours
```

### تفعيل الـ merge strategy
```bash
git config merge.ours.driver true
```

## أفضل الممارسات

1. **لا تعدل Engine Components**:
   - `InteractiveProductCard`
   - `StockBadge`
   - `ProductVoteCard`

2. **استخدم CSS Variables**:
   ```css
   --primary-color
   --primary-hover-color
   --interactive-color
   ```

3. **احترم الـ Types**:
   استورد Types من `@/components/website/shared/types`

4. **اختبر كل الأجهزة**:
   - موبايل
   - تابلت
   - ديسكتوب

## الفرق بين Template و Engine

| Template (Design) | Engine (Logic) |
|-------------------|----------------|
| الشكل والألوان | جلب البيانات |
| التخطيط والترتيب | إضافة للسلة |
| الـ Animations | حساب الأسعار |
| الـ Responsive | Authentication |
| Custom styling | State management |

## مثال: تغيير لون الـ Header

في `templates/my-template/MobileHome.tsx`:
```tsx
<header
  className="..."
  style={{backgroundColor: '#FF5722'}} // لون مخصص
>
```

## مثال: تغيير Grid المنتجات

في `templates/my-template/DesktopHome.tsx`:
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
  {/* 5 أعمدة بدلاً من 4 */}
</div>
```
