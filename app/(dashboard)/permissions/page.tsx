'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  UserGroupIcon,
  UserPlusIcon,
  PencilIcon,
  TrashIcon,
  KeyIcon,
  ShieldCheckIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
  UsersIcon,
  CogIcon,
  LockClosedIcon,
  ClipboardDocumentListIcon,
  ArrowRightIcon,
  ShoppingCartIcon,
  CubeIcon,
  ArchiveBoxIcon,
  TruckIcon,
  BanknotesIcon,
  ChartBarIcon,
  BuildingStorefrontIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  ComputerDesktopIcon,
  CheckIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline';
import TopHeader from '@/app/components/layout/TopHeader';
import Sidebar from '@/app/components/layout/Sidebar';
import TreeView, { TreeNode } from '@/app/components/TreeView';
import ResizableTable from '@/app/components/tables/ResizableTable';
import AddPermissionModal from '@/app/components/AddPermissionModal';
import PermissionDetails from '@/app/components/PermissionDetails';
import { RolePermissionManager } from '@/app/components/permissions';
import PermissionGrid from '@/app/components/permissions/PermissionGrid';
import { supabase } from '@/app/lib/supabase/client';
import { useUserProfile } from '@/lib/contexts/UserProfileContext';
import { useAuth } from '@/lib/useAuth';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useRoleRestrictions } from '@/lib/hooks/useRoleRestrictions';
import { usePermissionTemplates, PermissionTemplate } from '@/lib/hooks/usePermissionTemplates';
import { RoleType, ROLE_TYPES, ROLE_TYPE_COLORS } from '@/types/permissions';
import UserBranchSelector from '@/app/components/UserBranchSelector';
import { useActivityLogger } from "@/app/lib/hooks/useActivityLogger";

// Map icon names to components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  ShoppingCartIcon,
  CubeIcon,
  ArchiveBoxIcon,
  UserGroupIcon,
  TruckIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
  ChartBarIcon,
  BuildingStorefrontIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
};


interface Permission {
  id: string;
  module: string;
  action: string;
  description: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  userCount: number;
  permissions: string[];
  createdAt: string;
  lastModified: string;
  roleType: 'حقل رئيسي' | string;
  parentRole?: string;
  priceLevel?: number;
}

interface User {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  lastLogin: string | null;
  createdAt: string | null;
  avatar_url: string | null;
  is_admin: boolean; // قيمة is_admin لتحديد ما إذا كان المستخدم محمي من تغيير الرتبة
  permission_id: string | null; // صلاحية المستخدم المخصصة
  permission_name: string | null; // اسم الصلاحية للعرض
}

interface ActionButton {
  icon: any;
  label: string;
  action: () => void;
  disabled?: boolean;
}

