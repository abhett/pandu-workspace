import { Link, usePage } from '@inertiajs/react';
import {
    Activity,
    BarChart3,
    BookOpen,
    Calendar,
    CheckSquare,
    CreditCard,
    FolderKanban,
    HardDrive,
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

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Pekerjaan Saya',
        href: '#',
        icon: CheckSquare,
    },
    {
        title: 'Kotak Masuk',
        href: '/inbox',
        icon: Inbox,
    },
];

export function AppSidebar() {
    const { auth } = usePage<{ auth?: Auth }>().props;
    const role = auth?.organization?.role || 'guest';
    const permissions = auth?.permissions || [];
    const isOwner = role === 'owner';
    const isOwnerOrAdmin = isOwner || role === 'admin';
    const isManagerPlus = isOwnerOrAdmin || role === 'manager';

    const canViewMembers = isOwnerOrAdmin || permissions.includes('members:view') || permissions.includes('members:invite');
    const canManageRoles = isOwnerOrAdmin || permissions.includes('roles:manage');
    const canManageOrg = isOwnerOrAdmin || permissions.includes('org:manage');
    const canViewAudit = isOwnerOrAdmin || permissions.includes('audit:view');
    const canManageBilling = isOwner || permissions.includes('org:billing');
    const canManageAi = isOwnerOrAdmin || permissions.includes('ai:configure') || permissions.includes('org:manage');
    const canManageAutomations = isOwnerOrAdmin || permissions.includes('automations:manage');
    const canImportData = isOwnerOrAdmin || permissions.includes('projects:create') || permissions.includes('org:manage');
    const canManageIntegrations = isOwnerOrAdmin || permissions.includes('org:manage');

    const workspaceNavItems: NavItem[] = [
        {
            title: 'Proyek',
            href: '/projects',
            icon: FolderKanban,
        },
        ...(isManagerPlus || permissions.includes('portfolios:manage')
            ? [
                  {
                      title: 'Portofolio',
                      href: '/portfolio',
                      icon: PieChart,
                  },
              ]
            : []),
        {
            title: 'Daily Standup Tim',
            href: '/scrum/daily-standup',
            icon: UserCheck,
        },
        {
            title: 'Catatan Rilis & Changelog',
            href: '/releases',
            icon: Rocket,
        },
        {
            title: 'Timeline & Roadmap',
            href: '/timeline',
            icon: Calendar,
        },
        {
            title: 'Kalender & Jadwal',
            href: '/calendar',
            icon: Calendar,
        },
        {
            title: 'Kapasitas Tim',
            href: '/workload',
            icon: Layers,
        },
        {
            title: 'Direktori Tim',
            href: '/teams',
            icon: UsersRound,
        },
        ...(canViewMembers
            ? [
                  {
                      title: 'Anggota Organisasi',
                      href: '/organization/members',
                      icon: Users,
                  },
              ]
            : []),
        {
            title: 'Laporan & Metrik',
            href: '/reports',
            icon: BarChart3,
        },
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
        ...(canImportData
            ? [
                  {
                      title: 'Pusat Impor Data',
                      href: '/import',
                      icon: Upload,
                  },
              ]
            : []),
        {
            title: 'Wiki & Dokumen',
            href: '/wiki',
            icon: BookOpen,
        },
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
        {
            title: 'Manajemen Berkas',
            href: '/files',
            icon: HardDrive,
        },
        {
            title: 'Mode Mobile Companion',
            href: '/mobile',
            icon: Smartphone,
        },
    ];

    const securityNavItems: NavItem[] = [
        ...(canManageRoles
            ? [
                  {
                      title: 'Peran & Izin (RBAC)',
                      href: '/organization/roles',
                      icon: Key,
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
        ...(canManageBilling
            ? [
                  {
                      title: 'Tagihan & Penggunaan',
                      href: '/organization/billing',
                      icon: CreditCard,
                  },
              ]
            : []),
        ...(canManageOrg
            ? [
                  {
                      title: 'Retensi & Kepatuhan',
                      href: '/organization/data-retention',
                      icon: History,
                  },
                  {
                      title: 'Status & Kesehatan Sistem',
                      href: '/system-status',
                      icon: Activity,
                  },
              ]
            : []),
        ...(isOwnerOrAdmin
            ? [
                  {
                      title: 'Sistem Desain UI',
                      href: '/design-system',
                      icon: Layers,
                  },
              ]
            : []),
    ];

    const aiNavItems: NavItem[] = [
        {
            title: 'Asisten AI',
            href: '#',
            icon: Sparkles,
        },
        ...(canManageAi
            ? [
                  {
                      title: 'Pengaturan AI & Kuota',
                      href: '/organization/ai-settings',
                      icon: Zap,
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
                {securityNavItems.length > 0 && (
                    <NavMain
                        items={securityNavItems}
                        groupLabel="Keamanan & Akses"
                    />
                )}
                <NavMain items={aiNavItems} groupLabel="AI & Automations" />
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
