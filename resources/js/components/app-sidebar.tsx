import { Link, usePage } from '@inertiajs/react';
import {
    BarChart3,
    CheckSquare,
    FolderKanban,
    Inbox,
    Key,
    LayoutGrid,
    PieChart,
    Sparkles,
    Users,
    UsersRound,
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
        href: '/notifications',
        icon: Inbox,
    },
];

export function AppSidebar() {
    const { auth } = usePage<{ auth?: Auth }>().props;
    const role = auth?.organization?.role || 'guest';
    const permissions = auth?.permissions || [];
    const isOwnerOrAdmin = role === 'owner' || role === 'admin';

    const canViewMembers = isOwnerOrAdmin || permissions.includes('members:view') || permissions.includes('members:invite');
    const canManageRoles = isOwnerOrAdmin || permissions.includes('roles:manage');
    const canManageAi = isOwnerOrAdmin || permissions.includes('organization:manage');

    const workspaceNavItems: NavItem[] = [
        {
            title: 'Proyek',
            href: '/projects',
            icon: FolderKanban,
        },
        {
            title: 'Portofolio',
            href: '#',
            icon: PieChart,
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
            href: '#',
            icon: BarChart3,
        },
    ];

    const securityNavItems: NavItem[] = canManageRoles
        ? [
              {
                  title: 'Peran & Izin (RBAC)',
                  href: '/organization/roles',
                  icon: Key,
              },
          ]
        : [];

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
        {
            title: 'Otomasi Workflow',
            href: '#',
            icon: Zap,
        },
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
