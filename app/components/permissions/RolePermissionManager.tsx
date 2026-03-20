'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import PermissionCategorySidebar from './PermissionCategorySidebar';
import PermissionGrid from './PermissionGrid';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useRoleRestrictions } from '@/lib/hooks/useRoleRestrictions';
import type { CategoryStats } from '@/types/permissions';

interface UserRole {
  id: string;
  name: string;
  description: string | null;
  role_type: string;
  is_active: boolean | null;
}

interface RolePermissionManagerProps {
  roles: UserRole[];
  selectedRoleId: string | null;
  onRoleChange: (roleId: string | null) => void;
}

export default function RolePermissionManager({
  roles,
  selectedRoleId,
  onRoleChange,
}: RolePermissionManagerProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  // Hooks
  const { categories, permissions, loading: permissionsLoading } = usePermissions();
  const {
    restrictions,
    loading: restrictionsLoading,
    toggleRestriction,
    restrictAll,
    unrestrictAll,
  } = useRoleRestrictions(selectedRoleId || undefined);

  // Set first category as default when categories load
  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  // Get selected role
  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  // Get selected category
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  // Get permissions for selected category
  const categoryPermissions = useMemo(() => {
    if (!selectedCategoryId) return [];
    return permissions.filter((p) => p.category_id === selectedCategoryId);
  }, [permissions, selectedCategoryId]);

  // Calculate category stats
  const categoryStats: Record<string, CategoryStats> = useMemo(() => {
    const stats: Record<string, CategoryStats> = {};
    categories.forEach((category) => {
      const categoryPerms = permissions.filter((p) => p.category_id === category.id);
      const restrictedPerms = categoryPerms.filter((p) => restrictions.includes(p.code));
      stats[category.id] = {
        categoryId: category.id,
        total: categoryPerms.length,
        restricted: restrictedPerms.length,
      };
    });
    return stats;
  }, [categories, permissions, restrictions]);

  // Handle toggle
  const handleToggle = async (permissionCode: string, restricted: boolean) => {
    await toggleRestriction(permissionCode);
  };

  // Handle enable all (restrict all in category)
  const handleEnableAll = async () => {
    const codes = categoryPermissions.map((p) => p.code);
    await restrictAll(codes);
  };

  // Handle disable all (unrestrict all in category)
  const handleDisableAll = async () => {
    const codes = categoryPermissions.map((p) => p.code);
    await unrestrictAll(codes);
  };

  const loading = permissionsLoading || restrictionsLoading;

  // Check if this is an admin role (no restrictions allowed)
  const isAdminRole = selectedRole?.name === 'أدمن رئيسي';

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <PermissionCategorySidebar
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onCategorySelect={setSelectedCategoryId}
        categoryStats={categoryStats}
      />

      {/* Main Content */}
      <div className="flex-1">
        {/* Role Selector */}
        <div className="bg-[var(--dash-bg-surface)] rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-[var(--dash-text-muted)]">الدور:</span>
              <div className="relative">
                <button
                  onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                  className="flex items-center gap-2 bg-[var(--dash-bg-raised)] px-4 py-2 rounded-lg text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)] transition-colors"
                >
                  <span>{selectedRole?.name || 'اختر دورًا'}</span>
                  <ChevronDownIcon className="w-4 h-4" />
                </button>

                {isRoleDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--dash-bg-raised)] rounded-lg shadow-lg z-10 overflow-hidden">
                    {roles.map((role) => (
                      <button
                        key={role.id}
                        onClick={() => {
                          onRoleChange(role.id);
                          setIsRoleDropdownOpen(false);
                        }}
                        className={`
                          w-full px-4 py-2 text-right hover:bg-[var(--dash-bg-overlay)] transition-colors
                          ${selectedRoleId === role.id ? 'bg-blue-600 text-white' : 'text-[var(--dash-text-secondary)]'}
                        `}
                      >
                        {role.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {selectedRole && (
              <div className="text-sm">
                {isAdminRole ? (
                  <span className="text-green-400">الأدمن الرئيسي له كل الصلاحيات</span>
                ) : (
                  <span className="text-[var(--dash-text-muted)]">
                    عدد القيود: {restrictions.length}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* No Role Selected */}
        {!selectedRoleId && (
          <div className="flex-1 flex items-center justify-center text-[var(--dash-text-muted)] min-h-[400px]">
            <div className="text-center">
              <p className="text-lg mb-2">اختر دورًا لإدارة صلاحياته</p>
              <p className="text-sm">حدد دورًا من القائمة أعلاه لعرض وتعديل صلاحياته</p>
            </div>
          </div>
        )}

        {/* Admin Role Warning */}
        {selectedRoleId && isAdminRole && (
          <div className="flex-1 flex items-center justify-center text-[var(--dash-text-muted)] min-h-[400px]">
            <div className="text-center bg-green-500/10 border border-green-500/30 rounded-lg p-6">
              <p className="text-lg text-green-400 mb-2">الأدمن الرئيسي</p>
              <p className="text-sm text-[var(--dash-text-secondary)]">
                هذا الدور له كل الصلاحيات ولا يمكن تعديل قيوده
              </p>
            </div>
          </div>
        )}

        {/* Permission Grid */}
        {selectedRoleId && !isAdminRole && (
          <>
            {loading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
              </div>
            ) : (
              <PermissionGrid
                permissions={categoryPermissions}
                restrictions={restrictions}
                onToggle={handleToggle}
                onEnableAll={handleEnableAll}
                onDisableAll={handleDisableAll}
                categoryName={selectedCategory?.name}
                disabled={false}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
