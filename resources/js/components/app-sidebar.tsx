import { Link, usePage } from '@inertiajs/react';
import {
    Activity,
    BarChart3,
    BookOpen,
    Calendar,
    CheckSquare,
    CreditCard,
    FolderKanban,
    Gauge,
    GraduationCap,
    HardDrive,
    HeartHandshake,
    History,
    Inbox,
    Key,
    Layers,
    LayoutDashboard,
    LayoutGrid,
    Lock,
    PieChart,
    Plug,
    Rocket,
    Shield,
    ShieldCheck,
    Smartphone,
    Sparkles,
    Timer,
    Upload,
    UserCheck,
    Users,
    UsersRound,
    Webhook,
    Zap,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { Auth, NavItem } from '@/types';

export function AppSidebar() {
    const { auth } = usePage<{ auth?: Auth }>().props;
    const role = auth?.organization?.role || 'guest';
    const permissions = auth?.permissions || [];
    const isOwner = role === 'owner';
    const isOwnerOrAdmin = isOwner || role === 'admin';
    const isManagerPlus = isOwnerOrAdmin || role === 'manager';
    const isMemberPlus = isManagerPlus || role === 'member';

    const canViewMembers =
        isOwnerOrAdmin ||
        permissions.includes('members:view') ||
        permissions.includes('members:invite');
    const canManageRoles =
        isOwnerOrAdmin || permissions.includes('roles:manage');
    const canManageOrg = isOwnerOrAdmin || permissions.includes('org:manage');
    const canViewAudit = isOwnerOrAdmin || permissions.includes('audit:view');
    const canManageBilling = isOwner || permissions.includes('org:billing');
    const canManageAi =
        isOwnerOrAdmin ||
        permissions.includes('ai:configure') ||
        permissions.includes('org:manage');
    const canManageAutomations =
        isOwnerOrAdmin || permissions.includes('automations:manage');
    const canImportData =
        isOwnerOrAdmin ||
        permissions.includes('projects:create') ||
        permissions.includes('org:manage');
    const canManageIntegrations =
        isOwnerOrAdmin || permissions.includes('org:manage');
    const canViewReports =
        isManagerPlus || permissions.includes('reports:view');
    const canManagePortfolios =
        isManagerPlus || permissions.includes('portfolios:manage');
    const canManageTeams =
        isManagerPlus || permissions.includes('teams:manage');
    const canAccessAi = isMemberPlus || permissions.includes('ai:access');

    // 1. Menu Utama
    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboard(),
            icon: LayoutGrid,
        },
        ...(isMemberPlus
            ? [
                  {
                      title: 'Pekerjaan Saya',
                      href: '/projects',
                      icon: CheckSquare,
                  },
              ]
            : []),
        {
            title: 'Kotak Masuk',
            href: '/inbox',
            icon: Inbox,
        },
    ];

    // 2. Workspace & Kolaborasi
    const workspaceNavItems: NavItem[] = [
        {
            title: 'Proyek',
            href: '/projects',
            icon: FolderKanban,
        },
        ...(isMemberPlus
            ? [
                  {
                      title: 'Timeline & Roadmap',
                      href: '/timeline',
                      icon: Calendar,
                  },
              ]
            : []),
        {
            title: 'Kalender & Jadwal',
            href: '/calendar',
            icon: Calendar,
        },
        ...(isMemberPlus
            ? [
                  {
                      title: 'Daily Standup Tim',
                      href: '/scrum/daily-standup',
                      icon: UserCheck,
                  },
              ]
            : []),
        {
            title: 'Wiki & Dokumen',
            href: '/wiki',
            icon: BookOpen,
        },
        ...(isMemberPlus
            ? [
                  {
                      title: 'Manajemen Berkas',
                      href: '/files',
                      icon: HardDrive,
                  },
              ]
            : []),
        {
            title: 'Catatan Rilis & Changelog',
            href: '/releases',
            icon: Rocket,
        },
    ];

    // 3. Tim & Portofolio (Hanya ditampilkan jika memiliki item)
    const teamPortfolioNavItems: NavItem[] = [
        ...(canManagePortfolios
            ? [
                  {
                      title: 'Portofolio',
                      href: '/portfolio',
                      icon: PieChart,
                  },
              ]
            : []),
        ...(isManagerPlus || canManageTeams
            ? [
                  {
                      title: 'Kapasitas Tim',
                      href: '/workload',
                      icon: Layers,
                  },
              ]
            : []),
        ...(isManagerPlus || canManageTeams || canViewMembers
            ? [
                  {
                      title: 'Direktori Tim',
                      href: '/teams',
                      icon: UsersRound,
                  },
              ]
            : []),
        ...(isManagerPlus || isOwnerOrAdmin
            ? [
                  {
                      title: 'Keahlian & Alokasi Tim',
                      href: '/organization/skills',
                      icon: GraduationCap,
                  },
              ]
            : []),
        ...(isMemberPlus
            ? [
                  {
                      title: 'Mood & Pulse Tim',
                      href: '/organization/pulse',
                      icon: HeartHandshake,
                  },
              ]
            : []),
    ];

    // 4. Laporan & Analytics (Manager, Admin, Owner)
    const analyticsNavItems: NavItem[] = [
        ...(canViewReports
            ? [
                  {
                      title: 'Laporan & Metrik',
                      href: '/reports',
                      icon: BarChart3,
                  },
              ]
            : []),
        ...(isManagerPlus
            ? [
                  {
                      title: 'Executive BI & Widget Builder',
                      href: '/dashboard/builder',
                      icon: LayoutDashboard,
                  },
                  {
                      title: 'Performa Kolaborasi',
                      href: '/reports/collaboration',
                      icon: PieChart,
                  },
              ]
            : []),
    ];

    // 5. AI & Otomasi
    const aiNavItems: NavItem[] = [
        ...(canAccessAi
            ? [
                  {
                      title: 'Asisten AI',
                      href: '/search',
                      icon: Sparkles,
                  },
              ]
            : []),
        ...(canManageAutomations
            ? [
                  {
                      title: 'Otomasi Workflow',
                      href: '/automation',
                      icon: Zap,
                  },
              ]
            : []),
        ...(canManageAi
            ? [
                  {
                      title: 'Pengaturan AI & Kuota',
                      href: '/organization/ai-settings',
                      icon: Zap,
                  },
              ]
            : []),
        ...(isOwnerOrAdmin
            ? [
                  {
                      title: 'AI Root Cause Analysis (RCA)',
                      href: '/organization/sre/rca',
                      icon: Sparkles,
                  },
                  {
                      title: 'Distributed Traces & SRE',
                      href: '/organization/sre/traces',
                      icon: Activity,
                  },
              ]
            : []),
    ];

    // 6. Organisasi & Administrasi (Admin & Owner only, or specific permissions)
    const adminNavItems: NavItem[] = [
        ...(canViewMembers
            ? [
                  {
                      title: 'Anggota Organisasi',
                      href: '/organization/members',
                      icon: Users,
                  },
              ]
            : []),
        ...(canManageRoles
            ? [
                  {
                      title: 'Peran & Izin (RBAC)',
                      href: '/organization/roles',
                      icon: Key,
                  },
              ]
            : []),
        ...(canManageBilling
            ? [
                  {
                      title: 'Tagihan & Penggunaan',
                      href: '/organization/billing',
                      icon: CreditCard,
                  },
              ]
            : []),
        ...(canManageIntegrations
            ? [
                  {
                      title: 'Marketplace Integrasi',
                      href: '/integrations',
                      icon: Plug,
                  },
                  {
                      title: 'Webhook & Outbound Hub',
                      href: '/organization/webhooks',
                      icon: Webhook,
                  },
              ]
            : []),
        ...(isOwnerOrAdmin || canManageOrg
            ? [
                  {
                      title: 'SLA & Matriks Eskalasi',
                      href: '/organization/sla',
                      icon: Timer,
                  },
                  {
                      title: 'Kapasitas & Beban Kerja',
                      href: '/organization/capacity',
                      icon: Gauge,
                  },
              ]
            : []),
        ...(canImportData
            ? [
                  {
                      title: 'Pusat Impor Data',
                      href: '/import',
                      icon: Upload,
                  },
              ]
            : []),
        ...(canManageOrg
            ? [
                  {
                      title: 'Single Sign-On (SSO)',
                      href: '/organization/sso',
                      icon: Lock,
                  },
                  {
                      title: 'Keamanan Sesi & Akses',
                      href: '/organization/security-settings',
                      icon: Shield,
                  },
                  {
                      title: 'Retensi & Kepatuhan',
                      href: '/organization/data-retention',
                      icon: History,
                  },
              ]
            : []),
        ...(canViewAudit
            ? [
                  {
                      title: 'Log Audit Sistem',
                      href: '/organization/audit-logs',
                      icon: ShieldCheck,
                  },
              ]
            : []),
        ...(isOwnerOrAdmin
            ? [
                  {
                      title: 'Status & Kesehatan Sistem',
                      href: '/system-status',
                      icon: Activity,
                  },
                  {
                      title: 'Sistem Desain UI',
                      href: '/design-system',
                      icon: Layers,
                  },
              ]
            : []),
        ...(isMemberPlus
            ? [
                  {
                      title: 'Mode Mobile Companion',
                      href: '/mobile',
                      icon: Smartphone,
                  },
              ]
            : []),
    ];

    return (
        <Sidebar
            collapsible="icon"
            variant="inset"
            className="border-r border-sidebar-border bg-sidebar"
        >
            <SidebarHeader className="border-b border-sidebar-border/50">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="space-y-2">
                <NavMain items={mainNavItems} groupLabel="Menu Utama" />
                <NavMain items={workspaceNavItems} groupLabel="Workspace" />
                {teamPortfolioNavItems.length > 0 && (
                    <NavMain
                        items={teamPortfolioNavItems}
                        groupLabel="Tim & Portofolio"
                    />
                )}
                {analyticsNavItems.length > 0 && (
                    <NavMain
                        items={analyticsNavItems}
                        groupLabel="Laporan & Metrik"
                    />
                )}
                {aiNavItems.length > 0 && (
                    <NavMain items={aiNavItems} groupLabel="AI & Otomasi" />
                )}
                {adminNavItems.length > 0 && (
                    <NavMain
                        items={adminNavItems}
                        groupLabel="Administrasi & Keamanan"
                    />
                )}
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border/50">
                {/* Connection Status Indicator */}
                <div className="flex items-center justify-between px-3 py-1.5 text-xs text-on-surface-variant group-data-[collapsible=icon]:hidden">
                    <div className="flex items-center gap-2">
                        <span className="size-2 animate-pulse rounded-full bg-status-done" />
                        <span className="font-mono text-[11px] tracking-wider uppercase">
                            Connected
                        </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                        v2.0.0
                    </span>
                </div>

                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}

