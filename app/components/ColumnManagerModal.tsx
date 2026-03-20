'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/app/lib/supabase/client';

interface Column {
  id: string;
  header: string;
  accessor: string;
  width: number;
  visible?: boolean;
  render?: (value: any, item?: any, index?: number) => any;
}

interface ColumnManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: Column[];
  onColumnsChange: (columns: Column[]) => void;
  reportType: string; // Used to identify which report's settings to save
}

export default function ColumnManagerModal({
  isOpen,
  onClose,
  columns,
  onColumnsChange,
  reportType
}: ColumnManagerModalProps) {
  const [localColumns, setLocalColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Initialize local columns when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalColumns([...columns]);
    }
  }, [isOpen, columns]);

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  // Load saved column settings from database
  useEffect(() => {
    const loadColumnSettings = async () => {
      if (!currentUserId || !reportType) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_column_preferences')
          .select('preferences')
          .eq('user_id', currentUserId)
          .eq('report_type', reportType)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error loading column settings:', error);
        }

        if (data?.preferences) {
          const settings = Array.isArray(data.preferences) ? data.preferences : [];
          const updatedColumns = columns.map(col => {
            const savedCol = settings.find((s: any) => s.id === col.id) as any;
            return savedCol 
              ? { ...col, visible: savedCol.visible, width: savedCol.width } 
              : { ...col, visible: col.visible !== false };
          });
          setLocalColumns(updatedColumns);
        } else {
          setLocalColumns(columns.map(col => ({ ...col, visible: col.visible !== false })));
        }
      } catch (error) {
        console.error('Error loading column settings:', error);
        setLocalColumns(columns.map(col => ({ ...col, visible: col.visible !== false })));
      } finally {
        setLoading(false);
      }
    };

    loadColumnSettings();
  }, [columns, reportType, currentUserId]);

  const toggleColumnVisibility = (columnId: string) => {
    setLocalColumns(prev => 
      prev.map(col => 
        col.id === columnId 
          ? { ...col, visible: !col.visible }
          : col
      )
    );
  };

  const saveSettings = async () => {
    if (!currentUserId) {
      console.error('No user ID available for saving settings');
      return;
    }

    setLoading(true);
    try {
      // Save to database
      const settings = localColumns.map(col => ({
        id: col.id,
        visible: col.visible,
        width: col.width
      }));

      const { error } = await supabase
        .from('user_column_preferences')
        .upsert({
          user_id: currentUserId,
          report_type: reportType,
          preferences: settings
        });

      if (error) {
        console.error('Error saving column settings:', error);
        return;
      }

      // Apply changes to parent component
      onColumnsChange(localColumns);
      onClose();
    } catch (error) {
      console.error('Error saving column settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectAll = () => {
    setLocalColumns(prev => prev.map(col => ({ ...col, visible: true })));
  };

  const deselectAll = () => {
    setLocalColumns(prev => prev.map(col => ({ ...col, visible: false })));
  };

  if (!isOpen) return null;

  const visibleCount = localColumns.filter(col => col.visible).length;
  const totalCount = localColumns.length;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" dir="rtl">
      <div className="bg-[var(--dash-bg-surface)] rounded-lg shadow-[var(--dash-shadow-lg)] w-full max-w-md mx-4 max-h-[80vh] flex flex-col animate-dash-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--dash-border-default)]">
          <button
            onClick={onClose}
            className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-medium text-[var(--dash-text-primary)]">إدارة الأعمدة</h2>
          <div></div> {/* Spacer for centering */}
        </div>

        {/* Action Buttons */}
        <div className="px-4 py-3">
          <div className="flex gap-2 justify-center">
            <button
              onClick={deselectAll}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors font-medium"
            >
              إلغاء تحديد الكل
            </button>
            <button
              onClick={selectAll}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors font-medium"
            >
              تحديد الكل
            </button>
          </div>
        </div>

        {/* Columns List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-4">
          <div className="space-y-1">
            {localColumns.map((column) => (
              <div
                key={column.id}
                className="flex items-center justify-between px-4 py-3 bg-[#3B4451] hover:bg-[#434B59] rounded transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[var(--dash-text-secondary)] text-sm font-medium">{column.width}px</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[var(--dash-text-primary)] font-medium">
                    {column.header}
                  </span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={column.visible}
                      onChange={() => toggleColumnVisibility(column.id)}
                      className="sr-only"
                    />
                    <div
                      onClick={() => toggleColumnVisibility(column.id)}
                      className={`w-5 h-5 rounded border-2 cursor-pointer transition-colors flex items-center justify-center ${
                        column.visible
                          ? 'bg-blue-600 border-blue-600'
                          : 'bg-transparent border-gray-400 hover:border-gray-300'
                      }`}
                    >
                      {column.visible && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status and Footer */}
        <div className="px-4 py-3">
          <div className="text-center mb-3">
            <span className="text-blue-400 text-sm">
              الأعمدة المعروضة {visibleCount} من أصل {totalCount}
            </span>
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-[var(--dash-bg-overlay)] hover:bg-[var(--dash-bg-overlay)] text-[var(--dash-text-primary)] rounded transition-colors font-medium"
            >
              إلغاء
            </button>
            <button
              onClick={saveSettings}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded transition-colors font-medium flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              )}
              {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}