export default function PermissionsPage() {
  // استخدام hooks للحصول على بيانات المستخدم الحالي
  const { profile: currentUserProfile, isAdmin } = useUserProfile();
  const activityLog = useActivityLogger();
  const { user: authUser, isAuthenticated } = useAuth();

  // استخدام hook الصلاحيات لجلب التصنيفات والصلاحيات
  const { categories, permissions: permissionDefinitions, loading: permissionsLoading } = usePermissions();

  // استخدام hook قيود الدور
  const {
    restrictions: roleRestrictions,
    loading: restrictionsLoading,
    setRoleId: setRestrictionRoleId,
    toggleRestriction,
    restrictAll,
    unrestrictAll,
  } = useRoleRestrictions();

  // استخدام hook قوالب الصلاحيات
  const {
    templates,
    loading: templatesLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplateRestrictions,
    setRestrictions: setTemplateRestrictions,
    getTemplatesByRole,
    refetch: refetchTemplates,
  } = usePermissionTemplates();

  // الدور المحدد حالياً لعرض صلاحياته
  const [selectedRoleType, setSelectedRoleType] = useState<RoleType>('أدمن رئيسي');

  // الصلاحيات المفلترة حسب الدور المحدد
  const filteredTemplates = getTemplatesByRole(selectedRoleType);

  // سيتم تحديثه عند اختيار دور
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<'roles' | 'users' | 'permissions'>('roles');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedPermissionPage, setSelectedPermissionPage] = useState<{id: string, name: string} | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [realUsers, setRealUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [isAddPermissionModalOpen, setIsAddPermissionModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [editingPermissionUserId, setEditingPermissionUserId] = useState<string | null>(null);
  const [updatingPermission, setUpdatingPermission] = useState(false);
  const [editingBranchUserId, setEditingBranchUserId] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [derivedRoles, setDerivedRoles] = useState<Role[]>([]);
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [newRolePriceLevel, setNewRolePriceLevel] = useState<number>(1);
  const [selectedRoleTemplateId, setSelectedRoleTemplateId] = useState<string | null>(null);

  // وضع تعديل صلاحيات الدور
  const [isEditingRolePermissions, setIsEditingRolePermissions] = useState(false);
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<string | null>(null);
  const [selectedPermissionCategoryId, setSelectedPermissionCategoryId] = useState<string | null>(null);

  // قوالب الصلاحيات
  const [isAddTemplateModalOpen, setIsAddTemplateModalOpen] = useState(false);
  const [isEditTemplateModalOpen, setIsEditTemplateModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [editingTemplateRestrictions, setEditingTemplateRestrictions] = useState<string[]>([]);
  const [isEditingTemplatePermissions, setIsEditingTemplatePermissions] = useState(false);
  const [selectedTemplateCategoryId, setSelectedTemplateCategoryId] = useState<string | null>(null);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);

  // تحديث roleId عند تغيير selectedRoleForPermissions
  useEffect(() => {
    if (selectedRoleForPermissions && isEditingRolePermissions) {
      setRestrictionRoleId(selectedRoleForPermissions);
    }
  }, [selectedRoleForPermissions, isEditingRolePermissions, setRestrictionRoleId]);

  // دالة بدء تعديل صلاحيات الدور
  const handleStartEditRolePermissions = (roleId: string) => {
    setSelectedRoleForPermissions(roleId);
    setIsEditingRolePermissions(true);
    setSelectedPermissionCategoryId(null);
    setRestrictionRoleId(roleId);
  };

  // دالة إلغاء تعديل صلاحيات الدور
  const handleCancelEditRolePermissions = () => {
    setIsEditingRolePermissions(false);
    setSelectedRoleForPermissions(null);
    setSelectedPermissionCategoryId(null);
  };

  // دالة حفظ صلاحيات الدور
  const handleSaveRolePermissions = () => {
    // الحفظ يتم تلقائياً عند كل تغيير عبر toggleRestriction
    activityLog({ entityType: 'permission', actionType: 'update', entityId: selectedRoleForPermissions || undefined, description: 'عدّل صلاحيات الدور' });
    setIsEditingRolePermissions(false);
    setSelectedRoleForPermissions(null);
    setSelectedPermissionCategoryId(null);
  };

  // ============ دوال إدارة قوالب الصلاحيات ============

  // فتح نموذج إنشاء قالب جديد
  const handleOpenAddTemplateModal = () => {
    setNewTemplateName('');
    setNewTemplateDescription('');
    setIsAddTemplateModalOpen(true);
  };

  // إنشاء قالب جديد
  const handleCreateTemplate = async () => {
    console.log('[PermissionsPage] handleCreateTemplate called');
    console.log('[PermissionsPage] newTemplateName:', newTemplateName, 'roleType:', selectedRoleType);

    if (!newTemplateName.trim()) {
      console.log('[PermissionsPage] Template name is empty, returning');
      return;
    }

    setIsCreatingTemplate(true);
    try {
      const newTemplate = await createTemplate(newTemplateName.trim(), selectedRoleType, newTemplateDescription.trim());
      console.log('[PermissionsPage] createTemplate result:', newTemplate);

      if (newTemplate) {
        setNewTemplateName('');
        setNewTemplateDescription('');
        setIsAddTemplateModalOpen(false);
        activityLog({ entityType: 'permission', actionType: 'create', entityId: newTemplate.id, entityName: newTemplateName.trim(), description: 'أنشأ صلاحية جديدة' });
        // فتح شاشة تعديل صلاحيات القالب الجديد
        handleStartEditTemplatePermissions(newTemplate.id);
      } else {
        alert('فشل في إنشاء الصلاحية. يرجى المحاولة مرة أخرى.');
      }
    } catch (error) {
      console.error('[PermissionsPage] Error in handleCreateTemplate:', error);
      alert('حدث خطأ أثناء إنشاء الصلاحية');
    } finally {
      setIsCreatingTemplate(false);
    }
  };

  // فتح تعديل قالب
  const handleOpenEditTemplateModal = (template: PermissionTemplate) => {
    setSelectedTemplateId(template.id);
    setNewTemplateName(template.name);
    setNewTemplateDescription(template.description || '');
    setIsEditTemplateModalOpen(true);
  };

  // تحديث قالب
  const handleUpdateTemplate = async () => {
    if (!selectedTemplateId || !newTemplateName.trim()) return;

    const success = await updateTemplate(selectedTemplateId, newTemplateName.trim(), newTemplateDescription.trim());
    if (success) {
      activityLog({ entityType: 'permission', actionType: 'update', entityId: selectedTemplateId, entityName: newTemplateName.trim(), description: 'عدّل بيانات الصلاحية' });
      setNewTemplateName('');
      setNewTemplateDescription('');
      setSelectedTemplateId(null);
      setIsEditTemplateModalOpen(false);
    }
  };

  // حذف قالب
  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القالب؟\nسيتم حذف القالب نهائياً ولا يمكن التراجع عن هذا الإجراء.')) {
      return;
    }

    const success = await deleteTemplate(templateId);
    if (success) {
      activityLog({ entityType: 'permission', actionType: 'delete', entityId: templateId, description: 'حذف صلاحية' });
      if (selectedTemplateId === templateId) {
        setSelectedTemplateId(null);
      }
    }
  };

  // بدء تعديل صلاحيات القالب
  const handleStartEditTemplatePermissions = async (templateId: string) => {
    const restrictions = await getTemplateRestrictions(templateId);
    setSelectedTemplateId(templateId);
    setEditingTemplateRestrictions(restrictions);
    setIsEditingTemplatePermissions(true);
    setSelectedTemplateCategoryId(null);
  };

  // إلغاء تعديل صلاحيات القالب
  const handleCancelEditTemplatePermissions = () => {
    setIsEditingTemplatePermissions(false);
    setSelectedTemplateId(null);
    setEditingTemplateRestrictions([]);
    setSelectedTemplateCategoryId(null);
  };

  // حفظ صلاحيات القالب
  const handleSaveTemplatePermissions = async () => {
    if (!selectedTemplateId) return;

    const success = await setTemplateRestrictions(selectedTemplateId, editingTemplateRestrictions);
    if (success) {
      activityLog({ entityType: 'permission', actionType: 'update', entityId: selectedTemplateId, description: 'عدّل قيود صلاحيات القالب' });
      handleCancelEditTemplatePermissions();
    }
  };

  // تبديل قيد صلاحية في القالب
  const toggleTemplateRestriction = (permissionCode: string) => {
    setEditingTemplateRestrictions(prev => {
      if (prev.includes(permissionCode)) {
        return prev.filter(code => code !== permissionCode);
      } else {
        return [...prev, permissionCode];
      }
    });
  };

  // تفعيل كل الصلاحيات في تصنيف معين (إضافة للممنوعات)
  const restrictAllTemplateCategory = (codes: string[]) => {
    setEditingTemplateRestrictions(prev => {
      const newRestrictions = [...prev];
      codes.forEach(code => {
        if (!newRestrictions.includes(code)) {
          newRestrictions.push(code);
        }
      });
      return newRestrictions;
    });
  };

  // إلغاء كل الصلاحيات في تصنيف معين (إزالة من الممنوعات)
  const unrestrictAllTemplateCategory = (codes: string[]) => {
    setEditingTemplateRestrictions(prev => prev.filter(code => !codes.includes(code)));
  };

  // القالب المحدد حالياً
  const selectedTemplate = useMemo(() => {
    return templates.find(t => t.id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  // الصلاحيات الخاصة بالتصنيف المحدد في وضع تعديل القالب
  const editingTemplateCategoryPermissions = useMemo(() => {
    if (!selectedTemplateCategoryId) return [];

    // تحقق إذا كانت الصفحة مخفية (page access restricted)
    const category = categories.find((c) => c.id === selectedTemplateCategoryId);
    if (category) {
      const pageAccessCode = `page_access.${category.name_en}`;
      if (editingTemplateRestrictions.includes(pageAccessCode)) {
        return []; // الصفحة مخفية، لا نعرض صلاحياتها
      }
    }

    return permissionDefinitions.filter((p) => p.category_id === selectedTemplateCategoryId);
  }, [permissionDefinitions, selectedTemplateCategoryId, categories, editingTemplateRestrictions]);

  // اسم التصنيف المحدد في وضع تعديل القالب
  const editingTemplateCategoryName = useMemo(() => {
    if (!selectedTemplateCategoryId) return '';
    const cat = categories.find((c) => c.id === selectedTemplateCategoryId);
    return cat?.name || '';
  }, [categories, selectedTemplateCategoryId]);

  // ============ نهاية دوال إدارة قوالب الصلاحيات ============

  // الصلاحيات الخاصة بالتصنيف المحدد في وضع تعديل الصلاحيات
  const editingCategoryPermissions = useMemo(() => {
    if (!selectedPermissionCategoryId) return [];
    return permissionDefinitions.filter((p) => p.category_id === selectedPermissionCategoryId);
  }, [permissionDefinitions, selectedPermissionCategoryId]);

  // اسم التصنيف المحدد في وضع تعديل الصلاحيات
  const editingCategoryName = useMemo(() => {
    if (!selectedPermissionCategoryId) return '';
    const cat = categories.find((c) => c.id === selectedPermissionCategoryId);
    return cat?.name || '';
  }, [categories, selectedPermissionCategoryId]);

  // Add new derived role function
  const handleAddDerivedRole = async () => {
    if (!newRoleName.trim() || !newRoleDescription.trim()) return;
    
    try {
      const { data, error } = await (supabase as any)
        .from('user_roles')
        .insert([{
          name: newRoleName.trim(),
          description: newRoleDescription.trim(),
          role_type: 'فرعي',
          parent_role: 'جملة',
          price_level: newRolePriceLevel,
          permissions: ['1', '5'], // Same as جملة role
          user_count: 0
        }])
        .select();

      if (error) {
        console.error('Error adding role:', error);
        alert('حدث خطأ أثناء إضافة الدور: ' + error.message);
        return;
      }

      if (data && data[0]) {
        const newRole: Role = {
          id: data[0].id,
          name: data[0].name,
          description: data[0].description,
          userCount: 0,
          permissions: data[0].permissions || ['1', '5'],
          createdAt: new Date(data[0].created_at).toLocaleDateString('en-CA'),
          lastModified: new Date(data[0].updated_at).toLocaleDateString('en-CA'),
          roleType: 'فرعي',
          parentRole: 'جملة',
          priceLevel: data[0].price_level
        };

        setDerivedRoles(prev => [...prev, newRole]);
        activityLog({ entityType: 'permission', actionType: 'create', entityId: data[0].id, entityName: data[0].name, description: 'أضاف دور جديد' });
      }

      // Clear form
      setNewRoleName('');
      setNewRoleDescription('');
      setNewRolePriceLevel(1);
      setIsAddRoleModalOpen(false);
    } catch (err) {
      console.error('Unexpected error adding role:', err);
      alert('حدث خطأ غير متوقع');
    }
  };

  // Edit derived role function
  const handleEditDerivedRole = (roleId: string) => {
    const roleToEdit = derivedRoles.find(role => role.id === roleId);
    if (roleToEdit) {
      setEditingRoleId(roleId);
      setNewRoleName(roleToEdit.name);
      setNewRoleDescription(roleToEdit.description);
      setNewRolePriceLevel(roleToEdit.priceLevel || 1);
      setIsEditRoleModalOpen(true);
    }
  };

  // Save edited role function
  const handleSaveEditedRole = async () => {
    if (!newRoleName.trim() || !newRoleDescription.trim() || !editingRoleId) return;
    
    try {
      const { data, error } = await (supabase as any)
        .from('user_roles')
        .update({
          name: newRoleName.trim(),
          description: newRoleDescription.trim(),
          price_level: newRolePriceLevel,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingRoleId)
        .select();

      if (error) {
        console.error('Error updating role:', error);
        alert('حدث خطأ أثناء تحديث الدور: ' + error.message);
        return;
      }

      if (data && data[0]) {
        setDerivedRoles(prev => prev.map(role =>
          role.id === editingRoleId
            ? {
                ...role,
                name: data[0].name,
                description: data[0].description,
                priceLevel: data[0].price_level,
                lastModified: new Date(data[0].updated_at).toLocaleDateString('en-CA')
              }
            : role
        ));
        activityLog({ entityType: 'permission', actionType: 'update', entityId: editingRoleId, entityName: data[0].name, description: 'عدّل بيانات الدور' });
      }

      // Clear form and close modal
      setNewRoleName('');
      setNewRoleDescription('');
      setNewRolePriceLevel(1);
      setEditingRoleId(null);
      setIsEditRoleModalOpen(false);
    } catch (err) {
      console.error('Unexpected error updating role:', err);
      alert('حدث خطأ غير متوقع');
    }
  };

  // Delete derived role function
  const handleDeleteDerivedRole = async (roleId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الدور؟\nسيتم حذف الدور نهائياً ولا يمكن التراجع عن هذا الإجراء.')) {
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) {
        console.error('Error deleting role:', error);
        alert('حدث خطأ أثناء حذف الدور: ' + error.message);
        return;
      }

      // Remove from local state
      activityLog({ entityType: 'permission', actionType: 'delete', entityId: roleId, description: 'حذف دور' });
      setDerivedRoles(prev => prev.filter(role => role.id !== roleId));

      // إلغاء التحديد إذا كان الدور المحذوف محدداً
      if (selectedRoleId === roleId) {
        setSelectedRoleId(null);
      }
    } catch (err) {
      console.error('Unexpected error deleting role:', err);
      alert('حدث خطأ غير متوقع');
    }
  };

  // Cancel edit role function
  const handleCancelEditRole = () => {
    setNewRoleName('');
    setNewRoleDescription('');
    setNewRolePriceLevel(1);
    setEditingRoleId(null);
    setIsEditRoleModalOpen(false);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };


  const toggleTreeNode = (nodeId: string) => {
    if (nodeId === 'admin-pages') {
      setTreeExpanded((prev) => ({ ...prev, admin: !prev.admin }));
    } else if (nodeId === 'store-pages') {
      setTreeExpanded((prev) => ({ ...prev, store: !prev.store }));
    }
  };

  // REMOVED: updateUserRoles function that was overriding manual role changes
  // This function was automatically resetting all user roles based on is_admin flag
  // which prevented manual role assignments from persisting after page refresh

  // تحديث دور مستخدم معين
  const updateUserRole = async (userId: string, newRole: string) => {
    setUpdatingRole(true);
    try {
      console.log('🔄 محاولة تحديث دور المستخدم:', { userId, newRole });

      // التحقق من أن المستخدم المستهدف لا يملك is_admin=true
      const targetUser = realUsers.find(u => u.id === userId);
      if (targetUser?.is_admin) {
        alert('⛔ لا يمكن تغيير رتبة هذا المستخدم - المستخدم محمي (is_admin=true)');
        setUpdatingRole(false);
        return false;
      }

      // التحقق من تسجيل الدخول باستخدام NextAuth
      if (!isAuthenticated || !authUser?.id) {
        console.error('❌ المستخدم غير مسجل دخول');
        alert('⛔ يجب تسجيل الدخول أولاً');
        setUpdatingRole(false);
        return false;
      }

      // التحقق من صلاحيات المستخدم الحالي من UserProfileContext
      console.log('👤 بيانات المستخدم الحالي:', {
        id: authUser.id,
        profile: currentUserProfile,
        isAdmin: isAdmin
      });

      if (!currentUserProfile) {
        console.error('❌ فشل في جلب بيانات المستخدم الحالي');
        alert('⛔ فشل في التحقق من صلاحياتك');
        setUpdatingRole(false);
        return false;
      }

      // فقط الأدمن الرئيسي الذي يملك is_admin=true يمكنه تغيير الرتب
      if (currentUserProfile.role !== 'أدمن رئيسي' || !isAdmin) {
        console.warn('⚠️ المستخدم لا يملك صلاحيات كافية:', {
          role: currentUserProfile.role,
          is_admin: isAdmin
        });
        alert('⛔ ليس لديك صلاحية لتغيير رتب المستخدمين - فقط الأدمن الرئيسي (is_admin=true) يمكنه ذلك');
        setUpdatingRole(false);
        return false;
      }

      // تحديث الدور مباشرة - RLS policy ستتولى التحقق من الصلاحيات
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('id, full_name, role');

      if (error) {
        console.error('❌ خطأ في تحديث الدور:', error);
        
        // رسائل خطأ مفصلة حسب نوع الخطأ
        if (error.code === 'PGRST116') {
          alert('المستخدم غير موجود في قاعدة البيانات');
        } else if (error.code === '42501' || error.message.includes('permission denied')) {
          alert('ليس لديك صلاحية لتحديث أدوار المستخدمين');
        } else {
          alert('فشل في تحديث الدور: ' + error.message);
        }
        return false;
      }

      // تأكد من أن التحديث تم بنجاح
      if (data && data.length > 0) {
        console.log('✅ تم تحديث الدور في قاعدة البيانات:', data[0]);

        // تحديث البيانات محلياً
        setRealUsers(prev => prev.map(user =>
          user.id === userId ? { ...user, role: newRole } : user
        ));

        setEditingUserId(null);
        console.log('✅ تم تحديث دور المستخدم بنجاح إلى:', newRole);

        // رسالة مهمة: المستخدم المُحدّث رتبته يحتاج لتسجيل الخروج والدخول
        alert('✅ تم تحديث الدور بنجاح!\n\n⚠️ ملاحظة مهمة: المستخدم الذي تم تغيير رتبته يحتاج لتسجيل الخروج وإعادة تسجيل الدخول لتفعيل الصلاحيات الجديدة.');
        activityLog({ entityType: 'permission', actionType: 'update', entityId: userId, entityName: data[0].full_name, description: `غيّر رتبة المستخدم إلى ${newRole}` });

        return true;
      } else {
        console.error('❌ فشل التحديث - لا توجد بيانات مُحدَثة');
        alert('فشل في تحديث الدور - لم يتم التحديث');
        return false;
      }
    } catch (error) {
      console.error('❌ خطأ عام في تحديث الدور:', error);
      alert('حدث خطأ غير متوقع: ' + (error as Error).message);
      return false;
    } finally {
      setUpdatingRole(false);
    }
  };

  // تحديث صلاحية مستخدم معين
  const updateUserPermission = async (userId: string, permissionId: string | null) => {
    setUpdatingPermission(true);
    try {
      console.log('🔄 محاولة تحديث صلاحية المستخدم:', { userId, permissionId });

      // التحقق من تسجيل الدخول باستخدام NextAuth
      if (!isAuthenticated || !authUser?.id) {
        console.error('❌ المستخدم غير مسجل دخول');
        alert('⛔ يجب تسجيل الدخول أولاً');
        setUpdatingPermission(false);
        return false;
      }

      // التحقق من صلاحيات المستخدم الحالي
      if (!currentUserProfile) {
        console.error('❌ فشل في جلب بيانات المستخدم الحالي');
        alert('⛔ فشل في التحقق من صلاحياتك');
        setUpdatingPermission(false);
        return false;
      }

      // فقط الأدمن الرئيسي يمكنه تغيير الصلاحيات
      if (currentUserProfile.role !== 'أدمن رئيسي' || !isAdmin) {
        console.warn('⚠️ المستخدم لا يملك صلاحيات كافية');
        alert('⛔ ليس لديك صلاحية لتغيير صلاحيات المستخدمين - فقط الأدمن الرئيسي يمكنه ذلك');
        setUpdatingPermission(false);
        return false;
      }

      // تحديث الصلاحية
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          permission_id: permissionId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('id, full_name, permission_id');

      if (error) {
        console.error('❌ خطأ في تحديث الصلاحية:', error);
        alert('فشل في تحديث الصلاحية: ' + error.message);
        return false;
      }

      // تأكد من أن التحديث تم بنجاح
      if (data && data.length > 0) {
        console.log('✅ تم تحديث الصلاحية في قاعدة البيانات:', data[0]);

        // جلب اسم الصلاحية الجديدة
        let newPermissionName: string | null = null;
        if (permissionId) {
          const template = templates.find(t => t.id === permissionId);
          newPermissionName = template?.name || null;
        }

        // تحديث البيانات محلياً
        setRealUsers(prev => prev.map(user =>
          user.id === userId
            ? { ...user, permission_id: permissionId || null, permission_name: newPermissionName }
            : user
        ));

        setEditingPermissionUserId(null);
        console.log('✅ تم تحديث صلاحية المستخدم بنجاح');

        alert('✅ تم تحديث الصلاحية بنجاح!\n\n⚠️ ملاحظة: المستخدم يحتاج لتسجيل الخروج وإعادة تسجيل الدخول لتفعيل الصلاحية الجديدة.');
        activityLog({ entityType: 'permission', actionType: 'update', entityId: userId, entityName: data[0].full_name, description: `غيّر صلاحية المستخدم` });

        return true;
      } else {
        console.error('❌ فشل التحديث - لا توجد بيانات مُحدَثة');
        alert('فشل في تحديث الصلاحية - لم يتم التحديث');
        return false;
      }
    } catch (error) {
      console.error('❌ خطأ عام في تحديث الصلاحية:', error);
      alert('حدث خطأ غير متوقع: ' + (error as Error).message);
      return false;
    } finally {
      setUpdatingPermission(false);
    }
  };

  // قائمة الأدوار المتاحة - تم إزالة دور الكاشير نهائياً
  const availableRoles = ['عميل', 'جملة', 'موظف', 'أدمن رئيسي'];

  // Load derived roles from database
  const loadDerivedRoles = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('user_roles')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading roles:', error);
        return;
      }

      const formattedRoles: Role[] = data.map((role: any) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        userCount: role.user_count || 0,
        permissions: role.permissions || ['1', '5'],
        createdAt: new Date(role.created_at).toLocaleDateString('en-CA'),
        lastModified: new Date(role.updated_at).toLocaleDateString('en-CA'),
        roleType: role.role_type || 'فرعي',
        parentRole: role.parent_role || 'جملة',
        priceLevel: role.price_level || 1
      }));

      setDerivedRoles(formattedRoles);
    } catch (err) {
      console.error('Unexpected error loading roles:', err);
    }
  };

  // جلب جميع المستخدمين من قاعدة البيانات
  useEffect(() => {
    loadDerivedRoles(); // Load derived roles on component mount
    const fetchRealUsers = async () => {
      setUsersLoading(true);
      try {
        // فحص حالة المصادقة أولاً
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔐 حالة المصادقة:', !!session);
        console.log('👤 المستخدم الحالي:', session?.user?.id);

        // تم إزالة تحديث الأدوار التلقائي للحفاظ على التعديلات اليدوية
        // await updateUserRoles();

        // جلب user_profiles مع permission_id
        const { data: profilesData, error: profilesError } = await (supabase as any)
          .from('user_profiles')
          .select('id, full_name, role, is_admin, created_at, avatar_url, permission_id')
          .order('created_at', { ascending: false });

        // جلب الإيميلات من auth_users
        const { data: authData, error: authError } = await supabase
          .from('auth_users')
          .select('id, email');

        // جلب أسماء الصلاحيات من permission_templates
        const { data: permTemplatesData } = await (supabase as any)
          .from('permission_templates')
          .select('id, name')
          .eq('is_active', true);

        // دمج البيانات - إضافة الإيميل واسم الصلاحية
        const data = profilesData?.map((profile: any) => ({
          ...profile,
          email: authData?.find((auth: any) => auth.id === profile.id)?.email || null,
          permission_name: profile.permission_id
            ? permTemplatesData?.find((pt: any) => pt.id === profile.permission_id)?.name || null
            : null
        }));

        const error = profilesError || authError;

        console.log('🔍 بيانات المستخدمين مع is_admin:', data);

        console.log('📊 البيانات المسترجعة:', data);
        console.log('❌ خطأ في الاستعلام:', error);
        console.log('🔢 عدد المستخدمين:', data?.length || 0);

        if (error) {
          console.error('❌ خطأ في جلب المستخدمين:', error);
          console.error('📋 تفاصيل الخطأ:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          setRealUsers([]);
        } else if (data && Array.isArray(data)) {
          const formattedUsers: User[] = data.map((user: any) => ({
            id: user.id || 'غير متوفر',
            name: user.full_name || user.name || 'مستخدم غير معروف',
            email: user.email || 'غير متوفر',
            role: user.role || 'غير محدد',
            lastLogin: 'غير متوفر',
            createdAt: user.created_at ? new Date(user.created_at).toLocaleDateString('ar-EG') : null,
            avatar_url: user.avatar_url || null,
            is_admin: user.is_admin || false,
            permission_id: user.permission_id || null,
            permission_name: user.permission_name || null
          }));
          
          console.log('✅ المستخدمين المنسقين:', formattedUsers);
          setRealUsers(formattedUsers);
        }
      } catch (err) {
        console.error('💥 خطأ عام:', err);
        setRealUsers([]);
      } finally {
        setUsersLoading(false);
      }
    };

    fetchRealUsers();
  }, []);

  // Sample permissions data
  const permissions: Permission[] = [
    { id: '1', module: 'المبيعات', action: 'قراءة', description: 'عرض بيانات المبيعات' },
    { id: '2', module: 'المبيعات', action: 'إضافة', description: 'إنشاء مبيعات جديدة' },
    { id: '3', module: 'المبيعات', action: 'تعديل', description: 'تعديل المبيعات الموجودة' },
    { id: '4', module: 'المبيعات', action: 'حذف', description: 'حذف المبيعات' },
    { id: '5', module: 'المنتجات', action: 'قراءة', description: 'عرض كتالوج المنتجات' },
    { id: '6', module: 'المنتجات', action: 'إضافة', description: 'إضافة منتجات جديدة' },
    { id: '7', module: 'المنتجات', action: 'تعديل', description: 'تعديل تفاصيل المنتجات' },
    { id: '8', module: 'المنتجات', action: 'حذف', description: 'حذف المنتجات' },
    { id: '9', module: 'المخزون', action: 'قراءة', description: 'عرض مستويات المخزون' },
    { id: '10', module: 'المخزون', action: 'تعديل', description: 'تحديث كميات المخزون' },
    { id: '11', module: 'العملاء', action: 'قراءة', description: 'عرض بيانات العملاء' },
    { id: '12', module: 'العملاء', action: 'إضافة', description: 'إضافة عملاء جدد' },
    { id: '13', module: 'العملاء', action: 'تعديل', description: 'تعديل بيانات العملاء' },
    { id: '14', module: 'الموردين', action: 'قراءة', description: 'عرض بيانات الموردين' },
    { id: '15', module: 'الموردين', action: 'إضافة', description: 'إضافة موردين جدد' },
    { id: '16', module: 'التقارير', action: 'قراءة', description: 'عرض التقارير المالية' },
    { id: '17', module: 'التقارير', action: 'تصدير', description: 'تصدير التقارير' },
    { id: '18', module: 'الإعدادات', action: 'قراءة', description: 'عرض الإعدادات' },
    { id: '19', module: 'الإعدادات', action: 'تعديل', description: 'تعديل إعدادات النظام' },
    { id: '20', module: 'الصلاحيات', action: 'إدارة', description: 'إدارة صلاحيات المستخدمين' },
  ];

  // الأدوار الأساسية الثلاثة - لا يمكن تعديلها أو حذفها
  const mainRoles: Role[] = [
    {
      id: 'client',
      name: 'عميل',
      description: 'صلاحيات محدودة للوصول للمتجر وطلباته فقط',
      userCount: realUsers.filter(u => u.role === 'عميل').length,
      permissions: ['1', '5'], // Home page, view orders
      createdAt: '2024-01-01',
      lastModified: '2024-01-01',
      roleType: 'حقل رئيسي'
    },
    {
      id: 'wholesale',
      name: 'جملة',
      description: 'صلاحيات محدودة للوصول للمتجر وطلباته فقط مع أسعار الجملة',
      userCount: realUsers.filter(u => u.role === 'جملة').length,
      permissions: ['1', '5'], // Home page, view orders
      createdAt: '2024-01-01',
      lastModified: '2024-01-01',
      roleType: 'حقل رئيسي'
    },
    {
      id: 'employee',
      name: 'موظف',
      description: 'صلاحيات كاملة لجميع صفحات النظام والمتجر مع إدارة كاملة',
      userCount: realUsers.filter(u => u.role === 'موظف').length,
      permissions: permissions.map(p => p.id),
      createdAt: '2024-01-01',
      lastModified: '2024-01-01',
      roleType: 'حقل رئيسي'
    },
    {
      id: 'main_admin',
      name: 'أدمن رئيسي',
      description: 'صلاحيات كاملة لجميع صفحات النظام والمتجر مع إدارة كاملة',
      userCount: realUsers.filter(u => u.role === 'أدمن رئيسي').length,
      permissions: permissions.map(p => p.id),
      createdAt: '2024-01-01',
      lastModified: '2024-01-01',
      roleType: 'حقل رئيسي'
    }
  ];

  // Combine main roles with derived roles
  const roles = [...mainRoles, ...derivedRoles];

  // الدور المحدد للتعديل
  const selectedRoleForEdit = useMemo(() => {
    if (!selectedRoleForPermissions) return null;
    return roles.find(r => r.id === selectedRoleForPermissions) || null;
  }, [selectedRoleForPermissions, roles]);



  // حالة فتح/إغلاق الشجرة
  const [treeExpanded, setTreeExpanded] = useState<{ admin: boolean; store: boolean }>({
    admin: true,
    store: false,
  });

  // حساب إحصائيات كل تصنيف
  const categoryStats = useMemo(() => {
    const stats: Record<string, { selected: number; total: number }> = {};
    categories.forEach((cat) => {
      const catPerms = permissionDefinitions.filter((p) => p.category_id === cat.id);
      stats[cat.id] = {
        selected: 0, // سيتم تحديثه لاحقاً عند اختيار دور
        total: catPerms.length,
      };
    });
    return stats;
  }, [categories, permissionDefinitions]);

  // بناء شجرة الصلاحيات ديناميكياً من قاعدة البيانات
  const permissionTreeData = useMemo(() => {
    // تصفية التصنيفات حسب parent_type
    const adminCategories = categories.filter((c) => c.parent_type === 'admin');
    const storeCategories = categories.filter((c) => c.parent_type === 'store');

    return [
      {
        id: 'admin-pages',
        name: 'صفحات الإدارة',
        icon: ComputerDesktopIcon,
        isExpanded: treeExpanded.admin,
        children: adminCategories.map((cat) => ({
          id: cat.id,
          name: cat.name,
          name_en: cat.name_en,
          pageAccessCode: `page_access.${cat.name_en}`,
          icon: cat.icon ? iconMap[cat.icon] : undefined,
          count: categoryStats[cat.id],
        })),
      },
      {
        id: 'store-pages',
        name: 'صفحات المتجر',
        icon: BuildingStorefrontIcon,
        isExpanded: treeExpanded.store,
        children: storeCategories.map((cat) => ({
          id: cat.id,
          name: cat.name,
          name_en: cat.name_en,
          pageAccessCode: `page_access.${cat.name_en}`,
          icon: cat.icon ? iconMap[cat.icon] : undefined,
          count: categoryStats[cat.id],
        })),
      },
    ];
  }, [categories, categoryStats, treeExpanded]);

  // الصلاحيات الخاصة بالتصنيف المحدد
  const selectedCategoryPermissions = useMemo(() => {
    if (!selectedPermissionPage?.id) return [];
    return permissionDefinitions.filter((p) => p.category_id === selectedPermissionPage.id);
  }, [permissionDefinitions, selectedPermissionPage]);

  // اسم التصنيف المحدد
  const selectedCategoryName = useMemo(() => {
    if (!selectedPermissionPage?.id) return '';
    const cat = categories.find((c) => c.id === selectedPermissionPage.id);
    return cat?.name || '';
  }, [categories, selectedPermissionPage]);




  const roleColumns = [
    {
      id: 'name',
      header: 'اسم الدور',
      accessor: 'name' as keyof Role,
      width: 200,
      render: (value: any, role: Role) => (
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="h-4 w-4 text-blue-400" />
          <span className="font-medium text-[var(--dash-text-primary)]">{value}</span>
        </div>
      )
    },
    {
      id: 'description',
      header: 'الوصف',
      accessor: 'description' as keyof Role,
      width: 350,
      render: (value: any) => (
        <span className="text-[var(--dash-text-secondary)] text-sm">{value}</span>
      )
    },
    {
      id: 'userCount',
      header: 'عدد المستخدمين',
      accessor: 'userCount' as keyof Role,
      width: 120,
      render: (value: any) => (
        <div className="flex items-center gap-2">
          <UsersIcon className="h-4 w-4 text-[var(--dash-text-muted)]" />
          <span className="text-[var(--dash-text-primary)]">{value}</span>
        </div>
      )
    },
    {
      id: 'roleType',
      header: 'نوع الدور',
      accessor: 'roleType' as keyof Role,
      width: 150,
      render: (value: any, role: Role) => (
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs rounded-full ${
            role.roleType === 'حقل رئيسي' 
              ? 'bg-purple-600/20 text-purple-300 border border-purple-600/30' 
              : 'bg-blue-600/20 text-blue-300 border border-blue-600/30'
          }`}>
            {role.roleType === 'حقل رئيسي' ? 'حقل رئيسي' : role.parentRole}
          </span>
        </div>
      )
    },
    {
      id: 'lastModified',
      header: 'آخر تعديل',
      accessor: 'lastModified' as keyof Role,
      width: 120,
      render: (value: any) => (
        <span className="text-[var(--dash-text-muted)] text-sm">{value}</span>
      )
    }
  ];

  // أعمدة جدول الصلاحيات
  const templateColumns = [
    {
      id: 'name',
      header: 'اسم الصلاحية',
      accessor: 'name' as keyof PermissionTemplate,
      width: 250,
      render: (value: any, item: PermissionTemplate) => (
        <div className="flex items-center gap-2">
          <KeyIcon className="h-4 w-4 text-blue-400" />
          <span className="font-medium text-[var(--dash-text-primary)]">{value}</span>
          {value === 'عام' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400">افتراضي</span>
          )}
        </div>
      )
    },
    {
      id: 'description',
      header: 'الوصف',
      accessor: 'description' as keyof PermissionTemplate,
      width: 400,
      render: (value: any) => (
        <span className="text-[var(--dash-text-secondary)] text-sm">{value || 'بدون وصف'}</span>
      )
    },
    {
      id: 'created_at',
      header: 'تاريخ الإنشاء',
      accessor: 'created_at' as keyof PermissionTemplate,
      width: 150,
      render: (value: any) => (
        <span className="text-[var(--dash-text-muted)] text-sm">
          {value ? new Date(value).toLocaleDateString('ar-EG') : '-'}
        </span>
      )
    },
    {
      id: 'updated_at',
      header: 'آخر تعديل',
      accessor: 'updated_at' as keyof PermissionTemplate,
      width: 150,
      render: (value: any) => (
        <span className="text-[var(--dash-text-muted)] text-sm">
          {value ? new Date(value).toLocaleDateString('ar-EG') : '-'}
        </span>
      )
    }
  ];

  const userColumns = [
    {
      id: 'name',
      header: 'اسم المستخدم',
      accessor: 'name' as keyof User,
      width: 200,
      render: (value: any, user: User) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-blue-600">
            {user.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt={value || 'User Avatar'} 
                className="w-full h-full object-cover rounded-full"
                onError={(e) => {
                  // إذا فشل تحميل الصورة، اعرض الحرف الأول
                  e.currentTarget.style.display = 'none';
                  const parentDiv = e.currentTarget.parentNode as HTMLElement;
                  if (parentDiv) {
                    parentDiv.innerHTML = `<span class="text-[var(--dash-text-primary)] text-sm font-medium">${value?.charAt(0) || 'U'}</span>`;
                  }
                }}
              />
            ) : (
              <span className="text-[var(--dash-text-primary)] text-sm font-medium">{value?.charAt(0) || 'U'}</span>
            )}
          </div>
          <div>
            <div className="text-[var(--dash-text-primary)] font-medium">{value || 'غير محدد'}</div>
            <div className="text-[var(--dash-text-muted)] text-xs">{user.email || 'لا يوجد إيميل'}</div>
          </div>
        </div>
      )
    },
    {
      id: 'role',
      header: 'الدور',
      accessor: 'role' as keyof User,
      width: 200,
      render: (value: any, user: User) => (
        <div className="flex items-center gap-2">
          {editingUserId === user.id ? (
            <div className="flex items-center gap-2 w-full">
              <select
                className="bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded-md px-2 py-1 text-[var(--dash-text-primary)] text-xs flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={value || 'عميل'}
                onChange={(e) => updateUserRole(user.id, e.target.value)}
                disabled={updatingRole || user.is_admin}
              >
                {availableRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              {updatingRole && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
              )}
              <button
                onClick={() => setEditingUserId(null)}
                className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-secondary)] text-xs"
                disabled={updatingRole}
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full">
              <span className={`px-2 py-1 text-[var(--dash-text-primary)] text-xs rounded-full ${
                value === 'عميل' ? 'bg-green-600' :
                value === 'جملة' ? 'bg-blue-600' :
                value === 'موظف' ? 'bg-blue-600' :
                value === 'أدمن رئيسي' ? 'bg-purple-600' : 'bg-[var(--dash-bg-overlay)]'
              }`}>
                {value || 'غير محدد'}
              </span>
              {user.is_admin && (
                <LockClosedIcon
                  className="h-3 w-3 text-yellow-400"
                  title="محمي - لا يمكن تغيير رتبته"
                />
              )}
              <button
                onClick={() => setEditingUserId(user.id)}
                className={`text-xs ${
                  user.is_admin
                    ? 'text-gray-600 cursor-not-allowed'
                    : 'text-[var(--dash-text-muted)] hover:text-blue-400'
                }`}
                disabled={user.is_admin}
                title={user.is_admin ? 'لا يمكن تغيير رتبة هذا المستخدم - محمي (is_admin=true)' : ''}
              >
                <PencilIcon className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'lastLogin',
      header: 'آخر تسجيل دخول',
      accessor: 'lastLogin' as keyof User,
      width: 150,
      render: (value: any) => (
        <span className="text-[var(--dash-text-muted)] text-sm">{value || 'غير متوفر'}</span>
      )
    },
    {
      id: 'createdAt',
      header: 'تاريخ الإنشاء',
      accessor: 'createdAt' as keyof User,
      width: 120,
      render: (value: any) => (
        <span className="text-[var(--dash-text-muted)] text-sm">{value || 'غير متوفر'}</span>
      )
    },
    {
      id: 'permission',
      header: 'الصلاحية',
      accessor: 'permission_id' as keyof User,
      width: 180,
      render: (value: any, user: User) => {
        // فلترة الصلاحيات حسب دور المستخدم
        // الموظف يرى صلاحياته + صلاحيات الأدمن الرئيسي
        const userRoleType = user.role as RoleType;
        const filteredTemplates = userRoleType === 'موظف'
          ? templates.filter(t => t.role_type === 'موظف' || t.role_type === 'أدمن رئيسي')
          : templates.filter(t => t.role_type === userRoleType);

        return (
          <div className="flex items-center gap-2">
            {editingPermissionUserId === user.id ? (
              <div className="flex items-center gap-2 w-full">
                <select
                  className="bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded-md px-2 py-1 text-[var(--dash-text-primary)] text-xs flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={value || ''}
                  onChange={(e) => updateUserPermission(user.id, e.target.value || null)}
                  disabled={updatingPermission}
                >
                  <option value="">عام</option>
                  {filteredTemplates.filter(t => t.name !== 'عام').map(perm => (
                    <option key={perm.id} value={perm.id}>{perm.name}</option>
                  ))}
                </select>
                {updatingPermission && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                )}
                <button
                  onClick={() => setEditingPermissionUserId(null)}
                  className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-secondary)] text-xs"
                  disabled={updatingPermission}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 w-full">
                <span className={`px-2 py-1 text-[var(--dash-text-primary)] text-xs rounded-full ${
                  user.permission_name && user.permission_name !== 'عام'
                    ? 'bg-cyan-600'
                    : 'bg-[var(--dash-bg-overlay)]'
                }`}>
                  {user.permission_name || 'عام'}
                </span>
                <button
                  onClick={() => setEditingPermissionUserId(user.id)}
                  className="text-xs text-[var(--dash-text-muted)] hover:text-blue-400"
                >
                  <PencilIcon className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        );
      }
    },
    {
      id: 'branches',
      header: 'الفروع',
      accessor: 'id' as keyof User,
      width: 120,
      render: (value: any, user: User) => (
        <div className="flex items-center gap-2">
          {editingBranchUserId === user.id ? (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingBranchUserId(null)}>
              <div
                className="bg-[var(--dash-bg-surface)] rounded-lg p-4 w-[400px] max-h-[80vh] overflow-y-auto shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[var(--dash-text-primary)] font-medium">تعيين الفروع - {user.name}</h3>
                  <button
                    onClick={() => setEditingBranchUserId(null)}
                    className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)]"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                <UserBranchSelector
                  userId={user.id}
                  onSave={() => setEditingBranchUserId(null)}
                />
              </div>
            </div>
          ) : null}
          <button
            onClick={() => setEditingBranchUserId(user.id)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-md transition-colors"
            title="تعيين الفروع"
          >
            <BuildingStorefrontIcon className="h-3 w-3" />
            <span>تعيين</span>
          </button>
        </div>
      )
    }
  ];

  const getCurrentData = () => {
    const searchLower = searchTerm.toLowerCase().trim();

    switch (activeView) {
      case 'roles':
        if (!searchLower) return roles;
        return roles.filter(role =>
          role.name.toLowerCase().includes(searchLower) ||
          role.description.toLowerCase().includes(searchLower)
        );
      case 'users':
        if (!searchLower) return realUsers;
        return realUsers.filter(user =>
          user.name?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower) ||
          user.role?.toLowerCase().includes(searchLower)
        );
      case 'permissions':
        return [];
      default:
        return [];
    }
  };

  const getCurrentColumns = () => {
    switch (activeView) {
      case 'roles':
        return roleColumns;
      case 'users':
        return userColumns;
      case 'permissions':
        return [];
      default:
        return [];
    }
  };

  const getActionButtons = (): ActionButton[] => {
    switch (activeView) {
      case 'roles':
        const selectedRole = roles.find(r => r.id === selectedRoleId);
        
        if (!selectedRole) {
          // لا يوجد دور محدد
          return [
            { icon: UserGroupIcon, label: 'دور جديد', action: () => {}, disabled: true },
            { icon: PencilIcon, label: 'تعديل', action: () => {}, disabled: true },
            { icon: TrashIcon, label: 'حذف', action: () => {}, disabled: true },
            { icon: ClipboardDocumentListIcon, label: 'تصدير', action: () => {} }
          ];
        } else if (selectedRole.roleType === 'حقل رئيسي') {
          // دور رئيسي محدد
          if (selectedRole.name === 'جملة') {
            // دور الجملة يمكن إنشاء أدوار فرعية منه
            return [
              { 
                icon: UserGroupIcon, 
                label: 'دور جديد', 
                action: () => setIsAddRoleModalOpen(true), 
                disabled: false 
              },
              { icon: PencilIcon, label: 'تعديل', action: () => {}, disabled: true },
              { icon: TrashIcon, label: 'حذف', action: () => {}, disabled: true },
              { icon: ClipboardDocumentListIcon, label: 'تصدير', action: () => {} }
            ];
          } else {
            // باقي الأدوار الرئيسية لا يمكن تعديلها أو حذفها أو إنشاء أدوار منها
            return [
              { icon: UserGroupIcon, label: 'دور جديد', action: () => {}, disabled: true },
              { icon: PencilIcon, label: 'تعديل', action: () => {}, disabled: true },
              { icon: TrashIcon, label: 'حذف', action: () => {}, disabled: true },
              { icon: ClipboardDocumentListIcon, label: 'تصدير', action: () => {} }
            ];
          }
        } else {
          // دور فرعي محدد - يمكن تعديله وحذفه لكن لا يمكن إنشاء أدوار منه
          return [
            { icon: UserGroupIcon, label: 'دور جديد', action: () => {}, disabled: true },
            { 
              icon: PencilIcon, 
              label: 'تعديل', 
              action: () => handleEditDerivedRole(selectedRole.id), 
              disabled: false 
            },
            { 
              icon: TrashIcon, 
              label: 'حذف', 
              action: () => handleDeleteDerivedRole(selectedRole.id), 
              disabled: false 
            },
            { icon: ClipboardDocumentListIcon, label: 'تصدير', action: () => {} }
          ];
        }
      case 'users':
        return [
          { icon: UserPlusIcon, label: 'مستخدم جديد', action: () => {} },
          { icon: PencilIcon, label: 'تعديل', action: () => {} },
          { icon: LockClosedIcon, label: 'إعادة تعيين كلمة مرور', action: () => {} },
          { icon: TrashIcon, label: 'حذف', action: () => {} }
        ];
      case 'permissions':
        // إذا كنا في وضع تعديل صلاحيات القالب
        if (isEditingTemplatePermissions) {
          return [
            {
              icon: ArrowRightIcon,
              label: 'رجوع',
              action: handleCancelEditTemplatePermissions,
              disabled: false
            },
            { icon: ClipboardDocumentListIcon, label: 'تصدير', action: () => {} }
          ];
        }
        // وضع عرض قوالب الصلاحيات
        const selectedTemplateForActions = templates.find(t => t.id === selectedTemplateId);
        return [
          {
            icon: KeyIcon,
            label: 'صلاحية جديدة',
            action: handleOpenAddTemplateModal,
            disabled: false
          },
          {
            icon: PencilIcon,
            label: 'تعديل',
            action: () => selectedTemplateId && handleStartEditTemplatePermissions(selectedTemplateId),
            disabled: !selectedTemplateId
          },
          {
            icon: CogIcon,
            label: 'إعدادات',
            action: () => selectedTemplateForActions && handleOpenEditTemplateModal(selectedTemplateForActions),
            disabled: !selectedTemplateId
          },
          {
            icon: TrashIcon,
            label: 'حذف',
            action: () => selectedTemplateId && handleDeleteTemplate(selectedTemplateId),
            disabled: !selectedTemplateId
          },
          { icon: ClipboardDocumentListIcon, label: 'تصدير', action: () => {} }
        ];
      default:
        return [];
    }
  };

  return (
    <div className="h-screen bg-[var(--dash-bg-surface)] overflow-hidden">
      <TopHeader onMenuClick={toggleSidebar} isMenuOpen={isSidebarOpen} />
      <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />
      
      <div className="h-full pt-12 overflow-hidden flex flex-col">
        {/* Top Action Buttons Toolbar */}
        <div className="bg-[var(--dash-bg-raised)] border-b border-[var(--dash-border-default)] px-4 py-2 w-full">
          <div className="flex items-center justify-start gap-1">
            {getActionButtons().map((button, index) => (
              <button
                key={index}
                onClick={button.action}
                disabled={button.disabled}
                className={`flex flex-col items-center p-2 min-w-[80px] transition-colors ${
                  button.disabled 
                    ? 'text-gray-600 cursor-not-allowed' 
                    : 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] cursor-pointer'
                }`}
                title={button.disabled ? 'الأدوار الأساسية لا يمكن تعديلها' : ''}
              >
                <button.icon className="h-5 w-5 mb-1" />
                <span className="text-sm">{button.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - View Selector and Tree */}
          <div className="w-64 bg-[var(--dash-bg-raised)] border-l border-[var(--dash-border-subtle)] flex flex-col">
            {/* View Selector */}
            <div className="p-4 border-b border-[var(--dash-border-default)]">
              <h3 className="text-[var(--dash-text-primary)] font-medium mb-3">إدارة الصلاحيات</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setActiveView('roles')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    activeView === 'roles' 
                      ? 'bg-blue-600 text-[var(--dash-text-primary)]' 
                      : 'text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-overlay)] hover:text-[var(--dash-text-primary)]'
                  }`}
                >
                  <ShieldCheckIcon className="h-4 w-4" />
                  الأدوار
                </button>
                <button
                  onClick={() => setActiveView('users')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    activeView === 'users' 
                      ? 'bg-blue-600 text-[var(--dash-text-primary)]' 
                      : 'text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-overlay)] hover:text-[var(--dash-text-primary)]'
                  }`}
                >
                  <UsersIcon className="h-4 w-4" />
                  المستخدمين
                </button>
                <button
                  onClick={() => setActiveView('permissions')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    activeView === 'permissions' 
                      ? 'bg-blue-600 text-[var(--dash-text-primary)]' 
                      : 'text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-overlay)] hover:text-[var(--dash-text-primary)]'
                  }`}
                >
                  <KeyIcon className="h-4 w-4" />
                  الصلاحيات
                </button>
              </div>
            </div>

            {/* Permissions Tree - Only show when editing template permissions */}
            {activeView === 'permissions' && isEditingTemplatePermissions && (
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                <div className="p-4">
                  {/* عنوان القالب المحدد */}
                  <div className="mb-4 p-3 bg-blue-600/20 border border-blue-500/30 rounded-lg">
                    <span className="text-[var(--dash-text-muted)] text-xs">تعديل صلاحيات:</span>
                    <h3 className="text-[var(--dash-text-primary)] font-bold">{selectedTemplate?.name || 'غير محدد'}</h3>
                  </div>

                  {/* زر حفظ التغييرات */}
                  <button
                    onClick={handleSaveTemplatePermissions}
                    className="w-full mb-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-[var(--dash-text-primary)] rounded-lg transition-colors text-sm font-medium"
                  >
                    حفظ التغييرات
                  </button>

                  <h4 className="text-[var(--dash-text-secondary)] text-sm font-medium mb-3">شجرة الصلاحيات</h4>

                  {/* Custom TreeView with Page Access Checkboxes */}
                  <div className="w-full">
                    {permissionTreeData.map((section) => {
                      const SectionIcon = section.icon;
                      return (
                        <div key={section.id}>
                          {/* Section Header (صفحات الإدارة / صفحات المتجر) */}
                          <div
                            className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-[var(--dash-bg-surface)] rounded-lg mx-1 my-0.5"
                            onClick={() => toggleTreeNode(section.id)}
                          >
                            <button className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] flex-shrink-0 transition-colors">
                              {section.isExpanded ? (
                                <ChevronDownIcon className="h-4 w-4" />
                              ) : (
                                <ChevronLeftIcon className="h-4 w-4" />
                              )}
                            </button>
                            {SectionIcon && <SectionIcon className="h-5 w-5 text-[var(--dash-text-muted)]" />}
                            <span className="text-sm font-medium text-gray-200">{section.name}</span>
                          </div>

                          {/* Pages with Checkboxes */}
                          {section.isExpanded && section.children?.map((page: any) => {
                            const PageIcon = page.icon;
                            const isPageHidden = editingTemplateRestrictions.includes(page.pageAccessCode);
                            const isSelected = selectedTemplateCategoryId === page.id && !isPageHidden;

                            return (
                              <div
                                key={page.id}
                                className={`flex items-center gap-2 px-3 py-2 mx-1 my-0.5 rounded-lg transition-all duration-200 ${
                                  isSelected
                                    ? 'bg-blue-600'
                                    : isPageHidden
                                      ? 'bg-red-500/10 opacity-60'
                                      : 'hover:bg-[var(--dash-bg-surface)]'
                                }`}
                                style={{ paddingRight: '28px' }}
                              >
                                {/* Page Access Checkbox */}
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleTemplateRestriction(page.pageAccessCode);
                                    // إذا كانت الصفحة مخفية وتم إظهارها، لا نحتاج لعمل شيء إضافي
                                    // إذا كانت الصفحة ظاهرة وتم إخفاؤها، نلغي التحديد إذا كانت محددة
                                    if (!isPageHidden && selectedTemplateCategoryId === page.id) {
                                      setSelectedTemplateCategoryId(null);
                                    }
                                  }}
                                  className={`
                                    flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all duration-200
                                    ${isPageHidden
                                      ? 'bg-red-500 border-red-500 hover:bg-red-600 hover:border-red-600'
                                      : 'bg-green-500 border-green-500 hover:bg-green-600 hover:border-green-600'
                                    }
                                  `}
                                  title={isPageHidden ? 'الصفحة مخفية - اضغط للإظهار' : 'الصفحة ظاهرة - اضغط للإخفاء'}
                                >
                                  {isPageHidden ? (
                                    <XMarkIcon className="w-3 h-3 text-[var(--dash-text-primary)]" />
                                  ) : (
                                    <CheckIcon className="w-3 h-3 text-[var(--dash-text-primary)]" />
                                  )}
                                </div>

                                {/* Page Icon */}
                                {PageIcon && (
                                  <PageIcon className={`h-4 w-4 flex-shrink-0 ${
                                    isSelected ? 'text-[var(--dash-text-primary)]' : isPageHidden ? 'text-[var(--dash-text-disabled)]' : 'text-[var(--dash-text-muted)]'
                                  }`} />
                                )}

                                {/* Page Name - Clickable only if page is visible */}
                                <span
                                  className={`text-sm font-medium flex-1 truncate ${
                                    isSelected
                                      ? 'text-[var(--dash-text-primary)] cursor-pointer'
                                      : isPageHidden
                                        ? 'text-[var(--dash-text-disabled)] cursor-not-allowed line-through'
                                        : 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)] cursor-pointer'
                                  }`}
                                  onClick={() => {
                                    if (!isPageHidden) {
                                      if (selectedTemplateCategoryId === page.id) {
                                        setSelectedTemplateCategoryId(null);
                                      } else {
                                        setSelectedTemplateCategoryId(page.id);
                                      }
                                    }
                                  }}
                                >
                                  {page.name}
                                </span>

                                {/* Count Badge - Only show if page is visible */}
                                {!isPageHidden && page.count && (
                                  <span
                                    className={`
                                      text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium
                                      ${isSelected
                                        ? 'bg-white/20 text-[var(--dash-text-primary)]'
                                        : page.count.selected > 0
                                          ? 'bg-red-500/20 text-red-400'
                                          : 'bg-[var(--dash-bg-overlay)]/50 text-[var(--dash-text-muted)]'
                                      }
                                    `}
                                  >
                                    {page.count.selected}/{page.count.total}
                                  </span>
                                )}

                                {/* Hidden indicator */}
                                {isPageHidden && (
                                  <span className="text-xs text-red-400 flex-shrink-0">مخفية</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Permissions Stats - Only show when viewing permissions but not editing */}
            {activeView === 'permissions' && !isEditingTemplatePermissions && (
              <div className="p-4">
                <h4 className="text-[var(--dash-text-secondary)] text-sm font-medium mb-3">إرشادات</h4>
                <div className="space-y-2 text-sm text-[var(--dash-text-muted)]">
                  <p>1. اضغط على "صلاحية جديدة" لإنشاء قالب</p>
                  <p>2. اختر قالباً من الجدول</p>
                  <p>3. اضغط على "إعدادات" لتعديل صلاحياته</p>
                </div>
                <div className="mt-4 p-3 bg-blue-600/10 border border-blue-500/30 rounded-lg">
                  <span className="text-blue-400 text-xs">معلومة:</span>
                  <p className="text-[var(--dash-text-secondary)] text-xs mt-1">كل قالب يحدد الصلاحيات الممنوعة، وكل ما عداها يكون مسموحاً</p>
                </div>
                {/* إحصائيات الصلاحيات */}
                <div className="mt-4">
                  <h4 className="text-[var(--dash-text-secondary)] text-sm font-medium mb-3">إحصائيات</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--dash-text-muted)]">إجمالي الصلاحيات:</span>
                      <span className="text-[var(--dash-text-primary)] font-medium">{templates.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--dash-text-muted)]">صلاحيات {selectedRoleType}:</span>
                      <span className={`font-medium ${ROLE_TYPE_COLORS[selectedRoleType].split(' ')[1]}`}>{filteredTemplates.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Role Statistics - Only show when viewing roles */}
            {activeView === 'roles' && (
              <div className="p-4">
                <h4 className="text-[var(--dash-text-secondary)] text-sm font-medium mb-3">إحصائيات الأدوار</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--dash-text-muted)]">إجمالي الأدوار:</span>
                    <span className="text-[var(--dash-text-primary)] font-medium">{roles.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--dash-text-muted)]">الأدوار الرئيسية:</span>
                    <span className="text-green-400 font-medium">
                      {roles.filter(r => r.roleType === 'حقل رئيسي').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--dash-text-muted)]">إجمالي المستخدمين:</span>
                    <span className="text-blue-400 font-medium">
                      {roles.reduce((sum, role) => sum + role.userCount, 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* User Statistics - Only show when viewing users */}
            {activeView === 'users' && (
              <div className="p-4">
                <h4 className="text-[var(--dash-text-secondary)] text-sm font-medium mb-3">إحصائيات المستخدمين</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--dash-text-muted)]">إجمالي المستخدمين:</span>
                    <span className="text-[var(--dash-text-primary)] font-medium">{realUsers.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--dash-text-muted)]">لديهم أدوار:</span>
                    <span className="text-blue-400 font-medium">
                      {realUsers.filter(u => u.role && u.role !== 'غير محدد').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--dash-text-muted)]">بدون أدوار:</span>
                    <span className="text-orange-400 font-medium">
                      {realUsers.filter(u => !u.role || u.role === 'غير محدد').length}
                    </span>
                  </div>
                  {usersLoading && (
                    <div className="flex items-center justify-center py-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                      <span className="mr-2 text-[var(--dash-text-muted)] text-xs">جاري التحميل...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Secondary Toolbar - Search and Controls */}
            <div className="bg-[var(--dash-bg-raised)] border-b border-[var(--dash-border-default)] px-6 py-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Search Input */}
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--dash-text-muted)]" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-80 pl-4 pr-10 py-2 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded-md text-[var(--dash-text-primary)] placeholder-[var(--dash-text-disabled)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder={`البحث في ${
                        activeView === 'roles' ? 'الأدوار' : 
                        activeView === 'users' ? 'المستخدمين' : 'الصلاحيات'
                      }...`}
                    />
                  </div>

                  {/* View Toggle */}
                  <div className="flex bg-[var(--dash-bg-surface)] rounded-md overflow-hidden">
                    <button 
                      onClick={() => setViewMode('list')}
                      className={`p-2 transition-colors ${
                        viewMode === 'list' ? 'bg-blue-600 text-[var(--dash-text-primary)]' : 'text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]'
                      }`}
                    >
                      <ListBulletIcon className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => setViewMode('grid')}
                      className={`p-2 transition-colors ${
                        viewMode === 'grid' ? 'bg-blue-600 text-[var(--dash-text-primary)]' : 'text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]'
                      }`}
                    >
                      <Squares2X2Icon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Current View Title */}
                <div className="flex items-center gap-2">
                  <h2 className="text-[var(--dash-text-primary)] font-medium">
                    {activeView === 'roles' ? 'إدارة الأدوار' : 
                     activeView === 'users' ? 'إدارة المستخدمين' : 'إدارة الصلاحيات'}
                  </h2>
                  <span className="bg-blue-600 text-[var(--dash-text-primary)] px-2 py-1 rounded-full text-xs">
                    {getCurrentData().length}
                  </span>
                </div>
              </div>
            </div>

            {/* Data Table Container */}
            <div className="flex-1 overflow-hidden bg-[var(--dash-bg-surface)]">
              {activeView === 'permissions' ? (
                isEditingTemplatePermissions ? (
                  /* وضع تعديل صلاحيات القالب */
                  <div className="p-6 h-full overflow-auto scrollbar-hide">
                    {selectedTemplateCategoryId ? (
                      <div className="h-full flex flex-col">
                        {/* Header with category name */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-[var(--dash-text-primary)]">{editingTemplateCategoryName}</h2>
                            <span className="text-[var(--dash-text-muted)] text-sm">
                              ({editingTemplateCategoryPermissions.length} صلاحية)
                            </span>
                          </div>
                          {/* أزرار تفعيل/إلغاء الكل */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                const codes = editingTemplateCategoryPermissions.map(p => p.code);
                                restrictAllTemplateCategory(codes);
                              }}
                              className="px-3 py-1.5 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-[var(--dash-text-primary)] transition-colors"
                            >
                              منع الكل
                            </button>
                            <button
                              onClick={() => {
                                const codes = editingTemplateCategoryPermissions.map(p => p.code);
                                unrestrictAllTemplateCategory(codes);
                              }}
                              className="px-3 py-1.5 text-sm rounded-lg bg-green-600 hover:bg-green-700 text-[var(--dash-text-primary)] transition-colors"
                            >
                              السماح بالكل
                            </button>
                          </div>
                        </div>

                        {/* Stats Bar */}
                        <div className="bg-[var(--dash-bg-raised)] rounded-lg p-3 mb-4 flex-shrink-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <span className="text-[var(--dash-text-secondary)] text-sm">
                                  ممنوع: {editingTemplateCategoryPermissions.filter(p => editingTemplateRestrictions.includes(p.code)).length}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                                <span className="text-[var(--dash-text-secondary)] text-sm">
                                  مسموح: {editingTemplateCategoryPermissions.filter(p => !editingTemplateRestrictions.includes(p.code)).length}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Permissions Grid with Checkboxes */}
                        {editingTemplateCategoryPermissions.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto scrollbar-hide pb-4">
                            {editingTemplateCategoryPermissions.map((permission) => {
                              const isRestricted = editingTemplateRestrictions.includes(permission.code);
                              return (
                                <div
                                  key={permission.id}
                                  onClick={() => toggleTemplateRestriction(permission.code)}
                                  className={`
                                    relative flex flex-col p-4 rounded-xl border transition-all duration-200 cursor-pointer hover:scale-[1.02]
                                    ${isRestricted
                                      ? 'bg-red-500/10 border-red-500/40 hover:border-red-500'
                                      : 'bg-[var(--dash-bg-raised)] border-[var(--dash-border-default)]/50 hover:border-green-500/50'
                                    }
                                  `}
                                >
                                  {/* Status Indicator */}
                                  <div className={`absolute top-3 left-3 w-2 h-2 rounded-full ${isRestricted ? 'bg-red-500' : 'bg-green-500'}`} />

                                  {/* Header: Checkbox + Title */}
                                  <div className="flex items-start gap-3">
                                    {/* Checkbox */}
                                    <div className={`
                                      flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors duration-200
                                      ${isRestricted
                                        ? 'bg-red-500 border-red-500'
                                        : 'border-green-500 bg-green-500'
                                      }
                                    `}>
                                      {isRestricted ? (
                                        <svg className="w-4 h-4 text-[var(--dash-text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      ) : (
                                        <svg className="w-4 h-4 text-[var(--dash-text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="text-[var(--dash-text-primary)] font-medium text-sm leading-tight">{permission.name}</h4>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                          permission.permission_type === 'button' ? 'bg-blue-500/20 text-blue-400' :
                                          permission.permission_type === 'feature' ? 'bg-green-500/20 text-green-400' :
                                          'bg-purple-500/20 text-purple-400'
                                        }`}>
                                          {permission.permission_type === 'button' ? 'زر' :
                                           permission.permission_type === 'feature' ? 'ميزة' : 'عرض'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Description */}
                                  {permission.description && (
                                    <p className="text-[var(--dash-text-muted)] text-xs mt-2 mr-9 line-clamp-2">{permission.description}</p>
                                  )}

                                  {/* Status Text */}
                                  <div className="mt-3 mr-9">
                                    {isRestricted ? (
                                      <span className="text-xs text-red-400 font-medium">ممنوع</span>
                                    ) : (
                                      <span className="text-xs text-green-400 font-medium">مسموح</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-center text-[var(--dash-text-muted)]">
                            <div className="text-center">
                              <p className="text-lg mb-2">لا توجد صلاحيات في هذا التصنيف</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-[var(--dash-text-muted)]">
                        <div className="text-center">
                          <KeyIcon className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                          <p className="text-lg mb-2">اختر صفحة من شجرة الصلاحيات</p>
                          <p className="text-sm">حدد صفحة من القائمة الجانبية لعرض صلاحياتها وتعديلها</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* وضع عرض جدول الصلاحيات مع تابات الأدوار */
                  <div className="h-full flex flex-col">
                    {/* تابات الأدوار */}
                    <div className="flex items-center gap-2 p-4 border-b border-[var(--dash-border-subtle)] bg-[var(--dash-bg-raised)]">
                      {ROLE_TYPES.map((roleType) => (
                        <button
                          key={roleType}
                          onClick={() => setSelectedRoleType(roleType)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedRoleType === roleType
                              ? `${ROLE_TYPE_COLORS[roleType]} border border-current`
                              : 'text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-bg-overlay)]'
                          }`}
                        >
                          {roleType}
                          <span className="mr-2 px-1.5 py-0.5 rounded-full text-xs bg-[var(--dash-bg-overlay)]/50">
                            {getTemplatesByRole(roleType).length}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* جدول الصلاحيات */}
                    <div className="flex-1 overflow-hidden">
                      {filteredTemplates.length > 0 ? (
                        <ResizableTable
                          columns={templateColumns}
                          data={filteredTemplates}
                          selectedRowId={selectedTemplateId || undefined}
                          onRowClick={(item) => {
                            if (selectedTemplateId === item.id) {
                              setSelectedTemplateId(null);
                            } else {
                              setSelectedTemplateId(item.id);
                            }
                          }}
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center text-[var(--dash-text-muted)]">
                            <KeyIcon className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                            <p className="text-lg mb-2">لا توجد صلاحيات لدور {selectedRoleType}</p>
                            <p className="text-sm mb-4">قم بإنشاء صلاحية جديدة للبدء</p>
                            <button
                              onClick={handleOpenAddTemplateModal}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-[var(--dash-text-primary)] rounded-lg transition-colors"
                            >
                              صلاحية جديدة
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              ) : (
                <ResizableTable
                  columns={getCurrentColumns()}
                  data={getCurrentData()}
                  selectedRowId={activeView === 'roles' ? selectedRoleId : undefined}
                  onRowClick={(item) => {
                    if (activeView === 'roles') {
                      // إذا كان الصف محدد بالفعل، قم بإلغاء التحديد
                      if (selectedRoleId === item.id) {
                        setSelectedRoleId(null);
                      } else {
                        // وإلا حدد الصف الجديد
                        setSelectedRoleId(item.id);
                      }
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Permission Modal */}
      <AddPermissionModal
        isOpen={isAddPermissionModalOpen}
        onClose={() => setIsAddPermissionModalOpen(false)}
        onPermissionAdded={(permission) => {
          console.log('New permission added:', permission);
          // Here you would typically save to database
        }}
      />

      {/* Add Role Modal - Side Panel */}
      <>
        {/* Backdrop */}
        {isAddRoleModalOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-25 z-40"
            onClick={() => setIsAddRoleModalOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`fixed top-12 right-0 h-[calc(100vh-3rem)] w-[500px] bg-[var(--dash-bg-surface)] z-50 transform transition-transform duration-300 ease-in-out ${
          isAddRoleModalOpen ? 'translate-x-0' : 'translate-x-full'
        } shadow-2xl`}>
          
          {/* Header */}
          <div className="bg-[var(--dash-bg-surface)] px-4 py-3 flex items-center justify-start border-b border-[var(--dash-border-default)]">
            <h2 className="text-[var(--dash-text-primary)] text-lg font-medium flex-1 text-right">إضافة دور جديد</h2>
            <button
              onClick={() => setIsAddRoleModalOpen(false)}
              className="text-[var(--dash-text-primary)] hover:text-gray-200 transition-colors ml-4"
            >
              <ArrowRightIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Tab Navigation Bar */}
          <div className="bg-[var(--dash-bg-surface)] border-b border-[var(--dash-border-default)]">
            <div className="flex">
              <button className="relative px-6 py-3 text-sm font-medium text-[#5DADE2]">
                تفاصيل الدور
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--dash-accent-blue)]"></div>
              </button>
            </div>
          </div>

          {/* Content Area - Scrollable */}
          <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-4">
            
            {/* Role Name */}
            <div className="space-y-2">
              <label className="block text-[var(--dash-text-primary)] text-sm font-medium text-right">
                اسم الدور *
              </label>
              <input
                type="text"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="أدخل اسم الدور"
                className="w-full px-3 py-2 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-primary)] placeholder-[var(--dash-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--dash-accent-blue)] focus:border-[var(--dash-accent-blue)] text-right text-sm"
              />
            </div>

            {/* Price Level */}
            <div className="space-y-2">
              <label className="block text-[var(--dash-text-primary)] text-sm font-medium text-right">
                مستوى السعر *
              </label>
              <select
                value={newRolePriceLevel}
                onChange={(e) => setNewRolePriceLevel(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--dash-accent-blue)] focus:border-[var(--dash-accent-blue)] text-right text-sm"
              >
                <option value={1}>سعر 1</option>
                <option value={2}>سعر 2</option>
                <option value={3}>سعر 3</option>
                <option value={4}>سعر 4</option>
              </select>
              <p className="text-[var(--dash-text-muted)] text-xs text-right">
                حدد مستوى السعر الذي سيربط بهذا الدور
              </p>
            </div>

            {/* Permission Template Selection */}
            <div className="space-y-2">
              <label className="block text-[var(--dash-text-primary)] text-sm font-medium text-right">
                قالب الصلاحيات
              </label>
              <select
                value={selectedRoleTemplateId || ''}
                onChange={(e) => setSelectedRoleTemplateId(e.target.value || null)}
                className="w-full px-3 py-2 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--dash-accent-blue)] focus:border-[var(--dash-accent-blue)] text-right text-sm"
              >
                <option value="">-- بدون قالب --</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <p className="text-[var(--dash-text-muted)] text-xs text-right">
                اختر قالب صلاحيات لربطه بهذا الدور (اختياري)
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="block text-[var(--dash-text-primary)] text-sm font-medium text-right">
                وصف الدور *
              </label>
              <textarea
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                placeholder="أدخل وصف مفصل للدور"
                rows={4}
                className="w-full px-3 py-2 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-primary)] placeholder-[var(--dash-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--dash-accent-blue)] focus:border-[var(--dash-accent-blue)] text-right text-sm resize-none"
              />
            </div>

            {/* Role Info */}
            <div className="bg-blue-50/10 border border-blue-600/30 rounded-lg p-4">
              <h4 className="text-blue-300 font-medium mb-2 flex items-center gap-2 justify-end">
                <span>معلومات الدور</span>
                <ShieldCheckIcon className="h-4 w-4" />
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-300">فرعي</span>
                  <span className="text-[var(--dash-text-secondary)]">نوع الدور:</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-300">جملة</span>
                  <span className="text-[var(--dash-text-secondary)]">مشتق من:</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-300">
                    {selectedRoleTemplateId
                      ? templates.find(t => t.id === selectedRoleTemplateId)?.name || 'قالب محدد'
                      : 'نفس صلاحيات الجملة'}
                  </span>
                  <span className="text-[var(--dash-text-secondary)]">الصلاحيات:</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-[var(--dash-bg-surface)] border-t border-[var(--dash-border-default)]">
            <div className="flex gap-2">
              <div className="flex-1"></div>

              {/* Cancel and Save buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsAddRoleModalOpen(false);
                    setSelectedRoleTemplateId(null);
                  }}
                  className="bg-transparent hover:bg-[var(--dash-bg-overlay)]/10 text-[var(--dash-text-secondary)] border border-[var(--dash-border-default)] hover:border-gray-500 px-4 py-2 text-sm font-medium transition-all duration-200 min-w-[80px] flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  إلغاء
                </button>
                <button
                  onClick={handleAddDerivedRole}
                  disabled={!newRoleName.trim() || !newRoleDescription.trim()}
                  className={`bg-transparent border px-4 py-2 text-sm font-medium transition-all duration-200 min-w-[80px] flex items-center gap-2 ${
                    !newRoleName.trim() || !newRoleDescription.trim()
                      ? 'border-[var(--dash-border-default)] text-[var(--dash-text-disabled)] cursor-not-allowed'
                      : 'hover:bg-[var(--dash-bg-overlay)]/10 text-[var(--dash-text-secondary)] border-[var(--dash-border-default)] hover:border-gray-500'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  حفظ
                </button>
              </div>
            </div>
          </div>
        </div>
      </>

      {/* Edit Role Modal - Side Panel */}
      <>
        {/* Backdrop */}
        {isEditRoleModalOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-25 z-40"
            onClick={() => handleCancelEditRole()}
          />
        )}

        {/* Sidebar */}
        <div className={`fixed top-12 right-0 h-[calc(100vh-3rem)] w-[500px] bg-[var(--dash-bg-surface)] z-50 transform transition-transform duration-300 ease-in-out ${
          isEditRoleModalOpen ? 'translate-x-0' : 'translate-x-full'
        } shadow-2xl`}>
          
          {/* Header */}
          <div className="bg-[var(--dash-bg-surface)] px-4 py-3 flex items-center justify-start border-b border-[var(--dash-border-default)]">
            <h2 className="text-[var(--dash-text-primary)] text-lg font-medium flex-1 text-right">تعديل الدور</h2>
            <button
              onClick={() => handleCancelEditRole()}
              className="text-[var(--dash-text-primary)] hover:text-gray-200 transition-colors ml-4"
            >
              <ArrowRightIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Tab Navigation Bar */}
          <div className="bg-[var(--dash-bg-surface)] border-b border-[var(--dash-border-default)]">
            <div className="flex">
              <button className="relative px-6 py-3 text-sm font-medium text-[#5DADE2]">
                تفاصيل الدور
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--dash-accent-blue)]"></div>
              </button>
            </div>
          </div>

          {/* Content Area - Scrollable */}
          <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-4">
            
            {/* Role Name */}
            <div className="space-y-2">
              <label className="block text-[var(--dash-text-primary)] text-sm font-medium text-right">
                اسم الدور *
              </label>
              <input
                type="text"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="أدخل اسم الدور"
                className="w-full px-3 py-2 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-primary)] placeholder-[var(--dash-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--dash-accent-blue)] focus:border-[var(--dash-accent-blue)] text-right text-sm"
              />
            </div>

            {/* Price Level */}
            <div className="space-y-2">
              <label className="block text-[var(--dash-text-primary)] text-sm font-medium text-right">
                مستوى السعر *
              </label>
              <select
                value={newRolePriceLevel}
                onChange={(e) => setNewRolePriceLevel(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--dash-accent-blue)] focus:border-[var(--dash-accent-blue)] text-right text-sm"
              >
                <option value={1}>سعر 1</option>
                <option value={2}>سعر 2</option>
                <option value={3}>سعر 3</option>
                <option value={4}>سعر 4</option>
              </select>
              <p className="text-[var(--dash-text-muted)] text-xs text-right">
                حدد مستوى السعر الذي سيربط بهذا الدور
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="block text-[var(--dash-text-primary)] text-sm font-medium text-right">
                وصف الدور *
              </label>
              <textarea
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                placeholder="أدخل وصف مفصل للدور"
                rows={4}
                className="w-full px-3 py-2 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-primary)] placeholder-[var(--dash-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--dash-accent-blue)] focus:border-[var(--dash-accent-blue)] text-right text-sm resize-none"
              />
            </div>

            {/* Role Info */}
            <div className="bg-blue-50/10 border border-blue-600/30 rounded-lg p-4">
              <h4 className="text-blue-300 font-medium mb-2 flex items-center gap-2 justify-end">
                <span>معلومات الدور</span>
                <ShieldCheckIcon className="h-4 w-4" />
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-300">فرعي</span>
                  <span className="text-[var(--dash-text-secondary)]">نوع الدور:</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-300">جملة</span>
                  <span className="text-[var(--dash-text-secondary)]">مشتق من:</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-300">نفس صلاحيات الجملة</span>
                  <span className="text-[var(--dash-text-secondary)]">الصلاحيات:</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-[var(--dash-bg-surface)] border-t border-[var(--dash-border-default)]">
            <div className="flex gap-2">
              <div className="flex-1"></div>
              
              {/* Cancel and Save buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleCancelEditRole()}
                  className="bg-transparent hover:bg-[var(--dash-bg-overlay)]/10 text-[var(--dash-text-secondary)] border border-[var(--dash-border-default)] hover:border-gray-500 px-4 py-2 text-sm font-medium transition-all duration-200 min-w-[80px] flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  إلغاء
                </button>
                <button
                  onClick={handleSaveEditedRole}
                  disabled={!newRoleName.trim() || !newRoleDescription.trim()}
                  className={`bg-transparent border px-4 py-2 text-sm font-medium transition-all duration-200 min-w-[80px] flex items-center gap-2 ${
                    !newRoleName.trim() || !newRoleDescription.trim()
                      ? 'border-[var(--dash-border-default)] text-[var(--dash-text-disabled)] cursor-not-allowed' 
                      : 'hover:bg-[var(--dash-bg-overlay)]/10 text-[var(--dash-text-secondary)] border-[var(--dash-border-default)] hover:border-gray-500'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  حفظ التعديل
                </button>
              </div>
            </div>
          </div>
        </div>
      </>

      {/* Add Template Modal - Side Panel */}
      <>
        {/* Backdrop */}
        {isAddTemplateModalOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-25 z-40"
            onClick={() => setIsAddTemplateModalOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`fixed top-12 right-0 h-[calc(100vh-3rem)] w-[500px] bg-[var(--dash-bg-surface)] z-50 transform transition-transform duration-300 ease-in-out ${
          isAddTemplateModalOpen ? 'translate-x-0' : 'translate-x-full'
        } shadow-2xl`}>

          {/* Header */}
          <div className="bg-[var(--dash-bg-surface)] px-4 py-3 flex items-center justify-start border-b border-[var(--dash-border-default)]">
            <h2 className="text-[var(--dash-text-primary)] text-lg font-medium flex-1 text-right">إضافة صلاحية جديدة</h2>
            <button
              onClick={() => setIsAddTemplateModalOpen(false)}
              className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)]"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-4">

            {/* Role Type Badge */}
            <div className="flex items-center justify-end gap-2 p-3 bg-[var(--dash-bg-surface)] rounded-lg border border-[var(--dash-border-default)]">
              <span className="text-[var(--dash-text-muted)] text-sm">صلاحية لدور:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${ROLE_TYPE_COLORS[selectedRoleType]}`}>
                {selectedRoleType}
              </span>
            </div>

            {/* Template Name */}
            <div className="space-y-2">
              <label className="block text-[var(--dash-text-primary)] text-sm font-medium text-right">
                اسم الصلاحية *
              </label>
              <input
                type="text"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="مثال: محدود، بدون تقارير، كاشير..."
                className="w-full px-3 py-2 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-primary)] placeholder-[var(--dash-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--dash-accent-blue)] focus:border-[var(--dash-accent-blue)] text-right text-sm"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="block text-[var(--dash-text-primary)] text-sm font-medium text-right">
                الوصف
              </label>
              <textarea
                value={newTemplateDescription}
                onChange={(e) => setNewTemplateDescription(e.target.value)}
                placeholder="وصف اختياري للصلاحية"
                rows={4}
                className="w-full px-3 py-2 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-primary)] placeholder-[var(--dash-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--dash-accent-blue)] focus:border-[var(--dash-accent-blue)] text-right text-sm resize-none"
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-50/10 border border-blue-600/30 rounded-lg p-4">
              <h4 className="text-blue-300 font-medium mb-2 flex items-center gap-2 justify-end">
                <span>معلومات</span>
                <KeyIcon className="h-4 w-4" />
              </h4>
              <div className="space-y-2 text-sm text-[var(--dash-text-secondary)]">
                <p className="text-right">بعد إنشاء الصلاحية، سيتم فتح شاشة تحديد القيود (الأزرار والميزات الممنوعة).</p>
                <p className="text-right">صلاحية "عام" تعني أن الدور يعمل بالكامل بدون قيود.</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-[var(--dash-bg-surface)] border-t border-[var(--dash-border-default)]">
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsAddTemplateModalOpen(false)}
                className="bg-transparent hover:bg-[var(--dash-bg-overlay)]/10 text-[var(--dash-text-secondary)] border border-[var(--dash-border-default)] hover:border-gray-500 px-4 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-2"
              >
                <XMarkIcon className="w-4 h-4" />
                إلغاء
              </button>
              <button
                onClick={handleCreateTemplate}
                disabled={!newTemplateName.trim() || isCreatingTemplate}
                className={`px-4 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-2 rounded ${
                  !newTemplateName.trim() || isCreatingTemplate
                    ? 'bg-[var(--dash-bg-overlay)] text-[var(--dash-text-muted)] cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-[var(--dash-text-primary)]'
                }`}
              >
                {isCreatingTemplate ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    إنشاء القالب
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </>

      {/* Edit Template Modal - Side Panel */}
      <>
        {/* Backdrop */}
        {isEditTemplateModalOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-25 z-40"
            onClick={() => setIsEditTemplateModalOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`fixed top-12 right-0 h-[calc(100vh-3rem)] w-[500px] bg-[var(--dash-bg-surface)] z-50 transform transition-transform duration-300 ease-in-out ${
          isEditTemplateModalOpen ? 'translate-x-0' : 'translate-x-full'
        } shadow-2xl`}>

          {/* Header */}
          <div className="bg-[var(--dash-bg-surface)] px-4 py-3 flex items-center justify-start border-b border-[var(--dash-border-default)]">
            <h2 className="text-[var(--dash-text-primary)] text-lg font-medium flex-1 text-right">تعديل قالب الصلاحيات</h2>
            <button
              onClick={() => setIsEditTemplateModalOpen(false)}
              className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)]"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-4">

            {/* Template Name */}
            <div className="space-y-2">
              <label className="block text-[var(--dash-text-primary)] text-sm font-medium text-right">
                اسم القالب *
              </label>
              <input
                type="text"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="مثال: صلاحيات كاشير"
                className="w-full px-3 py-2 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-primary)] placeholder-[var(--dash-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--dash-accent-blue)] focus:border-[var(--dash-accent-blue)] text-right text-sm"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="block text-[var(--dash-text-primary)] text-sm font-medium text-right">
                وصف القالب
              </label>
              <textarea
                value={newTemplateDescription}
                onChange={(e) => setNewTemplateDescription(e.target.value)}
                placeholder="وصف اختياري للقالب"
                rows={4}
                className="w-full px-3 py-2 bg-[var(--dash-bg-surface)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-primary)] placeholder-[var(--dash-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--dash-accent-blue)] focus:border-[var(--dash-accent-blue)] text-right text-sm resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-[var(--dash-bg-surface)] border-t border-[var(--dash-border-default)]">
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsEditTemplateModalOpen(false)}
                className="bg-transparent hover:bg-[var(--dash-bg-overlay)]/10 text-[var(--dash-text-secondary)] border border-[var(--dash-border-default)] hover:border-gray-500 px-4 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-2"
              >
                <XMarkIcon className="w-4 h-4" />
                إلغاء
              </button>
              <button
                onClick={handleUpdateTemplate}
                disabled={!newTemplateName.trim()}
                className={`px-4 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-2 rounded ${
                  !newTemplateName.trim()
                    ? 'bg-[var(--dash-bg-overlay)] text-[var(--dash-text-muted)] cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-[var(--dash-text-primary)]'
                }`}
              >
                <CheckIcon className="w-4 h-4" />
                حفظ التعديلات
              </button>
            </div>
          </div>
        </div>
      </>
    </div>
  );
}