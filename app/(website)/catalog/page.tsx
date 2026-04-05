import { getCatalogProducts, getCatalogCategories } from '@/lib/data/products';
import CatalogView from './CatalogView';

/**
 * Catalog Page - Server Component with Static Generation + ISR
 *
 * Public page for displaying product catalog to customers
 * Shows products with name and quantity_per_carton > 0
 *
 * Performance Strategy:
 * - Static Generation: Pre-renders at build time
 * - ISR (Incremental Static Regeneration): Revalidates every 60 seconds
 * - CDN-friendly: Can be cached on edge for fast delivery
 */

// Enable ISR with 1 hour revalidation (يوفر موارد Vercel)
// التجديد الفوري عبر on-demand revalidation API عند تعديل المنتجات
export const revalidate = 3600; // 1 hour

// Enable static generation
export const dynamic = 'force-static';

export const metadata = {
  title: 'كتالوج المنتجات | Just A Tree',
  description: 'تصفح كتالوج منتجاتنا المتنوعة بأسعار الجملة والقطعة',
};

export default async function CatalogPage() {
  // Fetch products and categories on the server
  const [products, categories] = await Promise.all([
    getCatalogProducts(),
    getCatalogCategories(),
  ]);

  return (
    <CatalogView
      initialProducts={products}
      categories={categories}
    />
  );
}
