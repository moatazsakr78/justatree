#!/bin/bash
# ============================================
# Sync justatree from elfaroukgroup
# يحدث كود justatree من elfaroukgroup مع الحفاظ على هوية justatree
# ============================================

set -e

echo "=========================================="
echo " Syncing justatree from elfaroukgroup..."
echo "=========================================="

# 1. Fetch latest from elfaroukgroup
echo ""
echo "[1/8] Fetching latest from elfaroukgroup..."
git fetch elfaroukgroup

# 2. Save justatree-specific files before reset
echo "[2/8] Saving justatree files..."
BACKUP_DIR=$(mktemp -d)

# Save logo
if [ -f "public/assets/logo/justatree.png" ]; then
  cp "public/assets/logo/justatree.png" "$BACKUP_DIR/justatree.png"
  echo "  -> Logo saved"
fi

# Save this sync script (it doesn't exist in elfaroukgroup)
cp "sync-from-elfaroukgroup.sh" "$BACKUP_DIR/sync-from-elfaroukgroup.sh"
echo "  -> Sync script saved"

# Save CLAUDE.md (keep justatree-specific docs, don't overwrite with elfaroukgroup version)
if [ -f "CLAUDE.md" ]; then
  cp "CLAUDE.md" "$BACKUP_DIR/CLAUDE.md"
  echo "  -> CLAUDE.md saved"
fi

# 3. Reset to elfaroukgroup/main
echo "[3/8] Resetting to elfaroukgroup/main..."
git reset --hard elfaroukgroup/main
echo "  -> Code synced!"

# 4. Replace all 'elfaroukgroup' schema references with 'justatree' across the entire codebase
echo "[4/8] Replacing elfaroukgroup schema with justatree in all source files..."
FILES_CHANGED=0
for f in $(grep -rl "elfaroukgroup" --include="*.ts" --include="*.tsx" --include="*.sql" --include="*.md" --include="*.json" --include="*.example" . | grep -v node_modules | grep -v .git | grep -v CLAUDE.md); do
  sed -i "s/elfaroukgroup/justatree/g" "$f"
  FILES_CHANGED=$((FILES_CHANGED + 1))
done
echo "  -> Replaced in $FILES_CHANGED files"

# 5. Restore client.config.ts with justatree values
echo "[5/8] Restoring justatree identity in client.config.ts..."
cat > client.config.ts << 'EOF'
// Client-specific configuration - DO NOT commit this file
// Copy from client.config.example.ts and customize for each client

export const CLIENT_CONFIG = {
  // Database Schema
  schema: 'justatree' as const,
  supabaseProjectId: 'hecedrbnbknohssgaoso',

  // Branding
  appName: 'Just A Tree Store',
  shortName: 'justatree',
  companyName: 'Just A Tree',
  description: 'متجرك المتكامل للحصول على أفضل المنتجات بأسعار مميزة وجودة عالية',

  // Theme Colors
  themeColor: '#DC2626',
  backgroundColor: '#111827',
  primaryColor: '#3B82F6',
  secondaryColor: '#10B981',

  // Logo
  logoPath: '/assets/logo/justatree.png',

  // Currency
  defaultCurrency: 'ريال',
  websiteCurrency: 'جنيه',

  // Language
  lang: 'ar',
  dir: 'rtl' as const,
}

export type SchemaName = typeof CLIENT_CONFIG.schema
EOF
echo "  -> client.config.ts restored"

# 6. Restore manifest.json with justatree branding
echo "[6/8] Restoring justatree manifest.json..."
cat > public/manifest.json << 'EOF'
{
  "name": "Just A Tree - POS System",
  "short_name": "POS",
  "description": "نظام نقاط البيع - Just A Tree",
  "start_url": "/pos",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#1F2937",
  "theme_color": "#DC2626",
  "lang": "ar",
  "dir": "rtl",
  "icons": [
    {
      "src": "/assets/logo/justatree.png",
      "sizes": "any",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/assets/logo/justatree.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "categories": ["business", "productivity"],
  "prefer_related_applications": false
}
EOF
echo "  -> manifest.json restored"

# 7. Restore justatree logo
echo "[7/8] Restoring justatree logo..."
if [ -f "$BACKUP_DIR/justatree.png" ]; then
  cp "$BACKUP_DIR/justatree.png" "public/assets/logo/justatree.png"
  echo "  -> Logo restored"
else
  echo "  -> WARNING: No logo backup found, skipping"
fi

# 8. Restore sync script and CLAUDE.md
echo "[8/8] Restoring sync script and CLAUDE.md..."
cp "$BACKUP_DIR/sync-from-elfaroukgroup.sh" "sync-from-elfaroukgroup.sh"
chmod +x "sync-from-elfaroukgroup.sh"
echo "  -> Sync script restored"

if [ -f "$BACKUP_DIR/CLAUDE.md" ]; then
  cp "$BACKUP_DIR/CLAUDE.md" "CLAUDE.md"
  echo "  -> CLAUDE.md restored (kept justatree version)"
fi

# Cleanup temp
rm -rf "$BACKUP_DIR"

# Update .env.example site URL
if [ -f ".env.example" ]; then
  sed -i "s|https://elfaroukgroup.online|https://justatree.online|g" ".env.example"
  echo "  -> .env.example URL updated"
fi

# Stage and commit
echo ""
echo "=========================================="
echo " Committing justatree identity..."
echo "=========================================="
git add -A
git commit -m "sync from elfaroukgroup + restore justatree identity" || echo "No changes to commit"

echo ""
echo "=========================================="
echo " DONE! justatree is now synced."
echo "=========================================="
echo ""
echo "To push to GitHub, run:"
echo "  git push --force origin main"
echo ""
