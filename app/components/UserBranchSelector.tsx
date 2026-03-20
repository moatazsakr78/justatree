'use client';

import { useState, useEffect } from 'react';
import { BuildingStorefrontIcon, CheckIcon, StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { supabase } from '@/app/lib/supabase/client';

interface Branch {
  id: string;
  name: string;
  is_active: boolean;
  is_default: boolean;
}

interface UserBranchAssignment {
  id: string;
  user_id: string;
  branch_id: string;
  is_default: boolean;
}

interface UserBranchSelectorProps {
  userId: string;
  onSave?: () => void;
  className?: string;
}

export default function UserBranchSelector({ userId, onSave, className = '' }: UserBranchSelectorProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState<Set<string>>(new Set());
  const [defaultBranchId, setDefaultBranchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all active branches
  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, is_active, is_default')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching branches:', error);
        setError('فشل في جلب الفروع');
        return;
      }

      setBranches(data || []);
    } catch (err) {
      console.error('Error in fetchBranches:', err);
      setError('حدث خطأ في جلب الفروع');
    }
  };

  // Fetch user's current branch assignments
  const fetchUserAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('user_branch_assignments')
        .select('id, user_id, branch_id, is_default')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user assignments:', error);
        return;
      }

      if (data && data.length > 0) {
        const branchIds = new Set(data.map((a: UserBranchAssignment) => a.branch_id));
        setSelectedBranchIds(branchIds);

        const defaultAssignment = data.find((a: UserBranchAssignment) => a.is_default);
        if (defaultAssignment) {
          setDefaultBranchId(defaultAssignment.branch_id);
        } else if (data.length > 0) {
          // If no default is set, use the first assigned branch
          setDefaultBranchId(data[0].branch_id);
        }
      }
    } catch (err) {
      console.error('Error in fetchUserAssignments:', err);
    }
  };

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchBranches();
      await fetchUserAssignments();
      setIsLoading(false);
    };

    if (userId) {
      loadData();
    }
  }, [userId]);

  // Toggle branch selection
  const toggleBranch = (branchId: string) => {
    setSelectedBranchIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(branchId)) {
        newSet.delete(branchId);
        // If removing the default branch, set another one as default
        if (defaultBranchId === branchId) {
          const remaining = Array.from(newSet);
          setDefaultBranchId(remaining.length > 0 ? remaining[0] : null);
        }
      } else {
        newSet.add(branchId);
        // If this is the first branch, set it as default
        if (newSet.size === 1) {
          setDefaultBranchId(branchId);
        }
      }
      return newSet;
    });
  };

  // Set default branch
  const setAsDefault = (branchId: string) => {
    if (selectedBranchIds.has(branchId)) {
      setDefaultBranchId(branchId);
    }
  };

  // Save assignments to database
  const saveAssignments = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // Delete existing assignments
      const { error: deleteError } = await supabase
        .from('user_branch_assignments')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Error deleting old assignments:', deleteError);
        setError('فشل في حذف التعيينات القديمة');
        return;
      }

      // Insert new assignments
      if (selectedBranchIds.size > 0) {
        const assignments = Array.from(selectedBranchIds).map((branchId) => ({
          user_id: userId,
          branch_id: branchId,
          is_default: branchId === defaultBranchId,
        }));

        const { error: insertError } = await supabase
          .from('user_branch_assignments')
          .insert(assignments);

        if (insertError) {
          console.error('Error inserting assignments:', insertError);
          setError('فشل في حفظ التعيينات');
          return;
        }
      }

      onSave?.();
    } catch (err) {
      console.error('Error in saveAssignments:', err);
      setError('حدث خطأ في حفظ التعيينات');
    } finally {
      setIsSaving(false);
    }
  };

  // Select all branches
  const selectAll = () => {
    const allIds = new Set(branches.map((b) => b.id));
    setSelectedBranchIds(allIds);
    if (!defaultBranchId && branches.length > 0) {
      // Set system default branch or first branch as default
      const systemDefault = branches.find((b) => b.is_default);
      setDefaultBranchId(systemDefault?.id || branches[0].id);
    }
  };

  // Clear all selections
  const clearAll = () => {
    setSelectedBranchIds(new Set());
    setDefaultBranchId(null);
  };

  if (isLoading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="flex items-center gap-2 text-[var(--dash-text-muted)]">
          <div className="animate-spin h-4 w-4 border-2 border-[var(--dash-text-muted)] border-t-transparent rounded-full"></div>
          <span>جاري تحميل الفروع...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Header with actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BuildingStorefrontIcon className="h-5 w-5 text-blue-400" />
          <h3 className="text-[var(--dash-text-primary)] font-medium">الفروع المخصصة</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={selectAll}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            تحديد الكل
          </button>
          <span className="text-[var(--dash-text-disabled)]">|</span>
          <button
            onClick={clearAll}
            className="text-xs text-[var(--dash-text-muted)] hover:text-[var(--dash-text-secondary)] transition-colors"
          >
            إلغاء الكل
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Branch list */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {branches.map((branch) => {
          const isSelected = selectedBranchIds.has(branch.id);
          const isDefault = defaultBranchId === branch.id;

          return (
            <div
              key={branch.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-blue-500/10 border-blue-500/50'
                  : 'bg-[var(--dash-bg-base)]/50 border-[var(--dash-border-subtle)] hover:border-[var(--dash-border-default)]'
              }`}
              onClick={() => toggleBranch(branch.id)}
            >
              {/* Checkbox */}
              <div
                className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'bg-blue-500' : 'border border-[var(--dash-border-default)]'
                }`}
              >
                {isSelected && <CheckIcon className="h-3 w-3 text-white" />}
              </div>

              {/* Branch name */}
              <span className={`flex-grow ${isSelected ? 'text-[var(--dash-text-primary)]' : 'text-[var(--dash-text-muted)]'}`}>
                {branch.name}
              </span>

              {/* Default star */}
              {isSelected && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAsDefault(branch.id);
                  }}
                  className={`p-1 rounded transition-colors ${
                    isDefault
                      ? 'text-yellow-400'
                      : 'text-[var(--dash-text-disabled)] hover:text-yellow-400'
                  }`}
                  title={isDefault ? 'الفرع الافتراضي' : 'تعيين كفرع افتراضي'}
                >
                  {isDefault ? (
                    <StarIconSolid className="h-4 w-4" />
                  ) : (
                    <StarIcon className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected count and save button */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-[var(--dash-text-muted)]">
          {selectedBranchIds.size} فرع محدد
        </span>
        <button
          onClick={saveAssignments}
          disabled={isSaving}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-[var(--dash-bg-overlay)] disabled:cursor-not-allowed text-[var(--dash-text-primary)] rounded-lg transition-colors text-sm font-medium"
        >
          {isSaving ? 'جاري الحفظ...' : 'حفظ'}
        </button>
      </div>

      {/* Help text */}
      <p className="mt-2 text-xs text-[var(--dash-text-disabled)]">
        النجمة تحدد الفرع الافتراضي الذي سيظهر عند تسجيل الدخول
      </p>
    </div>
  );
}
