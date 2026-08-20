import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    GraduationCap,
    Plus,
    Users,
    Sparkles,
    Star,
    Layers,
    Search,
    Edit3,
    Trash2,
    CheckCircle2,
    Briefcase,
    TrendingUp,
    ShieldCheck,
    Bot,
    ArrowRight,
    Award,
    Code,
    Server,
    Palette,
    Cpu,
    CheckSquare,
    FolderKanban,
    AlertCircle,
    UserCheck,
} from 'lucide-react';

interface SkillItem {
    id: string;
    name: string;
    category: string;
    description?: string | null;
    color: string;
    user_skills_count?: number;
}

interface MemberSkillItem {
    id: string;
    skill_id: string;
    skill_name?: string;
    category?: string;
    color?: string;
    proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    years_of_experience: number;
    verified: boolean;
}

interface MemberProfile {
    user_id: number;
    user_name?: string;
    user_email?: string;
    skills: MemberSkillItem[];
}

interface Metrics {
    total_skills: number;
    members_with_skills: number;
    total_members: number;
    coverage_rate: number;
    category_breakdown: Record<string, number>;
}

interface MemberOption {
    id: number;
    name: string;
    email: string;
}

interface ProjectOption {
    id: string;
    name: string;
    key: string;
    tasks: Array<{
        id: string;
        project_id: string;
        key: string;
        title: string;
        priority: string;
        type: string;
    }>;
}

interface MatchCandidate {
    user_id: number;
    user_name: string;
    user_email: string;
    match_score: number;
    skill_fit_score: number;
    active_tasks_count: number;
    verdict: string;
    matched_skills: Array<{
        skill_name?: string;
        level: string;
        years: number;
        score: number;
    }>;
    all_skills: Array<{
        name?: string;
        level: string;
    }>;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    skills: SkillItem[];
    memberProfiles: MemberProfile[];
    metrics: Metrics;
    members: MemberOption[];
    projects: ProjectOption[];
}

