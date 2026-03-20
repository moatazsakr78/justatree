'use client';

import { ComponentType } from 'react';
import { usePageProtection } from '@/app/lib/hooks/useRoleAccess';
import UnauthorizedAccess from './UnauthorizedAccess';

// Loading component
const LoadingScreen = () => (
  <div className="min-h-screen bg-dash-base flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--dash-accent-blue)] mx-auto mb-4"></div>
      <p className="text-[var(--dash-text-secondary)]">جاري التحقق من الصلاحيات...</p>
    </div>
  </div>
);

interface WithRoleProtectionOptions {
  redirectOnUnauthorized?: boolean;
  showUnauthorizedPage?: boolean;
}

/**
 * Higher-order component that protects pages based on user roles
 * @param WrappedComponent - The component to protect
 * @param options - Configuration options
 * @returns Protected component
 */
export function withRoleProtection<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithRoleProtectionOptions = {}
) {
  const {
    redirectOnUnauthorized = false,
    showUnauthorizedPage = true
  } = options;

  return function ProtectedComponent(props: P) {
    const { userRole, hasAccess, isLoading, shouldRender } = usePageProtection(redirectOnUnauthorized);

    // Show loading screen while checking permissions
    if (isLoading) {
      return <LoadingScreen />;
    }

    // If redirect is enabled, the hook handles redirection
    if (redirectOnUnauthorized && !hasAccess) {
      return <LoadingScreen />; // Brief loading while redirecting
    }

    // Show unauthorized page if no access and showUnauthorizedPage is true
    if (!hasAccess && showUnauthorizedPage) {
      return <UnauthorizedAccess userRole={userRole} />;
    }

    // Render the wrapped component only if authorized
    if (shouldRender) {
      return <WrappedComponent {...props} />;
    }

    // Default fallback - show unauthorized
    return <UnauthorizedAccess userRole={userRole} />;
  };
}

// Preset configurations for different protection levels

/**
 * Strict protection - redirects unauthorized users immediately
 */
export const withStrictProtection = <P extends object>(component: ComponentType<P>) =>
  withRoleProtection(component, { redirectOnUnauthorized: true, showUnauthorizedPage: false });

/**
 * Soft protection - shows unauthorized page but doesn't redirect
 */
export const withSoftProtection = <P extends object>(component: ComponentType<P>) =>
  withRoleProtection(component, { redirectOnUnauthorized: false, showUnauthorizedPage: true });

/**
 * Admin-only protection for dashboard pages
 */
export const withAdminProtection = <P extends object>(component: ComponentType<P>) =>
  withRoleProtection(component, { redirectOnUnauthorized: false, showUnauthorizedPage: true });