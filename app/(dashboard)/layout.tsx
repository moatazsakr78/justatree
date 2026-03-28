import { DashboardProviders } from './providers'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware handles all auth/permission checks
  // Dashboard-specific providers loaded here (not at root) for better performance
  return <DashboardProviders>{children}</DashboardProviders>;
}