export default function SkillMatrixPage({
    organization,
    skills,
    memberProfiles,
    metrics,
    members,
    projects,
}: Props) {
    const [activeTab, setActiveTab] = useState<'matrix' | 'directory' | 'smart_matcher'>('matrix');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

    // Modal Create / Edit Skill
    const [skillModalOpen, setSkillModalOpen] = useState(false);
    const [editingSkill, setEditingSkill] = useState<SkillItem | null>(null);
    const [skillName, setSkillName] = useState('');
    const [skillCategory, setSkillCategory] = useState('backend');
    const [skillDescription, setSkillDescription] = useState('');
    const [skillColor, setSkillColor] = useState('#3b82f6');
    const [submittingSkill, setSubmittingSkill] = useState(false);

    // Modal Assign Member Skill
    const [memberSkillModalOpen, setMemberSkillModalOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string>(members[0]?.id?.toString() || '');
    const [selectedSkillId, setSelectedSkillId] = useState<string>(skills[0]?.id || '');
    const [proficiencyLevel, setProficiencyLevel] = useState<'beginner' | 'intermediate' | 'advanced' | 'expert'>('intermediate');
    const [yearsOfExp, setYearsOfExp] = useState<number | string>(2);
    const [submittingMemberSkill, setSubmittingMemberSkill] = useState(false);

    // Smart Matcher State
    const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
    const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];
    const [selectedTaskId, setSelectedTaskId] = useState<string>(currentProject?.tasks[0]?.id || '');
    const [matchingCandidates, setMatchingCandidates] = useState<MatchCandidate[]>([]);
    const [loadingMatches, setLoadingMatches] = useState(false);

    // Categories list helper
    const categories = [
        { id: 'all', label: 'Semua Kategori' },
        { id: 'frontend', label: 'Frontend & Web' },
        { id: 'backend', label: 'Backend & API' },
        { id: 'devops', label: 'Cloud & DevOps' },
        { id: 'design', label: 'UI/UX & Desain' },
        { id: 'qa', label: 'QA & Testing' },
        { id: 'data', label: 'Data & Database' },
        { id: 'product_management', label: 'Product & Scrum' },
        { id: 'other', label: 'Lainnya' },
    ];

    // Proficiency Star Formatter
    const renderProficiencyBadge = (level: string) => {
        const configs: Record<string, { label: string; stars: number; color: string }> = {
            beginner: { label: 'Pemula', stars: 1, color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30' },
            intermediate: { label: 'Menengah', stars: 2, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
            advanced: { label: 'Mahir', stars: 3, color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' },
            expert: { label: 'Pakar (Expert)', stars: 4, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
        };

        const cfg = configs[level] || configs.intermediate;

        return (
            <Badge className={`text-[10px] gap-1 font-semibold ${cfg.color}`}>
                <span>{cfg.label}</span>
                <span className="text-amber-500">{'★'.repeat(cfg.stars)}</span>
            </Badge>
        );
    };

    // Handle Save Skill (Create / Update)
    const handleSaveSkill = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingSkill(true);

        if (editingSkill) {
            router.put(`/organization/skills/${editingSkill.id}`, {
                name: skillName,
                category: skillCategory,
                description: skillDescription,
                color: skillColor,
            }, {
                onSuccess: () => {
                    setSkillModalOpen(false);
                    setEditingSkill(null);
                },
                onFinish: () => setSubmittingSkill(false),
            });
        } else {
            router.post('/organization/skills', {
                name: skillName,
                category: skillCategory,
                description: skillDescription,
                color: skillColor,
            }, {
                onSuccess: () => {
                    setSkillModalOpen(false);
                    setSkillName('');
                    setSkillDescription('');
                },
                onFinish: () => setSubmittingSkill(false),
            });
        }
    };

    // Handle Delete Skill
    const handleDeleteSkill = (skill: SkillItem) => {
        if (!confirm(`Hapus keahlian "${skill.name}" dari taksonomi organisasi?`)) return;

        router.delete(`/organization/skills/${skill.id}`);
    };

    // Handle Save Member Skill
    const handleSaveMemberSkill = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingMemberSkill(true);

        router.post('/organization/skills/member-skills', {
            user_id: Number(selectedUserId),
            skill_id: selectedSkillId,
            proficiency_level: proficiencyLevel,
            years_of_experience: Number(yearsOfExp),
        }, {
            onSuccess: () => setMemberSkillModalOpen(false),
            onFinish: () => setSubmittingMemberSkill(false),
        });
    };

    // Handle Delete Member Skill
    const handleDeleteMemberSkill = (userSkillId: string) => {
        if (!confirm('Hapus keahlian ini dari profil anggota?')) return;

        router.delete(`/organization/skills/member-skills/${userSkillId}`);
    };

    // Trigger AI Smart Match Recommendations
    const handleRunSmartMatcher = (taskId: string) => {
        setSelectedTaskId(taskId);
        setLoadingMatches(true);

        fetch(`/tasks/${taskId}/recommend-assignees`)
            .then((res) => res.json())
            .then((data) => {
                setLoadingMatches(false);
                if (data.recommendations) {
                    setMatchingCandidates(data.recommendations);
                }
            })
            .catch(() => setLoadingMatches(false));
    };

    // Filtered Skills
    const filteredSkills = skills.filter((s) => {
        const matchCategory = selectedCategoryFilter === 'all' || s.category === selectedCategoryFilter;
        const matchQuery = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchCategory && matchQuery;
    });

    // Filtered Profiles
    const filteredProfiles = memberProfiles.filter((p) => {
        const matchName = p.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.user_email?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchSkill = p.skills.some((sk) => sk.skill_name?.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchName || matchSkill;
    });

    return (
        <AppLayout>
            <Head title={`Keahlian & Alokasi Tim - ${organization.name}`} />

            <div className="space-y-6 pb-16">
                {/* Header */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                            <GraduationCap className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-foreground">Inventaris Keahlian & Alokasi Tim</h1>
                                <Badge variant="outline" className="text-xs font-mono">
                                    Competency AI
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Matriks kompetensi tim, pemetaan tingkat kemahiran, dan rekomendasi alokasi tugas cerdas
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setEditingSkill(null);
                                setSkillName('');
                                setSkillDescription('');
                                setSkillModalOpen(true);
                            }}
                            className="text-xs h-8 gap-1.5 border-border"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            <span>+ Tambah Keahlian</span>
                        </Button>

                        <Button
                            size="sm"
                            onClick={() => setMemberSkillModalOpen(true)}
                            className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground font-semibold shadow-xs"
                        >
                            <UserCheck className="h-3.5 w-3.5" />
                            <span>Tetapkan Keahlian Anggota</span>
                        </Button>
                    </div>
                </div>

                {/* Bento KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Keahlian Terdaftar</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Award className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.total_skills}
                            </span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Terbagi dalam 8 Kategori Teknis
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Anggota Terpetakan</span>
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <Users className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.members_with_skills}
                            </span>
                            <span className="text-xs text-muted-foreground">/ {metrics.total_members} Anggota</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Memiliki profil kompetensi terverifikasi
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Tingkat Cakupan Keahlian</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.coverage_rate}%
                            </span>
                        </div>
                        <div className="mt-2 w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 transition-all duration-500"
                                style={{ width: `${Math.min(metrics.coverage_rate, 100)}%` }}
                            />
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Alokasi Cerdas AI</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <Bot className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <span className="text-sm font-bold text-foreground flex items-center gap-1">
                                <Sparkles className="h-4 w-4 text-amber-500" />
                                <span>Skill Match Scoring</span>
                            </span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Keseimbangan Kemahiran & Beban Kerja
                        </div>
                    </div>
                </div>

                {/* Tab Controls & Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setActiveTab('matrix')}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                                activeTab === 'matrix'
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            <Users className="h-4 w-4" />
                            <span>Matriks Kompetensi Anggota ({memberProfiles.length})</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('directory')}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                                activeTab === 'directory'
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            <Layers className="h-4 w-4" />
                            <span>Katalog Keahlian ({skills.length})</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('smart_matcher')}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                                activeTab === 'smart_matcher'
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            <Sparkles className="h-4 w-4 text-amber-400" />
                            <span>Simulasi Alokasi Tugas AI</span>
                        </button>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Cari keahlian atau anggota..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 pl-9 text-xs"
                        />
                    </div>
                </div>

                {/* TAB 1: Team Skill Matrix */}
                {activeTab === 'matrix' && (
                    <div className="space-y-4">
                        {filteredProfiles.length === 0 ? (
                            <div className="rounded-2xl border border-border bg-card p-12 text-center text-xs text-muted-foreground">
                                Belum ada anggota yang memiliki pemetaan keahlian. Klik "Tetapkan Keahlian Anggota" untuk memulai.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredProfiles.map((profile) => (
                                    <div
                                        key={profile.user_id}
                                        className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                                                        {profile.user_name?.substring(0, 2).toUpperCase() || 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-sm text-foreground">
                                                            {profile.user_name}
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground">
                                                            {profile.user_email}
                                                        </div>
                                                    </div>
                                                </div>

                                                <Badge variant="outline" className="text-xs font-mono">
                                                    {profile.skills.length} Keahlian
                                                </Badge>
                                            </div>

                                            {/* Skill Pills */}
                                            <div className="pt-3 space-y-2">
                                                {profile.skills.map((s) => (
                                                    <div
                                                        key={s.id}
                                                        className="p-2 rounded-xl bg-muted/30 border border-border/60 flex items-center justify-between gap-2"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                                                style={{ backgroundColor: s.color || '#3b82f6' }}
                                                            />
                                                            <span className="text-xs font-bold text-foreground">
                                                                {s.skill_name}
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                                ({s.years_of_experience} thn)
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-1.5">
                                                            {renderProficiencyBadge(s.proficiency_level)}
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                                onClick={() => handleDeleteMemberSkill(s.id)}
                                                                title="Hapus Keahlian"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedUserId(profile.user_id.toString());
                                                setMemberSkillModalOpen(true);
                                            }}
                                            className="w-full mt-4 text-xs h-8 border-dashed"
                                        >
                                            <Plus className="h-3.5 w-3.5 mr-1" />
                                            <span>Tambah Keahlian Anggota Ini</span>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: Skills Directory */}
                {activeTab === 'directory' && (
                    <div className="space-y-4">
                        {/* Category Filter Pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
                            {categories.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => setSelectedCategoryFilter(c.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                                        selectedCategoryFilter === c.id
                                            ? 'bg-primary text-primary-foreground shadow-xs'
                                            : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                                    }`}
                                >
                                    {c.label}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredSkills.map((skill) => (
                                <div
                                    key={skill.id}
                                    className="rounded-2xl border border-border bg-card p-4 shadow-xs flex flex-col justify-between hover:border-primary/50 transition-all"
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded-full shrink-0"
                                                    style={{ backgroundColor: skill.color || '#3b82f6' }}
                                                />
                                                <span className="font-bold text-xs text-foreground line-clamp-1">
                                                    {skill.name}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-primary"
                                                    onClick={() => {
                                                        setEditingSkill(skill);
                                                        setSkillName(skill.name);
                                                        setSkillCategory(skill.category);
                                                        setSkillDescription(skill.description || '');
                                                        setSkillColor(skill.color);
                                                        setSkillModalOpen(true);
                                                    }}
                                                >
                                                    <Edit3 className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                    onClick={() => handleDeleteSkill(skill)}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>

                                        <Badge variant="outline" className="text-[9px] uppercase font-mono mt-2">
                                            {skill.category.replace('_', ' ')}
                                        </Badge>

                                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                            {skill.description || 'Taksonomi keahlian teknis terdaftar.'}
                                        </p>
                                    </div>

                                    <div className="mt-4 pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                                        <span className="flex items-center gap-1 font-semibold text-foreground">
                                            <Users className="h-3 w-3 text-primary" />
                                            <span>{skill.user_skills_count || 0} Praktisi</span>
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* TAB 3: Smart Allocation Matcher Demo */}
                {activeTab === 'smart_matcher' && (
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-xl bg-primary text-primary-foreground shadow-sm">
                                    <Bot className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">
                                        Simulasi Rekomendasi Alokasi Tugas Berbasis AI
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Pilih tiket tugas di bawah untuk menghitung kecocokan keahlian (*Skill Fit Score*) dan beban kerja saat ini secara instan.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                <div>
                                    <label className="text-xs font-semibold text-foreground block mb-1.5">
                                        Pilih Proyek
                                    </label>
                                    <Select
                                        value={selectedProjectId}
                                        onValueChange={(val) => {
                                            setSelectedProjectId(val);
                                            const p = projects.find((x) => x.id === val);
                                            if (p && p.tasks[0]) {
                                                handleRunSmartMatcher(p.tasks[0].id);
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="h-9 text-xs bg-card">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {projects.map((p) => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.name} ({p.key})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-foreground block mb-1.5">
                                        Pilih Tiket Tugas
                                    </label>
                                    <Select
                                        value={selectedTaskId}
                                        onValueChange={(val) => handleRunSmartMatcher(val)}
                                    >
                                        <SelectTrigger className="h-9 text-xs bg-card">
                                            <SelectValue placeholder="Pilih tugas..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {currentProject?.tasks.map((t) => (
                                                <SelectItem key={t.id} value={t.id}>
                                                    {t.key}: {t.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Match Results */}
                        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-amber-500" />
                                <span>Peringkat Kandidat Penugasan Terbaik</span>
                            </h3>

                            {loadingMatches ? (
                                <div className="p-8 text-center text-xs text-muted-foreground">
                                    Menghitung skor kecocokan keahlian...
                                </div>
                            ) : matchingCandidates.length === 0 ? (
                                <div className="p-8 text-center text-xs text-muted-foreground">
                                    Pilih tiket tugas di atas untuk melihat simulasi rekomendasi alokasi.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {matchingCandidates.map((candidate, idx) => (
                                        <div
                                            key={candidate.user_id}
                                            className="p-4 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center text-xs ${
                                                        idx === 0
                                                            ? 'bg-amber-500 text-white shadow-md'
                                                            : idx === 1
                                                            ? 'bg-slate-300 text-slate-900 dark:bg-slate-700 dark:text-white'
                                                            : 'bg-muted text-muted-foreground'
                                                    }`}
                                                >
                                                    #{idx + 1}
                                                </div>

                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-xs text-foreground">
                                                            {candidate.user_name}
                                                        </span>
                                                        <Badge
                                                            className={`text-[9px] ${
                                                                candidate.verdict === 'Best Fit'
                                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                                                    : candidate.verdict === 'Good Fit'
                                                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                                                                    : candidate.verdict === 'Overloaded'
                                                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                                                    : 'bg-muted text-muted-foreground'
                                                            }`}
                                                        >
                                                            {candidate.verdict}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground mt-0.5">
                                                        Tugas Aktif Sedang Dikerjakan: {candidate.active_tasks_count}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <span className="text-xs font-semibold text-muted-foreground block">
                                                        Skor Kecocokan
                                                    </span>
                                                    <span className="text-lg font-bold font-mono text-primary">
                                                        {candidate.match_score}%
                                                    </span>
                                                </div>

                                                <div className="w-32 bg-muted rounded-full h-2 overflow-hidden hidden sm:block">
                                                    <div
                                                        className={`h-full ${
                                                            candidate.match_score >= 80
                                                                ? 'bg-emerald-500'
                                                                : candidate.match_score >= 50
                                                                ? 'bg-blue-500'
                                                                : 'bg-amber-500'
                                                        }`}
                                                        style={{ width: `${candidate.match_score}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal: Tambah / Edit Keahlian */}
            <Dialog open={skillModalOpen} onOpenChange={setSkillModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-primary" />
                            <span>{editingSkill ? 'Edit Keahlian' : 'Tambah Keahlian Baru'}</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Daftarkan taksonomi kemampuan atau teknologi teknis pada organisasi.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveSkill} className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Nama Keahlian / Teknologi
                            </label>
                            <Input
                                placeholder="misal: React, Laravel, Kubernetes, Figma"
                                value={skillName}
                                onChange={(e) => setSkillName(e.target.value)}
                                className="h-9 text-xs"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Kategori
                            </label>
                            <Select value={skillCategory} onValueChange={setSkillCategory}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="frontend">Frontend & Web</SelectItem>
                                    <SelectItem value="backend">Backend & API</SelectItem>
                                    <SelectItem value="devops">Cloud & DevOps</SelectItem>
                                    <SelectItem value="design">UI/UX & Desain</SelectItem>
                                    <SelectItem value="qa">QA & Testing</SelectItem>
                                    <SelectItem value="data">Data & Database</SelectItem>
                                    <SelectItem value="product_management">Product & Scrum</SelectItem>
                                    <SelectItem value="other">Lainnya</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Deskripsi (Opsional)
                            </label>
                            <Input
                                placeholder="Cakupan kemampuan dan teknologi terkait..."
                                value={skillDescription}
                                onChange={(e) => setSkillDescription(e.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Warna Identitas
                            </label>
                            <div className="flex items-center gap-2 flex-wrap">
                                {[
                                    { hex: '#3b82f6', label: 'Biru' },
                                    { hex: '#10b981', label: 'Hijau' },
                                    { hex: '#8b5cf6', label: 'Ungu' },
                                    { hex: '#f59e0b', label: 'Amber' },
                                    { hex: '#ec4899', label: 'Pink' },
                                    { hex: '#06b6d4', label: 'Cyan' },
                                    { hex: '#64748b', label: 'Slate' },
                                ].map((c) => (
                                    <button
                                        key={c.hex}
                                        type="button"
                                        onClick={() => setSkillColor(c.hex)}
                                        className={`w-7 h-7 rounded-full border-2 transition-all ${
                                            skillColor === c.hex ? 'border-primary scale-110' : 'border-transparent'
                                        }`}
                                        style={{ backgroundColor: c.hex }}
                                        title={c.label}
                                    />
                                ))}
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setSkillModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={submittingSkill}
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                {submittingSkill ? 'Menyimpan...' : 'Simpan Keahlian'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Tetapkan Keahlian Anggota */}
            <Dialog open={memberSkillModalOpen} onOpenChange={setMemberSkillModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserCheck className="h-5 w-5 text-primary" />
                            <span>Tetapkan Keahlian ke Anggota</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Tambahkan profil keahlian dan tingkat kemahiran anggota tim.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveMemberSkill} className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Pilih Anggota Tim
                            </label>
                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {members.map((m) => (
                                        <SelectItem key={m.id} value={m.id.toString()}>
                                            {m.name} ({m.email})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Pilih Keahlian
                            </label>
                            <Select value={selectedSkillId} onValueChange={setSelectedSkillId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {skills.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.name} ({s.category})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Tingkat Kemahiran
                                </label>
                                <Select value={proficiencyLevel} onValueChange={(val: any) => setProficiencyLevel(val)}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="beginner">Pemula (Beginner ⭐)</SelectItem>
                                        <SelectItem value="intermediate">Menengah (⭐⭐)</SelectItem>
                                        <SelectItem value="advanced">Mahir (⭐⭐⭐)</SelectItem>
                                        <SelectItem value="expert">Pakar (Expert ⭐⭐⭐⭐)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Pengalaman (Tahun)
                                </label>
                                <Input
                                    type="number"
                                    min={0}
                                    step={0.5}
                                    value={yearsOfExp}
                                    onChange={(e) => setYearsOfExp(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                    required
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setMemberSkillModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={submittingMemberSkill}
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                {submittingMemberSkill ? 'Menyimpan...' : 'Simpan Profil'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
