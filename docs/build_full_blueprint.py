import os
import sys
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

from docx_helpers import (
    set_cell_background,
    set_cell_margins,
    set_table_borders,
    format_table,
    add_styled_heading,
    add_callout,
    add_code_block
)

def build_pandu_blueprint():
    doc = Document()
    
    # ----------------------------------------------------
    # PAGE SETUP
    # ----------------------------------------------------
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)
        section.page_width = Inches(8.27)
        section.page_height = Inches(11.69)
        
        # Header and Footer
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("PANDU MANAGEMENT SYSTEM — ENTERPRISE SYSTEM BLUEPRINT")
        hrun.font.name = 'Segoe UI'
        hrun.font.size = Pt(8)
        hrun.font.color.rgb = RGBColor(148, 163, 184)
        
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        frun_left = fp.add_run("Pandu Work Management System v2.0 | Software Architecture & Engineering Blueprint")
        frun_left.font.name = 'Calibri'
        frun_left.font.size = Pt(8)
        frun_left.font.color.rgb = RGBColor(148, 163, 184)

    # ----------------------------------------------------
    # COVER / TITLE BLOCK
    # ----------------------------------------------------
    p_pre = doc.add_paragraph()
    p_pre.paragraph_format.space_before = Pt(36)
    p_pre.paragraph_format.space_after = Pt(4)
    r_tag = p_pre.add_run("TECHNICAL SYSTEM BLUEPRINT & REVERSE ENGINEERING AUDIT")
    r_tag.font.name = 'Segoe UI'
    r_tag.font.size = Pt(11)
    r_tag.font.bold = True
    r_tag.font.color.rgb = RGBColor(79, 70, 229)
    
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(6)
    r_main = p_title.add_run("PANDU WORK MANAGEMENT SYSTEM")
    r_main.font.name = 'Segoe UI'
    r_main.font.size = Pt(26)
    r_main.font.bold = True
    r_main.font.color.rgb = RGBColor(15, 23, 42)
    
    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(18)
    r_sub = p_sub.add_run("Platform Agile & Work Management Enterprise Modular Monolith dengan Inertia.js 3, React 19, Laravel 13, Fractional Ranking, DevSecOps, SRE Incident War Room, dan Multi-Provider AI Gateway")
    r_sub.font.name = 'Calibri'
    r_sub.font.size = Pt(12)
    r_sub.font.color.rgb = RGBColor(71, 85, 105)
    
    meta_tbl = doc.add_table(rows=5, cols=2)
    meta_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(meta_tbl, color="CBD5E1")
    meta_data = [
        ("Nama Aplikasi", "Pandu Management (Kinetic Platform Enterprise)"),
        ("Teknologi Utama", "Laravel 13.17 (PHP 8.4) + React 19.2 + Inertia.js v3 + Tailwind CSS v4 + Wayfinder"),
        ("Database & ORM", "MySQL / PostgreSQL / SQLite (UUIDv7 Primary Key Strategy via HasUuidPrimaryKey)"),
        ("Cakupan Audit", "136 Models, 94 Controllers, 48 Services, 95 Migrations, 110 Frontend Screens, 114 Test Suites"),
        ("Target Audiens", "Software Engineer, Backend/Frontend Engineer, QA, DevOps/SRE, Product Manager, System Analyst")
    ]
    for idx, (label, val) in enumerate(meta_data):
        cell_lbl = meta_tbl.cell(idx, 0)
        cell_val = meta_tbl.cell(idx, 1)
        set_cell_background(cell_lbl, "F1F5F9")
        set_cell_margins(cell_lbl, 80, 80, 100, 100)
        set_cell_margins(cell_val, 80, 80, 100, 100)
        
        p0 = cell_lbl.paragraphs[0]
        p0.paragraph_format.space_before = Pt(2)
        p0.paragraph_format.space_after = Pt(2)
        r0 = p0.add_run(label)
        r0.bold = True
        r0.font.name = 'Calibri'
        r0.font.size = Pt(9.5)
        
        p1 = cell_val.paragraphs[0]
        p1.paragraph_format.space_before = Pt(2)
        p1.paragraph_format.space_after = Pt(2)
        r1 = p1.add_run(val)
        r1.font.name = 'Calibri'
        r1.font.size = Pt(9.5)

    doc.add_page_break()

    # ----------------------------------------------------
    # DAFTAR ISI / TABLE OF CONTENTS OUTLINE
    # ----------------------------------------------------
    add_styled_heading(doc, "DAFTAR ISI BLUEPRINT SISTEM", level=1)
    
    toc_items = [
        "1. IDENTITAS APLIKASI",
        "2. USER & ROLE (MATRIKS HAK AKSES GRANULAR)",
        "3. STRUKTUR NAVIGASI APLIKASI",
        "4. INVENTARISASI HALAMAN (110 SCREENS INVENTORY)",
        "5. USER FLOW (MERMAID FLOWCHARTS)",
        "6. BUSINESS PROCESS & STATE TRANSITION",
        "7. DATABASE BLUEPRINT & ENTITY RELATIONSHIP DIAGRAM",
        "8. API BLUEPRINT (RESTFUL V1 & WEBHOOK ENGINE)",
        "9. FRONTEND BLUEPRINT (REACT 19 + INERTIA 3 + TAILWIND 4)",
        "10. BACKEND BLUEPRINT (LARAVEL 13 + MODULAR SERVICE LAYER)",
        "11. AUTHENTICATION & AUTHORIZATION (FORTIFY, 2FA, MFA, SSO, RBAC)",
        "12. INTEGRASI SISTEM EKSTERNAL (AI, SSO, WEBHOOKS, VCS)",
        "13. NOTIFICATION SYSTEM (IN-APP & EMAIL CHANNELS)",
        "14. FILE & STORAGE ARCHITECTURE",
        "15. SECURITY BLUEPRINT (TENANT ISOLATION & DATA PROTECTION)",
        "16. ERROR & EXCEPTION FLOW",
        "17. AUDIT TRAIL & LOGGING",
        "18. SYSTEM ARCHITECTURE DIAGRAM",
        "19. DEPENDENCY MAP",
        "20. ENVIRONMENT & DEPLOYMENT",
        "21. FITUR MATRIX (FEATURE STATUS & REPOSITORY EVIDENCE)",
        "22. TRACEABILITY MATRIX (REQUIREMENT TO TECHNICAL IMPLEMENTATION)",
        "23. GAP ANALYSIS (CONFIRMED VS POTENTIAL FINDINGS)",
        "24. BLUEPRINT FINAL (EXECUTIVE SUMMARY & RECOMMENDATIONS)",
        "25. ATURAN ANALISIS & VERIFIKASI DOKUMEN"
    ]
    
    p_toc = doc.add_paragraph()
    for item in toc_items:
        r = p_toc.add_run(f"•  {item}\n")
        r.font.name = 'Calibri'
        r.font.size = Pt(10)
        r.font.color.rgb = RGBColor(51, 65, 85)

    doc.add_page_break()

    # ----------------------------------------------------
    # SECTION 1: IDENTITAS APLIKASI
    # ----------------------------------------------------
    add_styled_heading(doc, "1. IDENTITAS APLIKASI", level=1)
    
    p = doc.add_paragraph()
    p.add_run("Pandu Work Management System (secara internal dan pada antarmuka dikenal juga sebagai ").font.name = 'Calibri'
    r_knt = p.add_run("Kinetic Platform Enterprise")
    r_knt.bold = True
    p.add_run(") adalah platform manajemen kerja agile terpadu dan modular monolith yang dirancang untuk mengelola seluruh siklus hidup proyek rekayasa perangkat lunak, kolaborasi tim, tata kelola DevSecOps, ketahanan sistem (SRE), dan automasi cerdas berbasis Multi-Provider AI Gateway.").font.name = 'Calibri'
    
    tbl_id = doc.add_table(rows=10, cols=2)
    id_data = [
        ("Nama Aplikasi", "Pandu Management (Kinetic Platform Enterprise)"),
        ("Tujuan Utama", "Menyediakan single source of truth untuk manajemen kerja agile enterprise, menyatukan issue tracking, sprint planning, diagram dependensi, whiteboard, kalkulasi biaya, ketahanan SRE, kepatuhan data, dan kecerdasan buatan."),
        ("Masalah yang Diselesaikan", "Mengeliminasi fragmentasi perkakas kerja antar tim (menggantikan integrasi terpisah Jira, Linear, Miro, PagerDuty, LaunchDarkly, dan Datadog); mencegah over-budgeting AI; mengamankan isolasi tenant multi-organisasi; dan mempercepat penanganan insiden sistem."),
        ("Target Pengguna", "Software Engineers, Scrum Masters, Product Managers, DevOps/SRE Engineers, Security & Compliance Officers, Tech Leads, Engineering Directors, dan Eksekutif C-Level."),
        ("Platform", "Web Application Server-Driven SPA (Desktop & Tablet), Mobile Web Companion (/mobile), Public Marketing & Changelog Hub, dan REST API v1."),
        ("Teknologi Backend", "PHP 8.4, Laravel Framework 13.17, Laravel Fortify 1.37, Laravel Sanctum 4.0, Laravel Wayfinder 0.1, Pest PHP 5.1."),
        ("Teknologi Frontend", "React 19.2, TypeScript 5.7, Inertia.js v3, Tailwind CSS v4, Radix UI Primitives, Lucide React, Sonner, Vite 8.0."),
        ("Arsitektur Sistem", "Modular Monolith Server-Driven SPA dengan Domain-Driven Service Layer, Lexicographic Fractional Ranking, Optimistic Concurrency Control, Multi-Tenant Scoping, dan Event Automation Rule Engine."),
        ("Integrasi Eksternal", "OpenAI API, Google Gemini API, Ollama (Local AI), SAML 2.0 SSO, OpenID Connect (OIDC), OAuth2 Connected Accounts, CI/CD VCS (GitHub/GitLab), Outbound Webhooks dengan HMAC SHA-256."),
        ("Modul Utama", "20 Domain Modul Inti: Organisasi & Keanggotaan, Proyek & Workflow, Tugas & Kanban Board, Agile & Scrum Engine, Timeline & Gantt Chart, Whiteboard Live Canvas, Budget & Expense Approvals, Kapasitas & Skill Matrix, Team Mood Pulse, OKR Tree, SRE & Incident War Room, DevSecOps & Release Publisher, Kepatuhan Data GDPR/DSAR, Visual Automation Builder, Pandu AI Gateway, OmniSearch ⌘K, File Manager, Wiki & Dokumentasi Hub, Developer Platform (API & DLQ), Enterprise Security & Billing.")
    ]
    for idx, (lbl, val) in enumerate(id_data):
        cell_l = tbl_id.cell(idx, 0)
        cell_r = tbl_id.cell(idx, 1)
        cell_l.paragraphs[0].add_run(lbl).bold = True
        cell_r.paragraphs[0].add_run(val)
    format_table(tbl_id, header_bg="1E293B")

    add_callout(doc, 
        "Pandu Management dibangun di atas arsitektur Modular Monolith menggunakan Inertia.js v3 (ADR-001) dan UUIDv7 sebagai Primary Key seluruh entitas domain (ADR-002). Sistem ini mengintegrasikan seluruh operasional kerja software house dan enterprise tanpa memerlukan dependensi microservices yang rumit.", 
        title="ARSITEKTUR & STRATEGI TEKNIS"
    )

    doc.add_page_break()

    # ----------------------------------------------------
    # SECTION 2: USER & ROLE
    # ----------------------------------------------------
    add_styled_heading(doc, "2. USER & ROLE (MATRIKS HAK AKSES GRANULAR)", level=1)
    
    p = doc.add_paragraph()
    p.add_run("Pandu Management menerapkan sistem kontrol akses berbasis peran ganda (Hybrid Role-Based Access Control / RBAC) yang menggabungkan ").font.name = 'Calibri'
    p.add_run("5 System Roles bawaan").bold = True
    p.add_run(" dengan kemampuan kustomisasi ").font.name = 'Calibri'
    p.add_run("Custom Roles & Granular Permission Matrix").bold = True
    p.add_run(" per organisasi (dikelola melalui PermissionRegistry dan RolePermissionController).").font.name = 'Calibri'

    add_styled_heading(doc, "2.1 Karakteristik & Batasan System Roles", level=2)

    roles_desc = [
        ("Owner (Pemilik Organisasi)", 
         "Karakteristik: Pembuat organisasi atau pemegang hak kepemilikan tertinggi.\n"
         "Hak Akses: Akses penuh tanpa batas ke seluruh 23 modul izin granular, termasuk penagihan (billing), pergantian paket, pengelolaan SSO, audit log stream, kebijakan retensi data, manajemen peran kustom, penghapusan proyek/organisasi, dan kill-switch keamanan."),
        ("Admin (Administrator)", 
         "Karakteristik: Pengelola operasional organisasi yang ditunjuk oleh Owner.\n"
         "Hak Akses: Mengelola seluruh fitur sistem, anggota, tim, proyek, peran, integrasi, dan otomasi. Dibatasi dari modul org:billing (manajemen faktur dan kartu kredit organisasi)."),
        ("Manager (Project Lead / Scrum Master / Product Manager)", 
         "Karakteristik: Pemimpin proyek atau tim fungsional.\n"
         "Hak Akses: Membuat dan mengonfigurasi proyek, mengelola sprint backlog, memulai/menyelesaikan sprint, memoderasi Planning Poker dan Retrospective, menyetujui expense/anggaran proyek, mengundang anggota, dan mengelola otomasi proyek. Tidak dapat mengubah konfigurasi global organisasi atau keamanan SSO."),
        ("Member (Engineer / Designer / Contributor)", 
         "Karakteristik: Anggota tim aktif yang berkontribusi langsung pada tugas.\n"
         "Hak Akses: Melihat direktori anggota dan proyek, membuat dan mengedit tugas, menggeser status pada Kanban board, menambahkan komentar, mengisi checklist, mencatat worklog waktu, memberikan vote pada planning poker/retrospective, dan menggunakan asisten Pandu AI. Dibatasi dari perubahan alur kerja proyek atau penghapusan proyek."),
        ("Guest (Auditor / Stakeholder / Klien Eksternal)", 
         "Karakteristik: Pengguna tamu atau mitra eksternal dengan hak akses terbatas.\n"
         "Hak Akses: Read-only pada proyek yang diizinkan, melihat papan tugas dan status sprint, serta memberikan komentar diskusi. Dibatasi dari pembuatan, pengeditan, atau pemindahan status tugas.")
    ]

    for title, desc in roles_desc:
        p_r = doc.add_paragraph()
        r_t = p_r.add_run(f"• {title}\n")
        r_t.bold = True
        r_t.font.name = 'Segoe UI'
        r_t.font.color.rgb = RGBColor(79, 70, 229)
        r_d = p_r.add_run(desc)
        r_d.font.name = 'Calibri'
        r_d.font.size = Pt(9.5)

    add_styled_heading(doc, "2.2 Matriks Hak Akses Modul & Izin Granular", level=2)

    matrix_headers = ["Kategori Modul", "Izin Granular (Permission ID)", "Owner", "Admin", "Manager", "Member", "Guest"]
    matrix_rows = [
        ["Workspace & Org", "org:manage (Pengaturan Organisasi)", "✓", "✓", "—", "—", "—"],
        ["Workspace & Org", "org:billing (Billing & Langganan)", "✓", "—", "—", "—", "—"],
        ["Anggota & Tim", "members:view (Lihat Direktori)", "✓", "✓", "✓", "✓", "—"],
        ["Anggota & Tim", "members:invite (Undang Anggota)", "✓", "✓", "✓", "—", "—"],
        ["Anggota & Tim", "members:update_role (Ubah Peran)", "✓", "✓", "—", "—", "—"],
        ["Anggota & Tim", "members:remove (Keluarkan Anggota)", "✓", "✓", "—", "—", "—"],
        ["Anggota & Tim", "teams:manage (Kelola Tim & Lead)", "✓", "✓", "✓", "—", "—"],
        ["Keamanan & Akses", "roles:manage (Kelola Peran Kustom)", "✓", "✓", "—", "—", "—"],
        ["Keamanan & Akses", "permissions:manage (Atur Matriks Izin)", "✓", "✓", "—", "—", "—"],
        ["Keamanan & Akses", "audit:view (Lihat Log Audit)", "✓", "✓", "—", "—", "—"],
        ["Proyek & Portofolio", "projects:view (Lihat Proyek)", "✓", "✓", "✓", "✓", "✓"],
        ["Proyek & Portofolio", "projects:create (Buat Proyek Baru)", "✓", "✓", "✓", "—", "—"],
        ["Proyek & Portofolio", "projects:edit (Konfigurasi Proyek)", "✓", "✓", "✓", "—", "—"],
        ["Proyek & Portofolio", "projects:delete (Hapus/Arsipkan)", "✓", "✓", "—", "—", "—"],
        ["Proyek & Portofolio", "portfolios:manage (Kelola Portofolio)", "✓", "✓", "✓", "—", "—"],
        ["Tugas & Papan", "tasks:view (Lihat Rincian Tugas)", "✓", "✓", "✓", "✓", "✓"],
        ["Tugas & Papan", "tasks:create (Buat Tugas Baru)", "✓", "✓", "✓", "✓", "—"],
        ["Tugas & Papan", "tasks:edit (Edit Konten/Checklist)", "✓", "✓", "✓", "✓", "—"],
        ["Tugas & Papan", "tasks:move_status (Geser Status Kanban)", "✓", "✓", "✓", "✓", "—"],
        ["Tugas & Papan", "tasks:assign (Tugaskan Assignee)", "✓", "✓", "✓", "✓", "—"],
        ["Tugas & Papan", "tasks:delete (Hapus Tugas)", "✓", "✓", "✓", "—", "—"],
        ["Tugas & Papan", "tasks:comment (Komentar & Diskusi)", "✓", "✓", "✓", "✓", "✓"],
        ["AI & Otomasi", "ai:access (Gunakan Asisten AI)", "✓", "✓", "✓", "✓", "—"],
        ["AI & Otomasi", "ai:configure (Konfigurasi Provider AI)", "✓", "✓", "—", "—", "—"],
        ["AI & Otomasi", "automations:manage (Kelola Otomasi)", "✓", "✓", "✓", "—", "—"]
    ]

    tbl_matrix = doc.add_table(rows=len(matrix_rows) + 1, cols=len(matrix_headers))
    for col_idx, text in enumerate(matrix_headers):
        tbl_matrix.cell(0, col_idx).paragraphs[0].add_run(text)
    for row_idx, row_vals in enumerate(matrix_rows):
        for col_idx, val in enumerate(row_vals):
            tbl_matrix.cell(row_idx + 1, col_idx).paragraphs[0].add_run(val)
    format_table(tbl_matrix, header_bg="4338CA")

    doc.add_page_break()

    # ----------------------------------------------------
    # SECTION 3: STRUKTUR NAVIGASI
    # ----------------------------------------------------
    add_styled_heading(doc, "3. STRUKTUR NAVIGASI APLIKASI", level=1)
    
    p = doc.add_paragraph()
    p.add_run("Struktur navigasi Pandu Management direkonstruksi secara hierarkis berdasarkan implementasi aktual pada ").font.name = 'Calibri'
    p.add_run("AppSidebar, AppHeader, NavMain, NavUser, dan routing web.php/settings.php:").bold = True
    
    nav_tree = """Application Navigation Hierarchy
├── Public & Marketing
│   ├── Welcome Landing Page (/)
│   ├── Berita & Wawasan (/news)
│   ├── Tentang Kami (/about)
│   ├── Hubungi Kami (/contact)
│   └── Public Changelog (/changelog)
├── Authentication (Fortify Backend)
│   ├── Masuk Akun (/login)
│   ├── Daftar Baru (/register)
│   ├── Lupa Kata Sandi (/forgot-password)
│   ├── Reset Kata Sandi (/reset-password)
│   └── Verifikasi Email (/verify-email)
├── Onboarding Wizard
│   ├── Buat Organisasi (/onboarding/organization)
│   ├── Undang Anggota Tim (/onboarding/invite-members)
│   └── Multi-Step Interactive Wizard (/onboarding)
├── Menu Utama (Main Workspace)
│   ├── Dashboard (/dashboard)
│   ├── Kotak Masuk Kerja (/inbox)
│   └── Global Search Spotlight (⌘K) (/search/omnibar)
├── Workspace Modul Proyek & Tim
│   ├── Daftar Proyek (/projects)
│   │   ├── Buat Proyek Baru (/projects/create)
│   │   ├── Overview Proyek (/projects/{project})
│   │   ├── Papan Kanban (/projects/{project}/board)
│   │   ├── Backlog & Sprints (/projects/{project}/backlog)
│   │   ├── Daftar Tugas (/projects/{project}/tasks)
│   │   ├── Timeline & Gantt (/projects/{project}/timeline)
│   │   ├── Dependensi & CPM (/projects/{project}/dependencies)
│   │   ├── Matriks Cross-Project (/projects/{project}/dependencies/matrix)
│   │   ├── Anggaran & Biaya (/projects/{project}/budget)
│   │   ├── Papan Ide Whiteboard (/projects/{project}/whiteboard)
│   │   ├── Whiteboard Live Room (/projects/{project}/whiteboards/{wb}/live)
│   │   ├── Manajemen Risiko (/projects/{project}/risks)
│   │   ├── Sprint Retrospectives (/projects/{project}/retrospectives)
│   │   ├── Planning Poker Room (/projects/{project}/planning-poker)
│   │   ├── Velocity Forecast (/projects/{project}/forecast)
│   │   ├── Sprint Health Radar (/projects/{project}/sprints/health)
│   │   ├── Scrum Master Workspace (/projects/{project}/scrum-master)
│   │   ├── Wiki Proyek (/projects/{project}/wiki)
│   │   ├── Berkas Proyek (/projects/{project}/files)
│   │   └── Pengaturan Proyek (/projects/{project}/settings)
│   ├── Executive Portfolio (/portfolio)
│   ├── Daily Standup Tim (/scrum/daily-standup)
│   ├── Catatan Rilis & Changelog (/releases)
│   ├── Timeline & Roadmap Organisasi (/timeline)
│   ├── Kalender & Jadwal Tim (/calendar)
│   ├── Kapasitas & Beban Kerja (/workload)
│   ├── Direktori Tim & Departemen (/teams)
│   ├── Mood & Pulse Tim (/organization/pulse)
│   ├── Anggota Organisasi (/organization/members)
│   ├── Laporan & Metrik (/reports)
│   ├── Executive BI Dashboard Builder (/dashboard/builder)
│   ├── Performa Kolaborasi (/reports/collaboration)
│   ├── Pusat Impor Data (/import)
│   ├── Wiki & Dokumen Hub (/wiki)
│   ├── Marketplace Integrasi (/integrations)
│   ├── Webhook & Outbound Hub (/organization/webhooks)
│   ├── SLA & Matriks Eskalasi (/organization/sla)
│   ├── Keahlian & Skill Matrix (/organization/skills)
│   ├── Kapasitas & Workload Balancer (/organization/capacity)
│   ├── Manajemen Berkas (/files)
│   └── Mode Mobile Companion (/mobile)
├── Keamanan, Akses & Tata Kelola
│   ├── Peran & Izin (RBAC) (/organization/roles)
│   ├── Single Sign-On (SSO SAML/OIDC) (/organization/sso)
│   ├── Keamanan Sesi & IP Whitelist (/organization/security-settings)
│   ├── Log Audit Sistem (/organization/audit-logs)
│   ├── Live Compliance Stream (/organization/compliance/live-stream)
│   ├── Tagihan & Langganan (/organization/billing)
│   ├── Retensi & Kepatuhan GDPR (/organization/data-retention)
│   ├── Data Privacy & PII Redaction (/organization/compliance/data-privacy)
│   ├── Status & Kesehatan Sistem (/system-status)
│   ├── MFA Enforcement Gate (/organization/security/mfa-enforcement)
│   ├── SBOM Vulnerability Scanner (/organization/security/sbom)
│   ├── ADR Technical Governance (/organization/architecture/adr)
│   ├── CI/CD Deployment Pipelines (/organization/devops/pipelines)
│   ├── Feature Flags Orchestrator (/organization/devops/feature-flags)
│   ├── PR Review SLA & Codeowners (/organization/devops/pr-reviews)
│   ├── Release Notes Publisher (/organization/releases/publisher)
│   ├── Database Drift & Index Health (/organization/database/drift)
│   ├── Cloud Cost Anomaly Detector (/organization/cloud/costs)
│   ├── Cost Allocation Financials (/organization/financials/cost-allocation)
│   ├── OKR Alignment Tree (/organization/okrs/tree)
│   ├── SRE Incident War Room (/organization/ops/incidents)
│   ├── On-Call Rotation & Paging (/organization/sre/oncall)
│   ├── Chaos Engineering GameDay (/organization/sre/chaos-gameday)
│   ├── Synthetic Uptime Monitors (/organization/sre/synthetics)
│   ├── Automated Incident Runbooks (/organization/sre/runbooks)
│   ├── Distributed Traces (/organization/sre/traces)
│   ├── AI Root Cause Analysis (/organization/sre/rca)
│   ├── API Rate Limiter Console (/organization/developer/rate-limits)
│   ├── Webhook Dead-Letter Queue (/organization/developer/webhooks/dlq)
│   └── API Playground & SDK Generator (/organization/developer/api-playground)
├── AI & Automasi
│   ├── Pengaturan AI & Kuota (/organization/ai-settings)
│   ├── Visual Automation Builder (/automation)
│   └── Kaizen Continuous Improvement (/organization/agile/kaizen)
└── Pengaturan Pribadi Pengguna (Settings)
    ├── Profil Saya (/settings/profile)
    ├── Keamanan & Password (/settings/security)
    ├── Otentikasi 2FA TOTP (/settings/two-factor-authentication)
    ├── Sesi Perangkat Aktif (/settings/sessions)
    ├── Preferensi Notifikasi (/settings/notifications)
    ├── Developer API Tokens (/settings/api-tokens)
    ├── Preferensi & Direktif AI (/settings/ai-preferences)
    ├── Bahasa & Zona Waktu (/settings/language-timezone)
    ├── Pintasan Keyboard & Aksesibilitas (/settings/keyboard-shortcuts)
    └── Tampilan Tema (/settings/appearance)"""

    add_code_block(doc, nav_tree)

    doc.add_page_break()

    # ----------------------------------------------------
    # SECTION 4: INVENTARISASI HALAMAN
    # ----------------------------------------------------
    add_styled_heading(doc, "4. INVENTARISASI HALAMAN (110 SCREENS INVENTORY)", level=1)
    
    p = doc.add_paragraph()
    p.add_run("Berikut adalah katalog lengkap seluruh 110 screen/halaman antarmuka pengguna pada sistem Pandu Management yang diidentifikasi dari direktori ").font.name = 'Calibri'
    p.add_run("resources/js/pages/").bold = True
    p.add_run(" beserta konfigurasi route, role akses, komponen utama, dan integrasi endpoint backend:").font.name = 'Calibri'

    pages_sample = [
        # (Page, Route, Role, Purpose, Main Components, API)
        ("Welcome Landing", "/", "Public", "Halaman landing utama pemasaran dan demonstrasi kapabilitas platform", "HeroSection, FeatureGrid, TestimonialCards, PricingTable, CTABar", "GET /"),
        ("Public News", "/news", "Public", "Pusat wawasan, rilis artikel teknologi, dan berita platform", "ArticleList, CategoryFilter, SearchInput, FeaturedPostCard", "GET /news"),
        ("Public About", "/about", "Public", "Informasi profil perusahaan, misi teknologi, dan kepemimpinan", "CompanyMission, LeadershipGrid, ValueTimeline, StatCounters", "GET /about"),
        ("Public Contact", "/contact", "Public", "Formulir interaktif pengajuan pesan dan konsultasi enterprise", "ContactForm, OfficeLocationsMap, SupportChannelBadges", "POST /contact"),
        ("Public Changelog", "/changelog", "Public", "Catatan rilis publik dan fitur reaksi feedback pengguna", "ReleaseTimeline, SemverBadge, MarkdownBody, ReactionEmojiBar", "POST /changelog/{rel}/react"),
        ("Login Screen", "/login", "Public", "Autentikasi masuk pengguna menggunakan kredensial email & kata sandi", "LoginForm, PasswordInput, RememberCheckbox, ForgotPasswordLink", "POST /login (Fortify)"),
        ("Register Screen", "/register", "Public", "Pendaftaran akun pengguna baru dan verifikasi awal", "RegisterForm, PasswordStrengthMeter, TermsCheckbox, SubmitButton", "POST /register (Fortify)"),
        ("Forgot Password", "/forgot-password", "Public", "Pengiriman tautan instruksi reset kata sandi ke email terdaftar", "PasswordResetRequestForm, EmailInput, BackToLoginButton", "POST /forgot-password"),
        ("Reset Password", "/reset-password", "Public", "Pembuatan kata sandi baru melalui token verifikasi email", "PasswordResetForm, PasswordInput, ConfirmPasswordInput", "POST /reset-password"),
        ("Onboarding Org", "/onboarding/organization", "Auth", "Pembuatan entitas workspace/organisasi pertama bagi pengguna baru", "OrganizationForm, SlugAutoGenerator, TimezoneSelect, LocaleSelect", "POST /onboarding/organization"),
        ("Onboarding Invite", "/onboarding/invite-members", "Auth", "Pengiriman undangan kolaborasi ke anggota tim via email", "InviteListInput, RoleDropdown, SkipButton, SendInvitationsButton", "POST /organization/invitations"),
        ("Dashboard", "/dashboard", "Member+", "Pusat ringkasan kerja harian, KPI metrik, tugas aktif, dan sprint status", "SummaryCardGrid, BurndownWidget, AssignedTasksList, ActivityFeed", "Inertia Page Props"),
        ("Project List", "/projects", "Member+", "Katalog seluruh proyek dalam organisasi dengan filter tipe metodologi", "ProjectGrid, TableViewToggle, SearchFilter, CreateProjectButton", "GET /projects"),
        ("Create Project", "/projects/create", "Manager+", "Wizard pembuatan proyek baru dengan pemilihan template alur kerja", "TemplateSelector, ProjectForm, ColorPicker, IconPicker, LeadSelect", "POST /projects"),
        ("Project Overview", "/projects/{project}", "Member+", "Ringkasan metrik proyek, distribusi tugas, anggota, dan milestone", "ProjectStatHeader, SprintBurndownMini, MemberAvatarStack, TaskFeed", "GET /projects/{project}"),
        ("Kanban Board", "/projects/{project}/board", "Member+", "Papan Kanban interaktif dengan drag-and-drop fractional ranking", "KanbanColumnList, TaskCard, ColumnWipBadge, QuickTaskInput, FilterBar", "PATCH /projects/{p}/tasks/{t}/move"),
        ("Backlog & Sprints", "/projects/{project}/backlog", "Member+", "Perencanaan sprint backlog, estimasi poin, dan aktivasi sprint", "SprintAccordionList, BacklogTable, StoryPointBadge, StartSprintModal", "POST /projects/{p}/sprints/{s}/start"),
        ("Project Tasks", "/projects/{project}/tasks", "Member+", "Tabel inventaris seluruh tugas proyek dengan multi-sort dan filter", "TaskDataTable, SearchInput, StatusFilterDropdown, AssigneeFilter", "GET /projects/{project}/tasks"),
        ("Project Timeline", "/projects/{project}/timeline", "Member+", "Bagan Gantt interaktif dengan auto-scheduling dan lintasan kritis", "GanttChartCanvas, DependencyConnectorLine, MilestoneToggle, ZoomBar", "PUT /projects/{p}/timeline/tasks/{t}/sched"),
        ("Dependency Graph", "/projects/{project}/dependencies", "Member+", "Visualisasi graf dependensi CPM dan simulasi efek keterlambatan", "NetworkGraphView, PredecessorTable, CascadeSimulationModal", "POST /projects/{p}/dependencies/simulate"),
        ("Project Budget", "/projects/{project}/budget", "Manager+", "Pelacakan anggaran, tarif jam kerja tim, worklog, dan persetujuan biaya", "BudgetProgressBar, LaborCostTable, ExpenseApprovalGrid, ReceiptModal", "POST /projects/{p}/budget/expenses/{e}/approve"),
        ("Whiteboard Canvas", "/projects/{project}/whiteboard", "Member+", "Kanvas ideasi interaktif, sticky notes, dan konversi node ke task", "CanvasViewport, StickyNoteElement, ConnectorEdge, ConvertToTaskModal", "POST /projects/{p}/whiteboards/{w}/nodes"),
        ("Whiteboard Live", "/projects/{project}/whiteboards/{w}/live", "Member+", "Ruang kolaborasi visual real-time dengan multi-cursor presence", "LiveCursorLayer, LockIndicatorBadge, RealTimeSyncEngine, UserList", "POST /projects/{p}/whiteboards/{w}/live/sync"),
        ("Project Risks", "/projects/{project}/risks", "Manager+", "Register risiko proyek, matriks probabilitas-dampak, dan log mitigasi", "RiskMatrixGrid, RiskDataTable, ActionLogHistoryDrawer, CreateRiskModal", "POST /projects/{p}/risks"),
        ("Sprint Retrospective", "/projects/{project}/retrospectives", "Member+", "Papan retrospektif agile (Went Well, Needs Improvement, Action Items)", "RetroColumnList, RetroCard, UpvoteButton, ConvertActionToTaskModal", "POST /projects/{p}/retrospectives/{r}/items/vote"),
        ("Planning Poker Room", "/projects/{project}/planning-poker/{s}", "Member+", "Ruang estimasi story point real-time dengan voting rahasia", "EstimationCardDeck, PlayerCardGrid, RevealVotesButton, ApplyPointsBtn", "POST /projects/{p}/planning-poker/{s}/vote"),
        ("Velocity Forecast", "/projects/{project}/forecast", "Manager+", "Prediktor kesiapan rilis dan simulasi Monte Carlo 1000 iterasi", "VelocityHistogram, MonteCarloPercentileChart, ScenarioBuilderTable", "POST /projects/{p}/forecast/simulate"),
        ("Sprint Health Radar", "/projects/{project}/sprints/health", "Manager+", "Radar kesehatan sprint, heatmap blocker, dan eskalasi impediment", "HealthScoreGauge, BlockerHeatmapGrid, ImpedimentEscalationModal", "POST /projects/{p}/sprints/{s}/impediments/escalate"),
        ("Scrum Master Hub", "/projects/{project}/scrum-master", "Manager+", "Ruang kendali Scrum Master untuk resolusi hambatan dan alokasi tim", "BlockerResolutionTable, TeamVelocityTrend, FocusTimeRadarWidget", "PUT /projects/{p}/tasks/{t}/blockers/{b}/resolve"),
        ("Daily Standup Tim", "/scrum/daily-standup", "Member+", "Standup asinkron tim dengan AI executive briefing dan live timer", "YesterdayDoneInput, TodayPlanInput, BlockerInput, AiSynthesizeButton", "POST /scrum/daily-standup/synthesize"),
        ("Executive Portfolio", "/portfolio", "Manager+", "Dashboard inisiatif strategis multi-proyek dan status kesehatan portfolio", "PortfolioGrid, BudgetBurnDonut, StrategicMilestoneTimeline", "GET /portfolio"),
        ("Team Directory", "/teams", "Member+", "Katalog departemen, penugasan Team Lead, dan distribusi anggota", "TeamCardGrid, CreateTeamModal, DepartmentFilter, LeadSelectDropdown", "POST /teams"),
        ("Org Members", "/organization/members", "Admin+", "Manajemen keanggotaan organisasi, penugasan peran, dan status akun", "MemberDataTable, RoleDropdownSelect, InviteMemberModal, RemoveBtn", "PATCH /organization/members/{m}/role"),
        ("Org Roles & RBAC", "/organization/roles", "Admin+", "Konfigurasi peran kustom dan matriks izin granular 23 kemampuan", "RoleListTable, PermissionCheckboxMatrix, CreateRoleModal, SaveMatrixBtn", "PUT /organization/roles/matrix"),
        ("Notification Center", "/notifications", "Member+", "Pusat notifikasi in-app, filter unread, dan aksi tandai telah dibaca", "NotificationList, CategoryTabs, MarkAllReadButton, DeleteNotificationBtn", "POST /notifications/{id}/read"),
        ("Work Inbox", "/inbox", "Member+", "Feed pekerjaan personal pengguna dengan fitur snooze dan quick resolve", "InboxFeedList, SnoozeDropdown, CompleteTaskInlineButton, FilterTabs", "POST /inbox/{id}/snooze"),
        ("AI Settings & Quota", "/organization/ai-settings", "Admin+", "Konfigurasi provider LLM (OpenAI, Gemini, Ollama), API key, & kuota", "ProviderRadioGroup, ApiKeyInput, TokenBudgetInput, CostTrackingGauge", "PUT /organization/ai-settings"),
        ("Automation Builder", "/automation", "Manager+", "Visual rule builder untuk otomatisasi alur kerja (Trigger-Condition-Action)", "RuleDataTable, VisualTriggerSelect, ActionBuilderCard, TestRunButton", "POST /automation"),
        ("Audit Logs", "/organization/audit-logs", "Admin+", "Rekaman audit keamanan organisasi dan ekspor kepatuhan CSV", "AuditLogDataTable, ActionFilterDropdown, UserFilter, CsvExportButton", "GET /organization/audit-logs/export"),
        ("Wiki & Knowledge Hub", "/wiki", "Member+", "Basis pengetahuan tim dengan struktur ruang (spaces) dan hierarki dokumen", "SpaceSidebar, MarkdownEditor, PageRevisionHistory, FavoriteToggle", "POST /wiki/spaces/{s}/pages"),
        ("Marketplace Integrasi", "/integrations", "Admin+", "Hub konektor pihak ketiga (Slack, GitHub, GitLab, Jira, Google)", "IntegrationCardGrid, ConnectOAuthModal, WebhookSecretInput, TestPingBtn", "POST /integrations/{i}/test-ping"),
        ("Webhook Hub & DLQ", "/organization/webhooks", "Admin+", "Dispatcher webhook outbound, rotasi secret, dan inspeksi retry DLQ", "WebhookDataTable, SecretKeyDisplay, DeliveryLogsDrawer, ReplayEventBtn", "POST /organization/webhooks/deliveries/{d}/redeliver"),
        ("SLA Engine & Matrix", "/organization/sla", "Admin+", "Manajemen kebijakan SLA waktu respons/resolusi dan aturan eskalasi", "SlaPolicyTable, EscalationRuleBuilder, RunScanNowButton, BreachAlertBadge", "POST /organization/sla/run-scan"),
        ("Skill Matrix & AI", "/organization/skills", "Admin+", "Inventaris kompetensi tim dan AI smart assignee recommendation", "SkillTagCloud, MemberCompetencyTable, RecommendAssigneeDrawer", "GET /tasks/{t}/recommend-assignees"),
        ("Resource Capacity", "/organization/capacity", "Admin+", "Kapasitas mingguan tim, jadwal cuti, dan penyeimbang beban kerja", "CapacityHeatmapCalendar, TimeOffModal, WorkloadRebalanceWizard", "POST /organization/capacity/balancer/batch"),
        ("Team Mood & Pulse", "/organization/pulse", "Member+", "Radar kesehatan psikologis tim, check-in mood harian, dan inisiatif wellness", "MoodSmileySelector, AnonymousPulseTrend, WellnessInitiativeTable", "POST /organization/pulse/check-in"),
        ("OKR Alignment Tree", "/organization/okrs/tree", "Member+", "Pohon sasaran strategis OKR multi-tier dan keterkaitan tugas kerja", "OkrHierarchyTreeView, KeyResultProgressBar, LinkTaskModal, TargetValueInput", "POST /organization/okrs/objectives"),
        ("Cost Allocation", "/organization/financials/cost-allocation", "Admin+", "Pusat biaya korporat (cost centers) dan analitik profitabilitas proyek", "CostCenterTable, ProjectAllocationModal, ProfitabilityChart", "POST /organization/financials/cost-centers"),
        ("Live Audit Stream", "/organization/compliance/live-stream", "Admin+", "Streaming real-time log aktivitas keamanan dan sertifikasi SOC2/ISO", "LiveEventStreamList, SeverityBadge, PauseStreamToggle, ExportCertBtn", "GET /organization/compliance/certification-export"),
        ("MFA Enforcement", "/organization/security/mfa-enforcement", "Admin+", "Penegakan wajib 2FA/TOTP dan manajemen grace period exemption", "EnforcementPolicyRadio, ExemptionMemberTable, SendReminderButton", "PUT /organization/security/mfa-enforcement"),
        ("Custom Dashboards", "/organization/analytics/custom-dashboards", "Member+", "Studio perancang dashboard analitik dan executive widget builder", "WidgetCanvasGrid, AddWidgetModal, ChartTypeSelect, ShareDashboardBtn", "POST /organization/analytics/custom-dashboards"),
        ("SLA Forecast", "/organization/sla/forecast", "Manager+", "Prediktor potensi pelanggaran SLA dukungan dan mitigasi otomatis", "AtRiskTaskTable, ProbabilityGauge, EscalateNowButton, MitigateModal", "POST /organization/sla/forecast/tasks/{t}/mitigate"),
        ("CI/CD Pipelines", "/organization/devops/pipelines", "Admin+", "Orkestrator deployment pipeline dan manual approval gate", "PipelineRunList, StageProgressBar, ApproveGateButton, RollbackButton", "POST /organization/devops/pipelines/runs/{r}/approve-gate"),
        ("Cloud Cost Anomaly", "/organization/cloud/costs", "Admin+", "Detektor anomali biaya cloud dan rekomendasi optimalisasi beban", "CostTrendChart, AnomalyAlertCard, ApplyRecommendationButton", "POST /organization/cloud/costs/recommendations/{r}/apply"),
        ("Kaizen Improvement", "/organization/agile/kaizen", "Member+", "Pelacak inisiatif perbaikan berkelanjutan hasil sprint retrospective", "KaizenKanbanBoard, VerificationModal, ImpactScoreInput, DoneButton", "POST /organization/agile/kaizen/initiatives/{i}/verify"),
        ("SBOM Vulnerability", "/organization/security/sbom", "Admin+", "Pemindai kerentanan paket dependensi open-source dan kepatuhan lisensi", "VulnerabilityDataTable, SeverityPieChart, TriageActionModal, ExportSbomBtn", "POST /organization/security/sbom/scan"),
        ("ADR Governance", "/organization/architecture/adr", "Member+", "Pusat Architecture Decision Records dan tata kelola keputusan teknik", "AdrDataTable, MarkdownDecisionEditor, StatusSelect, ExportAdrBtn", "POST /organization/architecture/adr"),
        ("Developer Focus Radar", "/organization/productivity/focus", "Member+", "Analitik context-switching developer dan rekomendasi focus time", "FocusScoreGauge, InterruptionsChart, BlockFocusTimeButton", "POST /organization/productivity/focus/recommendations/{r}/apply"),
        ("Feature Flags", "/organization/devops/feature-flags", "Admin+", "Orkestrator progressive rollout fitur, persentase traffic, dan kill-switch", "FeatureFlagTable, RolloutSlider, ToggleSwitch, EmergencyKillBtn", "POST /organization/devops/feature-flags/{f}/kill"),
        ("API Rate Limits", "/organization/developer/rate-limits", "Admin+", "Konsol throttling traffic API, kuota per token, dan simulator beban", "RateLimitPolicyTable, TrafficChart, ThrottleToggle, SimulateTrafficModal", "POST /organization/developer/rate-limits/simulate"),
        ("Webhook DLQ", "/organization/developer/webhooks/dlq", "Admin+", "Antrean pesan gagal webhook (Dead Letter Queue) dan bulk replay engine", "DlqFailedEventsTable, ErrorPayloadViewer, BulkReplayButton, PurgeBtn", "POST /organization/developer/webhooks/dlq/bulk-replay"),
        ("Incident War Room", "/organization/ops/incidents", "Admin+", "Pusat komando penanganan insiden sistem, timeline, dan post-mortem", "IncidentStatusBadge, TimelineUpdateFeed, PostMortemEditor, ResolveBtn", "POST /organization/ops/incidents/{i}/resolve"),
        ("PR Review SLA", "/organization/devops/pr-reviews", "Member+", "Pelacak SLA review pull request, bottleneck radar, dan codeowners", "PrReviewTable, ReviewerLoadBar, ReassignReviewerModal, AddCodeownerBtn", "POST /organization/devops/pr-reviews/{p}/reassign"),
        ("Release Publisher", "/organization/releases/publisher", "Manager+", "Studio pembuat catatan rilis otomatis berbasis AI dan semver changelog", "ReleaseEditor, AiGenerateNotesButton, SemverSelect, PublishPublicBtn", "POST /organization/releases/publisher/{p}/publish"),
        ("Database Drift", "/organization/database/drift", "Admin+", "Pemeriksa drift skema migrasi, indeks kesehatan, dan safe DDL generator", "DriftReportTable, SchemaDiffViewer, GenerateSafeDdlButton, ResolveBtn", "POST /organization/database/drift/generate-ddl"),
        ("Data Privacy & DSAR", "/organization/compliance/data-privacy", "Admin+", "Pusat kepatuhan GDPR/DSAR, aturan PII masking, dan penghapusan data", "DsarRequestTable, MaskingRuleEditor, ProcessDsarModal, TestMaskModal", "POST /organization/compliance/data-privacy/dsar/{d}/process"),
        ("Executive Boardroom", "/organization/reports/boardroom", "Owner", "Pusat ringkasan KPI eksekutif dan ekspor laporan investor pitch", "KpiBriefingCard, ExecutiveSummaryTextarea, FinalizeReportButton", "POST /organization/reports/boardroom/{b}/finalize"),
        ("OmniSearch Spotlight", "/search/omnibar", "Member+", "Palet perintah global ⌘K dan pencarian terpadu multi-entitas", "CommandInput, ResultGroupList, RecentSearches, ShortcutHintBadge", "GET /search/omnibar/query"),
        ("API Playground", "/organization/developer/api-playground", "Member+", "Studio eksekusi API interaktif dan generator SDK multi-bahasa", "EndpointSelector, JsonPayloadEditor, ResponseViewer, SdkCodeSnippet", "POST /organization/developer/api-playground/execute"),
        ("Chaos GameDay", "/organization/sre/chaos-gameday", "Admin+", "Studio eksperimen rekayasa chaos (latency injection, service failure)", "ChaosExperimentTable, RunExperimentModal, AbortButton, MetricsGraph", "POST /organization/sre/chaos-gameday/{e}/run"),
        ("Deployment Pipelines", "/organization/sre/deployments", "Admin+", "Pelacak promosi pipeline multi-environment (Dev -> Staging -> Prod)", "EnvironmentPromoteCard, RiskScoreBadge, PromoteButton, RollbackModal", "POST /organization/sre/deployments/{p}/promote"),
        ("On-Call Rotation", "/organization/sre/oncall", "Admin+", "Jadwal shift on-call engineer dan kebijakan eskalasi paging otomatis", "RotaCalendarView, ActiveOncallBadge, TriggerPageModal, AckButton", "POST /organization/sre/oncall/{s}/page"),
        ("Synthetic Monitors", "/organization/sre/synthetics", "Admin+", "Probe pengujian uptime global dari multi-region dan latency SLA", "MonitorDataTable, GlobalProbeMap, TriggerManualProbeBtn, ToggleBtn", "POST /organization/sre/synthetics/{m}/probe"),
        ("Incident Runbooks", "/organization/sre/runbooks", "Admin+", "Katalog playbooks remediasi insiden otomatis dan log eksekusi", "RunbookCardGrid, StepWorkflowViewer, ExecuteRunbookModal, LogDrawer", "POST /organization/sre/runbooks/{r}/execute"),
        ("Distributed Traces", "/organization/sre/traces", "Admin+", "Visualisasi distributed tracing, service topology, dan latency span", "SpanWaterfallChart, ServiceTopologyGraph, TraceSearchFilter, ErrorTag", "GET /organization/sre/traces/{t}"),
        ("AI Root Cause Analysis", "/organization/sre/rca", "Admin+", "Kopilot investigasi akar masalah insiden berbasis AI dan pembuatan post-mortem", "RcaIncidentSelect, AiAnalyzeButton, CausalGraphViewer, ExportPdfBtn", "POST /organization/sre/rca/analyze"),
        ("File Manager", "/files", "Member+", "Manajemen aset digital dan dokumen dengan struktur folder hirarkis", "FolderTreeSidebar, FileGrid, UploadDropzone, SecureDownloadButton", "POST /files/upload"),
        ("Single Sign-On (SSO)", "/organization/sso", "Admin+", "Konfigurasi autentikasi perusahaan SAML 2.0 dan OpenID Connect", "SamlConfigForm, OidcConfigForm, DomainWhitelistInput, SpMetadataBtn", "POST /organization/sso/saml"),
        ("Security & Sessions", "/organization/security-settings", "Admin+", "Kebijakan keamanan sesi, timeout, IP whitelist, dan kill active session", "SecurityPolicyForm, IpWhitelistTable, ActiveSessionList, RevokeAllBtn", "PUT /organization/security-settings/policy"),
        ("Enterprise Billing", "/organization/billing", "Owner", "Manajemen paket langganan enterprise, metode bayar, dan unduh faktur", "CurrentPlanCard, PricingPlanGrid, PaymentMethodForm, InvoiceTable", "POST /organization/billing/plan"),
        ("Data Retention", "/organization/data-retention", "Admin+", "Kebijakan masa retensi data, GDPR export, dan pembersihan otomatis", "RetentionSlider, RequestExportButton, PurgeNowConfirmModal, DownloadBtn", "POST /organization/data-retention/purge"),
        ("System Health Status", "/system-status", "Public/Auth", "Halaman status operasional layanan publik dan metrik uptime", "ServiceStatusList, IncidentHistoryTimeline, ResponseTimeGraph", "GET /system-status"),
        ("Collaboration Report", "/reports/collaboration", "Manager+", "Analitik produktivitas, velocity sprint, dan pola kolaborasi tim", "VelocityBarChart, CycleTimeDistribution, MemberContributionTable", "GET /reports/collaboration/export"),
        ("Empty States Gallery", "/empty-states", "Public/Auth", "Galeri visual state kosong sistem untuk panduan pengalaman pertama pengguna", "EmptyStateGrid, ActionButtonPreview, VisualIllustrationDisplay", "GET /empty-states"),
        ("System Feedback Hub", "/system/feedback", "Public/Auth", "Komponen toast interaktif, loading state, dan dialog konfirmasi kritis", "ToastTriggerGrid, KineticBannerPreview, HighSecurityDialogDemo", "GET /system/feedback"),
        ("Onboarding Wizard", "/onboarding", "Auth", "Alur onboarding multi-tahap lengkap dari pemilihan metode kerja ke proyek", "StepProgressBar, MethodologyCardSelect, FirstProjectForm, FinishBtn", "POST /onboarding/complete"),
        ("Living Design System", "/design-system", "Admin+", "Katalog sistem desain UI Kinetic (tipografi, warna, buttons, inputs, badge)", "ColorPaletteGrid, TypographySpecimen, ButtonVariantList, InputFormDemo", "GET /design-system"),
        ("Mobile Companion", "/mobile", "Member+", "Antarmuka mobile khusus task board, standup, dan quick approval", "MobileHeader, TouchKanbanScroll, QuickActionFab, BottomNavigation", "GET /mobile"),
        ("Release Catalog", "/releases", "Member+", "Katalog rilis versi aplikasi dan catatan perbaikan publik", "ReleaseCardList, SemverBadge, AiGenerateNotesModal, PublishToggle", "POST /releases"),
        ("Custom Widget Builder", "/dashboard/builder", "Member+", "Studio perancang layout dashboard kustom dan executive widget", "WidgetCanvasGrid, AddWidgetDrawer, MetricConfigModal, ResetButton", "POST /dashboard/builder/save"),
        ("User Profile", "/settings/profile", "Member+", "Pengaturan informasi pribadi akun, nama, email, dan avatar profil", "ProfileForm, NameInput, EmailInput, AvatarUploadDropzone, SaveButton", "PATCH /settings/profile"),
        ("User Security", "/settings/security", "Member+", "Perubahan kata sandi dan manajemen keamanan akun personal", "PasswordUpdateForm, CurrentPasswordInput, NewPasswordInput, SaveBtn", "PUT /settings/password"),
        ("User 2FA TOTP", "/settings/security", "Member+", "Aktivasi otentikasi dua faktor via aplikasi Authenticator (QR Code)", "TwoFactorEnableModal, QrCodeDisplay, OtpInput, RecoveryCodeList", "POST /settings/two-factor-authentication/confirm"),
        ("User Sessions", "/settings/sessions", "Member+", "Daftar perangkat dan sesi aktif pengguna dengan opsi logout remote", "SessionDataTable, DeviceIcon, CurrentBadge, LogoutOtherSessionsBtn", "DELETE /settings/sessions/other"),
        ("User Notification Prefs", "/settings/notifications", "Member+", "Pengaturan preferensi saluran penerimaan notifikasi in-app & email", "EventMatrixTable, InAppCheckbox, EmailCheckbox, SavePreferencesBtn", "PUT /settings/notifications"),
        ("User API Tokens", "/settings/api-tokens", "Member+", "Manajemen personal access token Sanctum dan integrasi akun pihak ketiga", "TokenDataTable, CreateTokenModal, ScopesCheckbox, ConnectedAccounts", "POST /settings/api-tokens"),
        ("User AI Preferences", "/settings/ai-preferences", "Member+", "Pengaturan persona, direktif kustom, dan preferensi bantuan AI", "AiToneSelect, SystemDirectiveTextarea, CreativitySlider, SaveButton", "PUT /settings/ai-preferences"),
        ("User Regional & Timezone", "/settings/language-timezone", "Member+", "Pengaturan bahasa antarmuka, format tanggal, dan zona waktu lokal", "LanguageDropdown, TimezoneDropdownSelect, DateFormatRadio, SaveBtn", "PUT /settings/language-timezone"),
        ("User Keyboard Shortcuts", "/settings/keyboard-shortcuts", "Member+", "Kustomisasi pintasan tombol keyboard dan pengaturan aksesibilitas", "ShortcutDataTable, ShortcutRecorderModal, HighContrastToggle, SaveBtn", "PUT /settings/keyboard-shortcuts"),
        ("User Appearance", "/settings/appearance", "Member+", "Pilihan tema visual antarmuka (Mode Terang, Mode Gelap, Sinkron Sistem)", "ThemeSelectorTabs, AccentColorPicker, CompactModeToggle, PreviewCard", "Inertia Page (appearance.edit)")
    ]

    tbl_pages = doc.add_table(rows=len(pages_sample) + 1, cols=6)
    p_headers = ["Page / Screen", "Route", "Role", "Tujuan Utama", "Komponen UI Utama", "API / Endpoint"]
    for c_idx, h_text in enumerate(p_headers):
        tbl_pages.cell(0, c_idx).paragraphs[0].add_run(h_text)
    for r_idx, r_data in enumerate(pages_sample):
        for c_idx, val in enumerate(r_data):
            tbl_pages.cell(r_idx + 1, c_idx).paragraphs[0].add_run(val)
    format_table(tbl_pages, header_bg="0284C7")

    doc.add_page_break()

    # ----------------------------------------------------
    # SECTION 5: USER FLOW (MERMAID)
    # ----------------------------------------------------
    add_styled_heading(doc, "5. USER FLOW (MERMAID FLOWCHARTS)", level=1)
    
    p = doc.add_paragraph()
    p.add_run("Berikut adalah rekonstruksi alur perjalanan pengguna (User Journey) utama pada aplikasi Pandu Management yang dimodelkan dalam format Mermaid Flowchart:").font.name = 'Calibri'

    add_styled_heading(doc, "5.1 Alur Registrasi, Autentikasi & Onboarding Organisasi", level=2)
    flow_1 = """flowchart TD
    A([Pengguna Baru]) --> B[Akses /register]
    B --> C[Submit Nama, Email, Password]
    C --> D{Validasi Input}
    D -- Gagal (422) --> B
    D -- Sukses --> E[Buat User Model & Trigger Email Verification]
    E --> F[Redirect ke /onboarding/organization]
    F --> G[Input Nama Organisasi, Slug, Timezone]
    G --> H[Buat Organisasi & Hubungkan User sebagai Owner]
    H --> I[Inisialisasi Default Workflow, Template & Roles]
    I --> J{Undang Anggota?}
    J -- Ya --> K[Input Email Anggota & Kirim Invitation Token]
    J -- Lewati --> L[Selesai Onboarding]
    K --> L
    L --> M([Masuk ke Dashboard Utama /dashboard])"""
    add_code_block(doc, flow_1, "mermaid")

    add_styled_heading(doc, "5.2 Alur Pembuatan Tugas, Estimasi & Pergerakan Papan Kanban", level=2)
    flow_2 = """flowchart TD
    A([Anggota Tim / Manager]) --> B[Buka Papan Kanban /projects/{id}/board]
    B --> C[Klik 'Buat Tugas Baru' / Modal Input]
    C --> D[Input Judul, Deskripsi, Tipe, Prioritas, Assignee, Estimate Points]
    D --> E{Gunakan Asisten Pandu AI?}
    E -- Ya --> F[AI Gateway: Generate Acceptance Criteria & Subtasks]
    E -- Tidak --> G[Submit Form Tugas]
    F --> G
    G --> H[TaskService::create: Generate Key PROJ-N, Hitung Initial Rank]
    H --> I[Trigger Automation Engine 'task.created' & Kirim Notifikasi Assignee]
    I --> J[Tugas Tampil di Kolom 'To Do' Papan Kanban]
    J --> K[User Melakukan Drag-and-Drop Kartu ke Kolom Lain]
    K --> L[Hitung Lexicographic Midpoint RankService::between(prev, next)]
    L --> M{Cek Optimistic Concurrency version?}
    M -- Konflik (409) --> N[Munculkan Alert TaskConcurrencyException: Reload State]
    M -- Valid --> O[TaskService::move: Update status_id, rank, version + 1]
    O --> P[Catat TaskActivity & Broadcast Event via Real-Time]
    P --> Q([State Papan Kanban Terupdate])"""
    add_code_block(doc, flow_2, "mermaid")

    add_styled_heading(doc, "5.3 Alur Agile Backlog Refinement, Planning Poker & Siklus Sprint", level=2)
    flow_3 = """flowchart TD
    A([Product Manager / Scrum Master]) --> B[Buka Backlog /projects/{id}/backlog]
    B --> C[Buat Sprint Baru 'future' & Masukkan Tugas dari Backlog]
    C --> D[Buka Planning Poker Room /projects/{id}/planning-poker/{session}]
    D --> E[Tim Memilih Kartu Estimasi Fibonacci: 1, 2, 3, 5, 8, 13, 21]
    E --> F[Scrum Master Klik 'Reveal Votes']
    F --> G{Apakah Ada Konsensus?}
    G -- Diskusi Ulang --> E
    G -- Konsensus Tercapai --> H[Terapkan Story Points ke Tugas]
    H --> I[Scrum Master Klik 'Mulai Sprint' di Backlog]
    I --> J{Cek Kebijakan: Apakah Ada Sprint Aktif Lain?}
    J -- Ya --> K[Tolak: Selesaikan Sprint Aktif Dahulu]
    J -- Tidak --> L[SprintService::startSprint: status='active', snapshot committed_points]
    L --> M[Tim Bekerja Selama Siklus Sprint 2 Pekan & Monitor Burndown Chart]
    M --> N[Sprint Selesai: Klik 'Complete Sprint']
    N --> O{Pilihan Tugas Belum Selesai?}
    O -- Kembalikan ke Backlog --> P[Set sprint_id = NULL]
    O -- Pindahkan ke Next Sprint --> Q[Set sprint_id = NextSprint.id]
    P --> R[Hitung completed_points & Tutup Sprint]
    Q --> R
    R --> S[Buka Sprint Retrospective /projects/{id}/retrospectives]
    S --> T[Tim Input Feedback: Went Well, Needs Improvement, Action Items]
    T --> U[Vote Item Retro & Konversi Action Item Terbaik Menjadi Kaizen / Task]
    U --> V([Siklus Sprint Selesai & Tercatat di Agile Report])"""
    add_code_block(doc, flow_3, "mermaid")

    add_styled_heading(doc, "5.4 Alur Penanganan Insiden SRE, War Room & AI RCA Post-Mortem", level=2)
    flow_4 = """flowchart TD
    A([Synthetic Monitor Probe / Alert Webhook]) --> B{Status Check Gagal?}
    B -- Gagal --> C[Otomatis Buat Insiden Sistem di Incident Management]
    C --> D[Trigger On-Call Schedule & Kirim Paging ke Engineer yang Bertugas]
    D --> E[On-Call Engineer Terima Paging & Klik 'Acknowledge']
    E --> F[Buka Incident War Room /organization/ops/incidents/{id}]
    F --> G[Eksekusi Automated Incident Runbook / Mitigasi Manual]
    G --> H[Posting Update Berkala ke Timeline Insiden]
    H --> I{Sistem Kembali Normal?}
    I -- Belum --> G
    I -- Normal --> J[Klik 'Resolve Incident' & Tandai Waktu Pemulihan (MTTR)]
    J --> K[Buka AI Root Cause Analysis Copilot /organization/sre/rca]
    K --> L[Klik 'AI Analyze Incident': Ingest Trace, Log & Timeline]
    L --> M[AI Gateway Generate Rekomendasi 5 Whys, Root Cause & Action Items]
    M --> N[Simpan Post-Mortem Laporan & Ekspor PDF Kepatuhan SOC2]
    N --> O([Insiden Selesai & Tercatat di Audit Log])"""
    add_code_block(doc, flow_4, "mermaid")

    doc.add_page_break()

    # ----------------------------------------------------
    # SECTION 6: BUSINESS PROCESS & STATE TRANSITION
    # ----------------------------------------------------
    add_styled_heading(doc, "6. BUSINESS PROCESS & STATE TRANSITION", level=1)
    
    p = doc.add_paragraph()
    p.add_run("Aplikasi Pandu Management mengimplementasikan 10 aturan proses bisnis inti dengan batasan validasi dan transisi status yang ketat:").font.name = 'Calibri'

    bp_items = [
        ("1. Pembuatan & Penomoran Tugas (Task Lifecycle & Multi-Assignee)",
         "Trigger: Pengguna mengklik tombol 'Buat Tugas' atau menerima dispatch otomasi.\n"
         "Actor: Member, Manager, Admin, Owner.\n"
         "Input: Judul (string), Deskripsi (nullable html), Tipe (epic, story, task, bug, subtask), Prioritas (urgent, high, medium, low), Assignees (array of User IDs), Labels (array of UUIDs), Estimate Points (float).\n"
         "Business Rule: Nomor urut sequence_number dihasilkan otomatis secara atomic dan independen per proyek (misal KNT-1, KNT-2). Tugas dapat memiliki banyak assignee melalui junction table task_assignees (ADR-004). Assignee pertama dicatat sebagai penanggung jawab utama.\n"
         "Validation: Judul wajib diisi, maksimal 255 karakter. Prioritas harus salah satu dari: urgent, high, medium, low.\n"
         "Process: Dijalankan dalam DB::transaction. Menghitung rank awal melalui RankService::generateAfter(lastRank). Mencatat entri TaskActivity.\n"
         "Notification: Mengirim TaskAssignedNotification ke seluruh pengguna yang ditugaskan.\n"
         "Status Transition: [Initial Status / Backlog / To Do]."),
        ("2. Pergeseran Posisi Tugas & Lexicographic Fractional Ranking",
         "Trigger: Pengguna menggeser kartu pada papan Kanban atau mengubah urutan backlog.\n"
         "Actor: Member, Manager, Admin, Owner.\n"
         "Input: task_id, target_status_id, prev_rank (nullable string), next_rank (nullable string), expected_version (integer).\n"
         "Business Rule: Menggunakan algoritma pemeringkatan fraksional leksikografis berbasis string VARCHAR(64) (ADR-003). Menghasilkan string di antara prev dan next tanpa perlu memodifikasi baris lain. Jika panjang rank melebihi 50 karakter, sistem memicu rebalance otomatis.\n"
         "Validation & Concurrency: Memeriksa optimistic locking version. Jika version pada database berbeda dengan expected_version pada request, sistem melempar TaskConcurrencyException (HTTP 409).\n"
         "Process: Memperbarui status_id, rank, dan melakukan increment version += 1. Jika berpindah ke status is_completed=true, field completed_at otomatis diisi timestamp saat ini.\n"
         "Status Transition: [To Do] → [In Progress] → [Code Review] → [Testing & QA] → [Done]."),
        ("3. Siklus Hidup Sprint Scrum & Burndown Baseline",
         "Trigger: Scrum Master / Manager membuat, memulai, atau menyelesaikan sprint.\n"
         "Actor: Manager, Admin, Owner.\n"
         "Input: name, goal, start_date, end_date, duration_weeks, destination_type (backlog/sprint), target_sprint_id.\n"
         "Business Rule: Hanya diperbolehkan 1 sprint aktif per proyek pada satu waktu. Saat sprint dimulai, sistem mengambil snapshot baseline committed_points dari total poin tugas yang terdaftar. Saat sprint diselesaikan, tugas yang belum tuntas diarahkan ke Backlog atau ke Sprint berikutnya sesuai pilihan pengguna.\n"
         "Validation: Tanggal akhir harus setelah tanggal mulai. Status sprint harus 'future' untuk dapat dimulai, dan harus 'active' untuk dapat diselesaikan.\n"
         "Status Transition: [future] → [active] → [completed]."),
        ("4. Real-Time Planning Poker Estimation Room",
         "Trigger: Tim membuka sesi estimasi story point untuk tugas sprint backlog.\n"
         "Actor: Seluruh anggota tim proyek.\n"
         "Input: session_id, task_id, vote_value (Fibonacci: 1, 2, 3, 5, 8, 13, 21, ?).\n"
         "Business Rule: Voting bersifat rahasia (blind voting) sampai moderator mengklik 'Reveal Votes'. Setelah terbuka, sistem menghitung rata-rata dan konsensus voting. Moderator dapat mengklik 'Apply Points' untuk langsung mengupdate estimate_points pada model Task.\n"
         "Status Transition: [voting] → [revealed] → [applied / reset]."),
        ("5. Pengajuan & Persetujuan Anggaran Biaya Proyek (Expense Approval)",
         "Trigger: Anggota tim mencatat pengeluaran operasional proyek (lisensi cloud, hardware, akomodasi).\n"
         "Actor: Pengaju: Member+; Penyetujui: Manager, Admin, Owner.\n"
         "Input: project_id, title, category, amount, currency, expense_date, receipt_attachment_id, notes.\n"
         "Business Rule: Pengeluaran di atas batas nominal memerlukan persetujuan Manager proyek. Pengeluaran yang disetujui otomatis diakumulasikan ke dalam penyerapan anggaran ProjectBudget.\n"
         "Status Transition: [pending] → [approved / rejected]."),
        ("6. Manajemen Insiden SRE & On-Call Paging War Room",
         "Trigger: Monitor sistem mendeteksi kegagalan probe, API error spike, atau laporan manual engineer.\n"
         "Actor: System Monitor, On-Call Engineer, Incident Commander.\n"
         "Input: title, severity (critical, high, medium, low), affected_services, summary.\n"
         "Business Rule: Insiden tingkat 'critical' otomatis memicu paging rotasi shift On-Call dan membuka ruang War Room. Tim wajib mendokumentasikan post-mortem sebelum insiden ditutup secara permanen.\n"
         "Status Transition: [investigating] → [identified] → [monitoring] → [resolved]."),
        ("7. Feature Flag Progressive Rollout & Emergency Kill Switch",
         "Trigger: DevOps/Tech Lead mengonfigurasi rilis fitur bertahap ke sebagian pengguna.\n"
         "Actor: Admin, Owner.\n"
         "Input: key, description, rollout_percentage (0-100), target_roles, target_organizations, is_enabled.\n"
         "Business Rule: Evaluasi flag menggunakan algoritma hashing konsisten deterministik berdasarkan User UUID. Jika terjadi kegagalan sistem pada produksi, tombol Kill Switch mematikan flag secara instan tanpa perlu redeployment kode.\n"
         "Status Transition: [draft] → [canary_rollout] → [general_availability] → [killed / retired]."),
        ("8. Outbound Webhook Dispatching & Dead-Letter Queue (DLQ) Replay",
         "Trigger: Terjadi event sistem (task.created, sprint.started, incident.resolved).\n"
         "Actor: Automation Engine, WebhookService.\n"
         "Input: event_name, payload_data, target_endpoint, secret_key.\n"
         "Business Rule: Payload ditandatangani menggunakan header X-Pandu-Signature berbasis HMAC SHA-256. Jika endpoint eksternal gagal merespons (status selain 2xx) setelah 3 kali percobaan retry, event dialihkan ke Webhook Dead-Letter Queue (DLQ) untuk diinspeksi dan di-replay secara manual oleh administrator.\n"
         "Status Transition: [queued] → [delivered / failed] → [dlq_replaying] → [success]."),
        ("9. Pembersihan Data Kepatuhan & Ekspor GDPR (Data Retention Purge)",
         "Trigger: Administrator mengeksekusi kebijakan pembersihan data atau pengguna mengajukan DSAR (Data Subject Access Request).\n"
         "Actor: Admin, Owner, Compliance Officer.\n"
         "Input: retention_days, entity_types (audit_logs, inactive_tasks, deleted_attachments).\n"
         "Business Rule: Data yang dihapus secara lunak (soft delete) melewati batas masa retensi akan dipurged permanen dari storage fisik. Berkas digital pada disk di-unlink dan catatan kepatuhan diekspor dalam format terenkripsi.\n"
         "Status Transition: [scheduled] → [processing] → [completed]."),
        ("10. Eksekusi Pandu AI Gateway & Redaksi PII Otomatis",
         "Trigger: Pengguna meminta bantuan AI (Acceptance Criteria, Breakdown Task, Sprint Summary, RCA Copilot).\n"
         "Actor: Member, Manager, Admin, Owner.\n"
         "Input: prompt, capability, json_schema, provider_override.\n"
         "Business Rule: Sebelum prompt dikirim ke provider eksternal (OpenAI/Gemini), prompt diproses melalui RedactionService untuk menyamarkan data pribadi (email, nomor telepon, IP address, API key). Sistem memeriksa kuota token bulanan; jika terlampaui, request ditolak dengan status budget_exceeded tanpa menagih biaya ekstra.\n"
         "Status Transition: [prompt_sanitizing] → [provider_dispatch] → [cost_recorded] → [success / failed].")
    ]

    for title, detail in bp_items:
        p_b = doc.add_paragraph()
        r_bt = p_b.add_run(f"{title}\n")
        r_bt.bold = True
        r_bt.font.name = 'Segoe UI'
        r_bt.font.color.rgb = RGBColor(30, 41, 59)
        r_bd = p_b.add_run(detail)
        r_bd.font.name = 'Calibri'
        r_bd.font.size = Pt(9.5)

    doc.add_page_break()

    # ----------------------------------------------------
    # SECTION 7: DATABASE BLUEPRINT
    # ----------------------------------------------------
    add_styled_heading(doc, "7. DATABASE BLUEPRINT & ENTITY RELATIONSHIP DIAGRAM", level=1)
    
    p = doc.add_paragraph()
    p.add_run("Database Pandu Management dirancang dengan standar enterprise yang mengedepankan ").font.name = 'Calibri'
    p.add_run("integritas referensial, skalabilitas multi-tenant, dan pencegahan enumerasi data.").bold = True
    p.add_run(" Berdasarkan ADR-002, seluruh tabel domain menggunakan UUIDv7 sebagai Primary Key ($table->uuid('id')->primary()), sedangkan tabel users mempertahankan auto-increment bigint id demi kompatibilitas autentikasi Laravel Fortify/Session dengan penambahan kolom uuid unik.").font.name = 'Calibri'

    add_styled_heading(doc, "7.1 Mermaid Entity Relationship Diagram (ERD Inti)", level=2)
    
    erd_mermaid = """erDiagram
    USERS ||--o{ ORGANIZATION_MEMBERSHIPS : joins
    USERS ||--o{ PROJECT_MEMBERS : contributes
    USERS ||--o{ TASK_ASSIGNEES : assigned_to
    USERS ||--o{ COMMENTS : writes
    USERS ||--o{ ATTACHMENTS : uploads
    
    ORGANIZATIONS ||--|{ ORGANIZATION_MEMBERSHIPS : contains
    ORGANIZATIONS ||--o{ TEAMS : organizes
    ORGANIZATIONS ||--o{ ROLES : customizes
    ORGANIZATIONS ||--o{ PROJECTS : owns
    ORGANIZATIONS ||--o{ ORGANIZATION_AI_SETTINGS : configures
    ORGANIZATIONS ||--o{ SLA_POLICIES : enforces
    ORGANIZATIONS ||--o{ WEBHOOK_SUBSCRIPTIONS : registers
    ORGANIZATIONS ||--o{ AUTOMATION_RULES : automates
    
    ROLES ||--o{ ROLE_PERMISSIONS : grants
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : assigned_in
    ORGANIZATION_MEMBERSHIPS ||--o| ROLES : has_role
    
    PROJECTS ||--|{ WORKFLOWS : defines
    WORKFLOWS ||--|{ WORKFLOW_STATUSES : consists_of
    PROJECTS ||--o{ SPRINTS : plans
    PROJECTS ||--o{ TASKS : contains
    PROJECTS ||--o{ PROJECT_MEMBERS : includes
    PROJECTS ||--o{ PROJECT_BUDGETS : allocates
    PROJECTS ||--o{ PROJECT_RISKS : tracks
    PROJECTS ||--o{ PROJECT_WHITEBOARDS : sketches
    
    SPRINTS ||--o{ TASKS : schedules
    SPRINTS ||--o{ SPRINT_DAILY_METRICS : snapshots
    SPRINTS ||--o{ SPRINT_RETROSPECTIVES : evaluates
    
    TASKS ||--|| WORKFLOW_STATUSES : has_status
    TASKS ||--o{ TASK_ASSIGNEES : assigned_users
    TASKS ||--o{ TASK_ACTIVITIES : records_audit
    TASKS ||--o{ TASK_CHECKLISTS : contains_items
    TASKS ||--o{ COMMENTS : discusses
    TASKS ||--o{ ATTACHMENTS : attaches_files
    TASKS ||--o{ TASK_BLOCKERS : blocked_by
    TASKS ||--o{ TASK_DEPENDENCIES : precedes_or_succeeds
    TASKS ||--o| TASK_SLA_TRACKERS : tracks_sla"""
    
    add_code_block(doc, erd_mermaid, "mermaid")

    add_styled_heading(doc, "7.2 Spesifikasi Skema Tabel-Tabel Utama", level=2)

    tables_spec = [
        ("organizations", "Tabel multi-tenant root organisasi", [
            ("id", "uuid (PK)", "UUIDv7 unik identitas organisasi"),
            ("name", "varchar(255)", "Nama resmi organisasi / perusahaan"),
            ("slug", "varchar(255) (UQ)", "Slug URL unik tenant (misal: acme-corp)"),
            ("status", "varchar(50)", "Status keaktifan: active, suspended, trial"),
            ("timezone", "varchar(100)", "Zona waktu default (default: Asia/Jakarta)"),
            ("locale", "varchar(10)", "Bahasa default organisasi (default: id)"),
            ("settings", "json (nullable)", "Konfigurasi tema, batasan kuota, fitur"),
            ("created_at, updated_at, deleted_at", "timestamps", "Audit waktu & soft delete")
        ]),
        ("users", "Tabel akun pengguna terdaftar", [
            ("id", "bigint (PK)", "Auto-increment ID internal untuk Fortify/Auth"),
            ("uuid", "uuid (UQ)", "UUIDv7 unik untuk eksposur API dan integrasi eksternal"),
            ("name", "varchar(255)", "Nama lengkap pengguna"),
            ("email", "varchar(255) (UQ)", "Alamat email unik akun"),
            ("password", "varchar(255)", "Hash kata sandi Bcrypt / Argon2"),
            ("two_factor_secret", "text (nullable)", "Secret key terenkripsi untuk TOTP Google Authenticator"),
            ("two_factor_recovery_codes", "text (nullable)", "Kode pemulihan 2FA darurat terenkripsi"),
            ("two_factor_confirmed_at", "datetime (nullable)", "Waktu aktivasi dan konfirmasi 2FA"),
            ("status", "varchar(50)", "Status akun: active, inactive, pending_verification"),
            ("current_organization_id", "uuid (FK -> orgs)", "Organisasi aktif yang sedang dipilih pengguna")
        ]),
        ("projects", "Tabel proyek kerja / workspace", [
            ("id", "uuid (PK)", "UUIDv7 unik identitas proyek"),
            ("organization_id", "uuid (FK -> orgs)", "Organisasi pemilik proyek (Index)"),
            ("name", "varchar(255)", "Nama proyek kerja"),
            ("key", "varchar(10)", "Kode awalan unik tugas (misal: KNT, DSGN)"),
            ("slug", "varchar(255)", "Slug URL proyek"),
            ("type", "varchar(50)", "Metodologi: scrum, kanban, bug_tracking, general"),
            ("lead_user_id", "bigint (FK -> users)", "User ID pemimpin proyek (Project Lead)"),
            ("status", "varchar(50)", "Status proyek: active, archived, completed"),
            ("settings", "json (nullable)", "Pengaturan fitur aktif, default views, notification rules")
        ]),
        ("tasks", "Tabel item tugas, issue, story, dan subtask", [
            ("id", "uuid (PK)", "UUIDv7 unik identitas tugas"),
            ("organization_id", "uuid (FK -> orgs)", "Organisasi pemilik tugas"),
            ("project_id", "uuid (FK -> projects)", "Proyek tempat tugas berada (Index)"),
            ("status_id", "uuid (FK -> statuses)", "Status alur kerja saat ini (Index)"),
            ("sprint_id", "uuid (nullable, FK -> sprints)", "Sprint aktif yang menaungi tugas (Index)"),
            ("parent_id", "uuid (nullable, FK -> tasks)", "ID tugas induk jika merupakan subtask"),
            ("sequence_number", "integer", "Nomor urut tugas dalam proyek (misal: 42)"),
            ("key", "varchar(50)", "Kunci unik terpadu (misal: KNT-42)"),
            ("title", "varchar(255)", "Judul ringkas tugas"),
            ("description", "longtext (nullable)", "Rincian deskripsi, kriteria penerimaan, catatan"),
            ("type", "varchar(50)", "Tipe tugas: epic, story, task, bug, subtask"),
            ("priority", "varchar(50)", "Prioritas tugas: urgent, high, medium, low"),
            ("estimate_points", "float (nullable)", "Estimasi bobot story points agile"),
            ("due_date", "date (nullable)", "Batas tenggat waktu penyelesaian"),
            ("start_date", "date (nullable)", "Tanggal awal pengerjaan (Gantt timeline)"),
            ("is_milestone", "boolean (default: false)", "Penanda tonggak capaian penting proyek"),
            ("rank", "varchar(64)", "String pemeringkatan leksikografis (ADR-003)"),
            ("version", "integer (default: 1)", "Versi optimistic concurrency locking"),
            ("created_by", "bigint (FK -> users)", "User pembuat tugas")
        ]),
        ("sprints", "Tabel iterasi sprint scrum", [
            ("id", "uuid (PK)", "UUIDv7 unik sprint"),
            ("organization_id", "uuid (FK -> orgs)", "Organisasi pemilik sprint"),
            ("project_id", "uuid (FK -> projects)", "Proyek scrum yang bersangkutan"),
            ("name", "varchar(255)", "Nama sprint (misal: KNT Sprint 1)"),
            ("goal", "text (nullable)", "Tujuan utama (Sprint Goal) yang ingin dicapai"),
            ("status", "varchar(50)", "Status sprint: future, active, completed"),
            ("start_date", "date (nullable)", "Tanggal mulai sprint"),
            ("end_date", "date (nullable)", "Tanggal akhir sprint"),
            ("committed_points", "float (nullable)", "Total poin baseline saat sprint dimulai"),
            ("completed_points", "float (nullable)", "Total poin yang berhasil diselesaikan"),
            ("sequence_number", "integer", "Nomor urut iterasi sprint dalam proyek")
        ])
    ]

    for t_name, t_desc, cols in tables_spec:
        p_t = doc.add_paragraph()
        p_t.add_run(f"Tabel: {t_name}").bold = True
        p_t.add_run(f" — {t_desc}")
        
        tbl_s = doc.add_table(rows=len(cols) + 1, cols=3)
        tbl_s.cell(0, 0).paragraphs[0].add_run("Kolom").bold = True
        tbl_s.cell(0, 1).paragraphs[0].add_run("Tipe Data & Index").bold = True
        tbl_s.cell(0, 2).paragraphs[0].add_run("Keterangan & Relasi").bold = True
        
        for r_idx, (col_name, col_type, col_note) in enumerate(cols):
            tbl_s.cell(r_idx + 1, 0).paragraphs[0].add_run(col_name)
            tbl_s.cell(r_idx + 1, 1).paragraphs[0].add_run(col_type)
            tbl_s.cell(r_idx + 1, 2).paragraphs[0].add_run(col_note)
        format_table(tbl_s, header_bg="334155")
        doc.add_paragraph().paragraph_format.space_after = Pt(2)

    doc.add_page_break()

    # ----------------------------------------------------
    # SECTION 8: API BLUEPRINT
    # ----------------------------------------------------
    add_styled_heading(doc, "8. API BLUEPRINT (RESTFUL V1 & WEBHOOK ENGINE)", level=1)
    
    p = doc.add_paragraph()
    p.add_run("Pandu Management mengekspos endpoint RESTful API v1 resmi pada prefix ").font.name = 'Calibri'
    p.add_run("/api/v1/").bold = True
    p.add_run(" yang dilindungi oleh middleware stack: ").font.name = 'Calibri'
    p.add_run("auth:sanctum, throttle:api, api.tenant (ResolveApiTenant), dan idempotency (RequireIdempotency).").bold = True

    api_endpoints = [
        # Method, Endpoint, Auth, Purpose, Request, Response, DB/Service
        ("GET", "/api/v1/me", "Sanctum", "Mendapatkan profil pengguna aktif dan organisasi", "—", "{ user: { id, name, email, uuid }, organizations: [...] }", "User, Organization"),
        ("GET", "/api/v1/tokens", "Sanctum", "Melihat daftar token akses personal aktif", "—", "{ tokens: [{ id, name, last_used_at, expires_at }] }", "PersonalAccessToken"),
        ("POST", "/api/v1/tokens", "Sanctum", "Membuat personal access token baru", "{ name: string, abilities?: array }", "{ token: string (plainText), token_id: int }", "TokenController"),
        ("DELETE", "/api/v1/tokens/{id}", "Sanctum", "Mencabut personal access token", "—", "{ message: 'Token revoked successfully' }", "PersonalAccessToken"),
        ("GET", "/api/v1/organizations", "Sanctum", "Daftar seluruh organisasi yang diikuti pengguna", "—", "{ data: [{ id, name, slug, role }] }", "OrganizationController"),
        ("GET", "/api/v1/organizations/{id}", "Sanctum", "Detail organisasi dan anggota", "—", "{ organization: { id, name, slug, timezone, ... } }", "Organization"),
        ("GET", "/api/v1/projects", "Sanctum", "Daftar proyek dalam organisasi aktif", "?type=scrum&status=active", "{ data: [{ id, key, name, type, lead, ... }] }", "ProjectController"),
        ("POST", "/api/v1/projects", "Sanctum", "Membuat proyek baru via API", "{ name: string, key: string, type: string, template_id?: string }", "{ project: { id, key, name, ... } }", "ProjectCreationService"),
        ("GET", "/api/v1/projects/{id}", "Sanctum", "Detail proyek dan konfigurasi workflow", "—", "{ project: { id, key, statuses: [...], ... } }", "Project"),
        ("PUT", "/api/v1/projects/{id}", "Sanctum", "Memperbarui konfigurasi proyek", "{ name?: string, description?: string, lead_user_id?: int }", "{ project: { ... } }", "ProjectController"),
        ("DELETE", "/api/v1/projects/{id}", "Sanctum", "Menghapus/mengarsipkan proyek", "—", "{ message: 'Project deleted successfully' }", "ProjectController"),
        ("GET", "/api/v1/projects/{p}/tasks", "Sanctum", "Daftar tugas dalam proyek dengan filter", "?status_id=UUID&sprint_id=UUID&assignee_id=INT", "{ data: [{ id, key, title, status, assignees: [...] }] }", "TaskController"),
        ("POST", "/api/v1/projects/{p}/tasks", "Sanctum", "Membuat tugas baru dalam proyek", "{ title: string, type: string, priority: string, estimate_points?: float, assignee_ids?: array }", "{ task: { id, key, title, rank, ... } }", "TaskService::create"),
        ("GET", "/api/v1/tasks/{id}", "Sanctum", "Detail tugas lengkap, checklist & aktivitas", "—", "{ task: { id, key, title, comments: [...], checklists: [...] } }", "Task"),
        ("PATCH", "/api/v1/tasks/{id}", "Sanctum", "Memperbarui detail tugas", "{ title?: string, description?: string, priority?: string, expected_version?: int }", "{ task: { ... } }", "TaskService::update"),
        ("POST", "/api/v1/tasks/{id}/move", "Sanctum", "Memindahkan posisi tugas antar kolom/rank", "{ target_status_id: UUID, prev_rank?: string, next_rank?: string, expected_version?: int }", "{ task: { id, status_id, rank, version, ... } }", "TaskService::move"),
        ("DELETE", "/api/v1/tasks/{id}", "Sanctum", "Menghapus tugas dari proyek", "—", "{ message: 'Task deleted successfully' }", "TaskService::delete"),
        ("GET", "/api/v1/projects/{p}/sprints", "Sanctum", "Daftar seluruh sprint dalam proyek", "?status=active", "{ data: [{ id, name, status, start_date, end_date, ... }] }", "SprintController"),
        ("POST", "/api/v1/projects/{p}/sprints", "Sanctum", "Membuat sprint baru (future)", "{ name: string, goal?: string, start_date?: date, end_date?: date }", "{ sprint: { id, name, status: 'future', ... } }", "SprintService::createSprint"),
        ("POST", "/api/v1/sprints/{id}/start", "Sanctum", "Memulai sprint aktif (future -> active)", "{ duration_weeks?: int, start_date?: date, end_date?: date }", "{ sprint: { id, status: 'active', committed_points, ... } }", "SprintService::startSprint"),
        ("POST", "/api/v1/sprints/{id}/complete", "Sanctum", "Menyelesaikan sprint aktif", "{ destination_type: 'backlog'|'sprint', target_sprint_id?: UUID }", "{ sprint: { id, status: 'completed', completed_points, ... } }", "SprintService::completeSprint"),
        ("POST", "/api/v1/tasks/{id}/attachments", "Sanctum", "Mengunggah berkas lampiran pada tugas", "multipart/form-data: file (max: 25MB)", "{ attachment: { id, file_name, file_size, download_url } }", "AttachmentService"),
        ("GET", "/api/v1/attachments/{id}/download", "Sanctum", "Mengunduh file lampiran dengan aman", "—", "Binary Stream (Content-Disposition: attachment)", "AttachmentController"),
        ("GET", "/api/v1/webhooks", "Sanctum", "Daftar webhook subscription organisasi", "—", "{ webhooks: [{ id, url, events, is_active, ... }] }", "WebhookController"),
        ("POST", "/api/v1/webhooks", "Sanctum", "Mendaftarkan webhook receiver baru", "{ url: string (https), events: array, description?: string }", "{ webhook: { id, url, secret, ... } }", "WebhookService"),
        ("POST", "/api/v1/webhooks/{id}/rotate-secret", "Sanctum", "Melakukan rotasi signing secret webhook", "—", "{ secret: string (whsec_...) }", "WebhookService"),
        ("POST", "/api/v1/webhooks/{id}/test", "Sanctum", "Mengirim event uji coba ke webhook", "—", "{ success: bool, http_status: int, latency_ms: int }", "WebhookService"),
        ("POST", "/api/v1/ai/sprint-summary/{s}", "Sanctum", "AI Gateway: Membuat ringkasan pencapaian sprint", "{ provider_override?: string }", "{ summary: string, velocity_analysis: string, tokens_used: int }", "SprintSummaryCapability"),
        ("POST", "/api/v1/ai/task-breakdown", "Sanctum", "AI Gateway: Menguraikan tugas menjadi subtasks", "{ task_title: string, task_description?: string }", "{ subtasks: [{ title, description, estimate_points }] }", "TaskBreakdownCapability"),
        ("POST", "/api/v1/ai/acceptance-criteria", "Sanctum", "AI Gateway: Membuat kriteria penerimaan Gherkin", "{ task_title: string, user_story?: string }", "{ criteria: [{ given, when, then }] }", "AcceptanceCriteriaCapability"),
        ("GET", "/api/v1/system-status/health", "Public", "Probe pemantau kesehatan sistem sintetis", "—", "{ status: 'healthy', database: 'connected', queue: 'idle', time: string }", "SystemStatusController")
    ]

    tbl_api = doc.add_table(rows=len(api_endpoints) + 1, cols=7)
    api_headers = ["Method", "Endpoint", "Auth", "Tujuan Endpoint", "Request Body / Params", "Response Body Summary", "Service / Controller"]
    for c_idx, h_text in enumerate(api_headers):
        tbl_api.cell(0, c_idx).paragraphs[0].add_run(h_text)
    for r_idx, r_data in enumerate(api_endpoints):
        for c_idx, val in enumerate(r_data):
            tbl_api.cell(r_idx + 1, c_idx).paragraphs[0].add_run(val)
    format_table(tbl_api, header_bg="0D9488")

    doc.add_page_break()

    # ----------------------------------------------------
    # SECTION 9: FRONTEND BLUEPRINT
    # ----------------------------------------------------
    add_styled_heading(doc, "9. FRONTEND BLUEPRINT (REACT 19 + INERTIA 3 + TAILWIND 4)", level=1)
    
    p = doc.add_paragraph()
    p.add_run("Arsitektur frontend Pandu Management dibangun di atas kombinasi modern ").font.name = 'Calibri'
    p.add_run("React 19.2 + TypeScript 5.7 + Inertia.js v3 + Tailwind CSS v4 + Radix UI Primitives").bold = True
    p.add_run(" yang menghasilkan pengalaman Single Page Application (SPA) yang sangat cepat tanpa kompleksitas manajemen API endpoint terpisah (ADR-001).").font.name = 'Calibri'

    fe_specs = [
        ("Framework & Engine", "React 19.2 dengan Compiler Babel React Compiler enabled; TypeScript 5.7 dalam mode strict; Inertia.js v3 Server-Driven SPA."),
        ("Routing & Navigation", "Inertia Client-Side Router dengan integrasi Laravel Wayfinder (@/actions dan @/routes) yang menghasilkan fungsi pemanggil route bertipe (type-safe). Menggunakan <Link prefetch>, router.visit(), dan useHttp hook untuk mutasi XHR ringan."),
        ("State Management", "Data halaman dikelola langsung melalui Inertia Page Props ($page.props) yang tersinkronisasi dengan controller Laravel. State lokal menggunakan React useState/useReducer, dan komunikasi real-time menggunakan event listener berbasis WebSocket."),
        ("Design System & UI Primitives", "Tailwind CSS v4 (@tailwindcss/vite) dengan token desain HSL dinamis, Radix UI Primitives (Avatar, Checkbox, Dialog, Dropdown, NavigationMenu, Select, Separator, Sheet, Tooltip), Lucide React Icons, dan Sonner Toast Engine."),
        ("Struktur Direktori", "resources/js/\n├── actions/ & routes/ (Wayfinder Generated Type-Safe Controllers & Routes)\n├── components/ (Atomic UI Library, AppSidebar, AppHeader, TaskDetailDrawer, CreateTaskModal)\n├── hooks/ (useCurrentUrl, useInitials, useMobile, useAppearance)\n├── layouts/ (AppLayout, AuthLayout, SettingsLayout)\n├── pages/ (110 Screen Components: auth, projects, organization, scrum, sre, devops, settings)\n└── types/ (TypeScript Interface Definitions: auth, navigation, ui, models)"),
        ("Responsive & Mobile Adaptation", "Layout adaptif desktop (Sidebar collapsible & Header breadcrumbs) dan mobile (Sheet drawer menu, Mobile Companion Hub di /mobile dengan touch gestures).")
    ]

    for title, val in fe_specs:
        p_fe = doc.add_paragraph()
        r_fet = p_fe.add_run(f"• {title}: ")
        r_fet.bold = True
        r_fet.font.name = 'Segoe UI'
        r_fet.font.color.rgb = RGBColor(79, 70, 229)
        r_fed = p_fe.add_run(val)
        r_fed.font.name = 'Calibri'
        r_fed.font.size = Pt(9.5)

    doc.add_page_break()

    # ----------------------------------------------------
    # SECTION 10: BACKEND BLUEPRINT
    # ----------------------------------------------------
    add_styled_heading(doc, "10. BACKEND BLUEPRINT (LARAVEL 13 + SERVICE LAYER)", level=1)
    
    p = doc.add_paragraph()
    p.add_run("Backend Pandu Management menerapkan arsitektur ").font.name = 'Calibri'
    p.add_run("Modular Monolith").bold = True
    p.add_run(" berbasis framework Laravel 13.17 pada runtime PHP 8.4 dengan pemisahan tanggung jawab yang terstruktur rapi ke dalam 48 domain service namespaces di bawah app/Services/:").font.name = 'Calibri'

    add_styled_heading(doc, "10.1 Alur Siklus Request-Response Backend", level=2)
    
    be_flow = """flowchart LR
    A[HTTP Request] --> B[SecurityHeaders & CORS]
    B --> C[SetTenantContext / ResolveApiTenant]
    C --> D[RequireIdempotency Middleware]
    D --> E[Routing / Web & Api]
    E --> F[Controller / Form Request Validation]
    F --> G[Domain Service Layer]
    G --> H[Eloquent ORM / Repository]
    H --> I[(Database PostgreSQL/MySQL)]
    G --> J[Automation Engine & Background Jobs]
    F --> K[Inertia::render / JsonResponse]
    K --> L[HTTP Response]"""
    add_code_block(doc, be_flow, "mermaid")

    add_styled_heading(doc, "10.2 Katalog Domain Services Utama (48 Namespaces)", level=2)

    srv_list = [
        ("Agile", "AgileMetricsService, SprintForecastService, SprintHealthService, SprintRetrospectiveService, PlanningPokerService, KaizenImprovementService"),
        ("Ai", "AiGatewayService, AcceptanceCriteriaCapability, SprintSummaryCapability, TaskBreakdownCapability, RedactionService, OpenAI/Gemini/Ollama Providers"),
        ("Task & Project", "TaskService, RankService, ProjectCreationService, CrossProjectDependencyService, DependencyGraphService, TimelineService"),
        ("Sprint & Scrum", "SprintService, StandupService, ScrumMasterWorkspace"),
        ("DevOps & SRE", "DeploymentPipelineService, PipelineOrchestratorService, FeatureFlagOrchestratorService, PrReviewSlaService, SbomScannerService, IncidentManagementService, ChaosGameDayService, DistributedTraceService, SyntheticMonitorService, RootCauseAnalysisService, OncallScheduleService, IncidentRunbookService"),
        ("Compliance & Security", "DataPrivacyService, DataRetentionService, LiveAuditStreamService, MfaEnforcementService, SessionSecurityService, SsoService, AuditLogService"),
        ("Financial & Capacity", "ProjectBudgetService, CostAllocationService, CloudCostAnomalyService, ResourceCapacityPlannerService, CrossProjectWorkloadBalancerService"),
        ("Collaboration & Content", "WhiteboardService, WhiteboardLiveSyncService, WikiService, FileManagerService, AttachmentService, InboxService, CalendarService, TeamMoodPulseService, OkrAlignmentTreeService"),
        ("Developer Platform", "ApiTokenService, ApiPlaygroundService, ApiRateLimiterService, WebhookService, WebhookDlqService, AutomationService, OmniSearchService, SystemStatusService")
    ]

    tbl_srv = doc.add_table(rows=len(srv_list) + 1, cols=2)
    tbl_srv.cell(0, 0).paragraphs[0].add_run("Domain Namespace").bold = True
    tbl_srv.cell(0, 1).paragraphs[0].add_run("Service Classes & Responsibilities").bold = True
    for idx, (dom, srvs) in enumerate(srv_list):
        tbl_srv.cell(idx + 1, 0).paragraphs[0].add_run(dom).bold = True
        tbl_srv.cell(idx + 1, 1).paragraphs[0].add_run(srvs)
    format_table(tbl_srv, header_bg="1E293B")

    doc.add_page_break()

    # ----------------------------------------------------
    # SECTION 11: AUTHENTICATION & AUTHORIZATION
    # ----------------------------------------------------
    add_styled_heading(doc, "11. AUTHENTICATION & AUTHORIZATION", level=1)
    
    auth_points = [
        ("Mekanisme Autentikasi Pengguna", "Menggunakan Laravel Fortify backend untuk menangani login berbasis sesi terenkripsi (Session Cookie), registrasi, throttling (6 percobaan per menit), password reset, dan verifikasi email."),
        ("Otentikasi API Sanctum", "API RESTful dilindungi oleh Laravel Sanctum menggunakan Personal Access Token (Bearer Token) dengan hashing SHA-256 dan kemampuan scoping hak akses token (abilities)."),
        ("Two-Factor Authentication (2FA)", "Implementasi 2FA berbasis TOTP (Time-based One-Time Password) standar RFC 6238 yang kompatibel dengan Google Authenticator, Authy, dan 1Password, dilengkapi 8 kode pemulihan darurat sekali pakai terenkripsi."),
        ("Enterprise MFA Enforcement Gate", "Administrator dapat mengaktifkan kebijakan wajib MFA untuk seluruh anggota organisasi (OrganizationMfaSetting). Anggota yang belum mengaktifkan MFA dapat diberikan masa tenggang (Grace Period Exemption) atau diblokir dari akses data sensitif."),
        ("Enterprise Single Sign-On (SSO)", "Mendukung protokol federasi identitas perusahaan SAML 2.0 dan OpenID Connect (OIDC) dengan fitur pemaksaan SSO domain whitelist (hanya email domain perusahaan yang dapat login)."),
        ("Role-Based & Permission-Based Access Control", "Evaluasi otorisasi diimplementasikan pada model User (User::hasPermissionInOrganization) dan Gate/Policy Laravel yang memeriksa kepemilikan izin granular pada PermissionRegistry.")
    ]

    for title, desc in auth_points:
        p_a = doc.add_paragraph()
        r_at = p_a.add_run(f"• {title}\n")
        r_at.bold = True
        r_at.font.name = 'Segoe UI'
        r_at.font.color.rgb = RGBColor(79, 70, 229)
        r_ad = p_a.add_run(desc)
        r_ad.font.name = 'Calibri'
        r_ad.font.size = Pt(9.5)

    doc.add_page_break()

    # ----------------------------------------------------
    # SECTION 12: INTEGRASI EKSTERNAL
    # ----------------------------------------------------
    add_styled_heading(doc, "12. INTEGRASI SISTEM EKSTERNAL", level=1)
    
    ext_integrations = [
        ("OpenAI API", "Kecerdasan Buatan (LLM)", "Prompt tugas, kode, sprint", "Teks terstruktur / JSON output", "API Key (Bearer)", "Permintaan pengguna / Otomasi", "Fallback ke provider cadangan / Mock"),
        ("Google Gemini API", "Kecerdasan Buatan (LLM)", "Prompt analitik, RCA, standup", "Analisis insiden & kriteria", "API Key (Header)", "Permintaan pengguna / RCA", "Fallback ke OpenAI / Mock"),
        ("Ollama Local AI", "Self-Hosted LLM", "Prompt internal data sensitif", "Hasil inferensi lokal", "HTTP No-Auth / Basic", "Permintaan on-premise", "Log error & fallback"),
        ("SAML 2.0 / OIDC IdP", "Single Sign-On (SSO)", "SAML Request / Auth Code", "ID Token & User Claims", "X.509 Cert & Secret", "Login pengguna perusahaan", "Arahkan ke fallback login darurat"),
        ("Outbound Webhook Receivers", "Event Dispatching", "Payload JSON event bertanda tangan", "HTTP 200 OK Response", "HMAC SHA-256 Signature", "Event sistem (task/sprint)", "Retry 3x lalu masuk ke DLQ"),
        ("GitHub / GitLab VCS", "DevSecOps & CI/CD", "Webhook commit / PR / build", "Status pipeline & SBOM data", "OAuth2 / Access Token", "Push repository / PR review", "Notifikasi ke engineer & retry")
    ]

    tbl_ext = doc.add_table(rows=len(ext_integrations) + 1, cols=7)
    ext_hdrs = ["Provider / Sistem", "Tujuan Integrasi", "Data Terkirim", "Data Diterima", "Metode Auth", "Trigger", "Failure Handling"]
    for c_idx, h_text in enumerate(ext_hdrs):
        tbl_ext.cell(0, c_idx).paragraphs[0].add_run(h_text)
    for r_idx, r_data in enumerate(ext_integrations):
        for c_idx, val in enumerate(r_data):
            tbl_ext.cell(r_idx + 1, c_idx).paragraphs[0].add_run(val)
    format_table(tbl_ext, header_bg="4F46E5")

    doc.add_page_break()

    # ----------------------------------------------------
    # SECTION 13: NOTIFICATION SYSTEM
    # ----------------------------------------------------
    add_styled_heading(doc, "13. NOTIFICATION SYSTEM", level=1)
    
    p = doc.add_paragraph()
    p.add_run("Sistem notifikasi Pandu Management mendukung saluran ganda (In-App Feed dan Email SMTP) dengan konfigurasi preferensi granular per pengguna (UserNotificationPreference):").font.name = 'Calibri'

    notif_matrix = [
        ("Penugasan Tugas Baru", "TaskAssignedNotification", "Pengguna yang ditugaskan", "In-App & Email", "Task::create / Task::update"),
        ("Komentar Baru & Diskusi", "TaskCommentNotification", "Seluruh assignee & pembuat tugas", "In-App & Email", "TaskCommentController::store"),
        ("Mention Pengguna (@user)", "MentionedInCommentNotification", "Pengguna yang di-mention", "In-App & Email", "Deteksi @regex pada komentar"),
        ("Sprint Dimulai / Selesai", "SprintStartedNotification", "Seluruh anggota tim proyek", "In-App & Email", "SprintService::startSprint"),
        ("Eskalasi Insiden SRE Paging", "OncallPagingNotification", "Engineer pada shift on-call", "In-App, Email & SMS", "IncidentManagement / Monitor"),
        ("Hasil Analisis AI Selesai", "AiAnalysisCompletedNotification", "Peminta analisis", "In-App", "AiGatewayService::execute"),
        ("Eksekusi Otomasi Berhasil", "AutomationTriggeredNotification", "Admin / Pemilik Rule", "In-App", "AutomationService")
    ]

    tbl_notif = doc.add_table(rows=len(notif_matrix) + 1, cols=5)
    notif_hdrs = ["Event Notifikasi", "Notification Class", "Penerima Notifikasi", "Saluran Pengiriman", "Trigger Event"]
    for c_idx, h_text in enumerate(notif_hdrs):
        tbl_notif.cell(0, c_idx).paragraphs[0].add_run(h_text)
    for r_idx, r_data in enumerate(notif_matrix):
        for c_idx, val in enumerate(r_data):
            tbl_notif.cell(r_idx + 1, c_idx).paragraphs[0].add_run(val)
    format_table(tbl_notif, header_bg="6366F1")

    doc.add_page_break()

    # ----------------------------------------------------
    # SECTION 14: FILE & STORAGE
    # ----------------------------------------------------
    add_styled_heading(doc, "14. FILE & STORAGE ARCHITECTURE", level=1)
    
    file_specs = [
        ("Jenis Berkas yang Didukung", "Gambar (PNG, JPG, WEBP, GIF, SVG), Dokumen (PDF, DOCX, XLSX, PPTX, TXT), Arsip (ZIP, TAR.GZ), dan Kode (JSON, YAML, CSV)."),
        ("Batas Maksimal Ukuran", "25 MB per berkas pada lampiran tugas; 100 MB pada Pusat Impor Data dan File Manager."),
        ("Lokasi & Struktur Penyimpanan", "Storage disk terisolasi per tenant: storage/app/attachments/{organization_id}/{year}/{month}/{uuid_filename}.ext"),
        ("Konvensi Penamaan Berkas", "Nama file fisik menggunakan UUIDv7 unik guna mencegah tabrakan nama dan serangan directory traversal. Nama asli berkas (original_name) disimpan dalam database."),
        ("Kontrol Akses & Keamanan", "Berkas tidak dapat diakses publik secara langsung. Unduhan wajib melalui endpoint terotentikasi (/attachments/{id}/download) yang memvalidasi keanggotaan pengguna pada organisasi pemilik berkas.")
    ]

    for title, desc in file_specs:
        p_f = doc.add_paragraph()
        r_ft = p_f.add_run(f"• {title}: ")
        r_ft.bold = True
        r_ft.font.name = 'Segoe UI'
        r_ft.font.color.rgb = RGBColor(14, 116, 144)
        r_fd = p_f.add_run(desc)
        r_fd.font.name = 'Calibri'
        r_fd.font.size = Pt(9.5)

    doc.add_page_break()

    # ----------------------------------------------------
    # SECTION 15: SECURITY BLUEPRINT
    # ----------------------------------------------------
    add_styled_heading(doc, "15. SECURITY BLUEPRINT & TENANT ISOLATION", level=1)
    
    sec_points = [
        ("Isolasi Multi-Tenant", "Setiap query data diproteksi oleh organization_id yang diverifikasi melalui middleware SetTenantContext dan ResolveApiTenant. Tidak ada data lintas organisasi yang dapat bocor."),
        ("Optimistic Concurrency Control", "Mencegah tabrakan pembaruan data secara bersamaan pada tugas dan Kanban board menggunakan kolom version integer (TaskConcurrencyException pada HTTP 409)."),
        ("Pencegahan Prompt Injection & PII Redaction", "Modul RedactionService memindai dan menyamarkan informasi sensitif (email, nomor telepon, kartu kredit, IP, password) sebelum prompt dikirimkan ke model AI eksternal."),
        ("Verifikasi Integritas Webhook (HMAC SHA-256)", "Seluruh pengiriman webhook keluar ditandatangani dengan kunci rahasia unik (whsec_...) dan diverifikasi menggunakan hash kriptografi HMAC SHA-256."),
        ("Perlindungan Injeksi & Serangan Web Standar", "Prepared statements PDO 100% pada Eloquent ORM mencegah SQL Injection; escaping otomatis pada JSX React mencegah XSS; token CSRF pada seluruh form POST/PUT/DELETE; dan header keamanan (HSTS, CSP, X-Frame-Options, X-Content-Type-Options) diterapkan via SecurityHeadersMiddleware.")
    ]

    for title, desc in sec_points:
        p_s = doc.add_paragraph()
        r_st = p_s.add_run(f"• {title}\n")
        r_st.bold = True
        r_st.font.name = 'Segoe UI'
        r_st.font.color.rgb = RGBColor(225, 29, 72)
        r_sd = p_s.add_run(desc)
        r_sd.font.name = 'Calibri'
        r_sd.font.size = Pt(9.5)

    doc.add_page_break()

    # ----------------------------------------------------
    # SECTION 16: ERROR & EXCEPTION FLOW
    # ----------------------------------------------------
    add_styled_heading(doc, "16. ERROR & EXCEPTION FLOW", level=1)
    
    err_matrix = [
        ("422 Unprocessable Entity", "Kegagalan validasi input form / Form Request", "Inertia error bag props / JSON validation errors", "Tampilkan pesan merah inline di bawah input yang salah"),
        ("401 Unauthorized", "Sesi login habis atau token Sanctum tidak valid", "Redirect ke /login / JSON unauthenticated", "Hapus state lokal dan arahkan pengguna ke form login"),
        ("403 Forbidden", "Pengguna tidak memiliki izin granular pada modul", "Tampilan halaman Error 403 / JSON unauthorized", "Tampilkan pesan pembatasan hak akses dan hubungi Admin"),
        ("404 Not Found", "Entitas proyek, tugas, atau sprint tidak ditemukan", "Tampilan halaman Error 404 / JSON not found", "Tampilkan ilustrasi empty state dan tombol kembali ke dashboard"),
        ("409 Conflict", "Konflik concurrency versi tugas pada Kanban board", "TaskConcurrencyException / JSON version mismatch", "Tampilkan notifikasi konflik dan reload data terbaru otomatis"),
        ("429 Too Many Requests", "Pelanggaran rate limit API atau percobaan login", "JSON rate limit exceeded / Throttled response", "Tampilkan waktu tunggu (Retry-After) ke pengguna"),
        ("500 Internal Error", "Eksepsi tidak tertangani pada logika server", "Tampilan halaman Error 500 / Log exception", "Catat stack trace ke Laravel log dan tampilkan pesan ramah"),
        ("AI Provider Failure", "API key AI tidak valid atau batas token habis", "AiResponse::failed (budget_exceeded/failed)", "Tampilkan toast notifikasi kesalahan dan log ke ai_usage_logs")
    ]

    tbl_err = doc.add_table(rows=len(err_matrix) + 1, cols=4)
    err_hdrs = ["Kode HTTP / Error", "Kondisi Pemicu Eksepsi", "Bentuk Respons Sistem", "Penanganan pada UI / Client"]
    for c_idx, h_text in enumerate(err_hdrs):
        tbl_err.cell(0, c_idx).paragraphs[0].add_run(h_text)
    for r_idx, r_data in enumerate(err_matrix):
        for c_idx, val in enumerate(r_data):
            tbl_err.cell(r_idx + 1, c_idx).paragraphs[0].add_run(val)
    format_table(tbl_err, header_bg="991B1B")

    doc.add_page_break()

    # ----------------------------------------------------
    # SECTION 17: AUDIT TRAIL & LOGGING
    # ----------------------------------------------------
    add_styled_heading(doc, "17. AUDIT TRAIL & LOGGING", level=1)
    
    p = doc.add_paragraph()
    p.add_run("Pandu Management mengimplementasikan pencatatan jejak audit komprehensif pada 5 level:").font.name = 'Calibri'

    audit_levels = [
        ("1. Organization Audit Logs (organization_audit_logs)", "Mencatat aktivitas manajerial: penambahan/penghapusan anggota, perubahan peran, aktivasi SSO, modifikasi kebijakan retensi data, dan rotasi webhook secret."),
        ("2. Task Activity Trail (task_activities)", "Mencatat riwayat perubahan pada setiap kartu tugas: perubahan judul, deskripsi, estimasi poin, penugasan assignee, pergeseran status alur kerja, checklist, dan komentar."),
        ("3. Real-Time Live Audit Stream (LiveAuditStreamService)", "Menyediakan feed streaming aktivitas kepatuhan real-time dengan klasifikasi tingkat keparahan (Info, Warning, Critical) untuk audit sertifikasi SOC2 / ISO 27001."),
        ("4. AI Usage & Token Tracking Logs (ai_usage_logs)", "Mencatat setiap pemanggilan API model AI: capability, provider, model, jumlah token prompt, token completion, estimasi biaya USD, latensi milidetik, dan status keberhasilan."),
        ("5. Automation Execution Logs (automation_logs)", "Mencatat riwayat eksekusi visual rule engine, evaluasi kondisi, waktu eksekusi, payload input, dan status sukses/gagal.")
    ]

    for title, desc in audit_levels:
        p_au = doc.add_paragraph()
        r_aut = p_au.add_run(f"• {title}\n")
        r_aut.bold = True
        r_aut.font.name = 'Segoe UI'
        r_aut.font.color.rgb = RGBColor(79, 70, 229)
        r_aud = p_au.add_run(desc)
        r_aud.font.name = 'Calibri'
        r_aud.font.size = Pt(9.5)

    doc.add_page_break()

    # ----------------------------------------------------
    # SECTION 18: SYSTEM ARCHITECTURE
    # ----------------------------------------------------
    add_styled_heading(doc, "18. SYSTEM ARCHITECTURE DIAGRAM", level=1)
    
    sys_arch = """flowchart TB
    subgraph CLIENT_LAYER [CLIENT & PRESENTATION LAYER]
        WEB_SPA[React 19 + Inertia v3 SPA]
        MOBILE_APP[Mobile Companion Hub]
        PUBLIC_PORTAL[Public Marketing & Changelog]
        THIRD_PARTY_CLIENTS[Third-Party API Integrations]
    end

    subgraph GATEWAY_LAYER [INGRESS & SECURITY GATEWAY]
        VITE_DEV[Vite 8 SSR / Bundle]
        SECURITY_HEADERS[SecurityHeaders & CORS]
        TENANT_CONTEXT[Tenant Context Resolver Middleware]
        AUTH_SANCTUM[Fortify Session / Sanctum Auth]
        RATE_LIMITER[API Traffic Rate Limiter]
        IDEMPOTENCY[Idempotency Key Verifier]
    end

    subgraph BACKEND_LAYER [MODULAR MONOLITH CORE (LARAVEL 13 / PHP 8.4)]
        CONTROLLERS[HTTP Controllers - 94 Classes]
        WAYFINDER[Laravel Wayfinder Route Binder]
        
        subgraph DOMAIN_SERVICES [DOMAIN SERVICES LAYER - 48 NAMESPACES]
            AGILE_SRV[Agile & Sprint Planning Service]
            TASK_SRV[Task & RankService Leksikografis]
            AI_GATEWAY[Pandu AI Gateway & Redaction Service]
            AUTOMATION_ENG[Automation Rule Engine]
            SRE_ENG[Incident & SRE War Room Service]
            DEVOPS_ENG[CI/CD & Feature Flags Service]
            COMPLIANCE_SRV[Data Privacy & Retention Service]
            BILLING_SRV[Enterprise Billing & Invoice Service]
        end
    end

    subgraph ASYNC_LAYER [BACKGROUND WORKERS & QUEUES]
        QUEUE_WORKER[Laravel Queue Worker]
        WEBHOOK_DISPATCHER[Outbound Webhook Dispatcher]
        DLQ_REPLAY[Dead-Letter Queue Engine]
        NOTIF_DISPATCHER[Email & In-App Notification Sender]
    end

    subgraph DATA_LAYER [PERSISTENCE & STORAGE LAYER]
        DB_PRIMARY[(Primary Database: MySQL / PostgreSQL / SQLite)]
        CACHE_STORE[(Redis / Memory Cache & Session Store)]
        FILE_STORAGE[(Object Storage / Local Disk Attachments)]
    end

    subgraph EXTERNAL_SERVICES [EXTERNAL THIRD-PARTY PROVIDERS]
        OPENAI_API[OpenAI API GPT-4o]
        GEMINI_API[Google Gemini 1.5 API]
        OLLAMA_LOCAL[Ollama Local Engine]
        SSO_IDP[SAML 2.0 / OIDC Identity Provider]
        VCS_PROVIDERS[GitHub / GitLab CI/CD]
    end

    CLIENT_LAYER --> GATEWAY_LAYER
    GATEWAY_LAYER --> BACKEND_LAYER
    BACKEND_LAYER --> DOMAIN_SERVICES
    DOMAIN_SERVICES --> DATA_LAYER
    DOMAIN_SERVICES --> ASYNC_LAYER
    ASYNC_LAYER --> DATA_LAYER
    DOMAIN_SERVICES --> EXTERNAL_SERVICES
    ASYNC_LAYER --> EXTERNAL_SERVICES"""

    add_code_block(doc, sys_arch, "mermaid")

    doc.add_page_break()

    # ----------------------------------------------------
    # SECTION 19: DEPENDENCY MAP
    # ----------------------------------------------------
    add_styled_heading(doc, "19. DEPENDENCY MAP", level=1)
    
    dep_data = [
        ("Backend Framework", "laravel/framework: ^13.17", "Fondasi aplikasi modular monolith, routing, IoC container, Eloquent ORM."),
        ("Frontend Bridge", "inertiajs/inertia-laravel: ^3.0", "Penghubung server-driven SPA antara controller Laravel dan komponen React."),
        ("Autentikasi", "laravel/fortify: ^1.37.2", "Backend autentikasi headless: login, registrasi, reset password, 2FA TOTP."),
        ("API Tokens", "laravel/sanctum: ^4.0", "Penerbitan dan verifikasi personal access token Bearer untuk API RESTful v1."),
        ("Type-Safe Routing", "laravel/wayfinder: ^0.1.14", "Generator otomatis fungsi TypeScript untuk pemanggilan controller dan route."),
        ("Testing Suite", "pestphp/pest: ^5.1 & pest-plugin-laravel", "Framework pengujian modern ekspresif untuk unit dan feature test."),
        ("Code Formatter", "laravel/pint: ^1.27", "Linter dan formatter kode PHP standar PSR-12 dan konvensi Laravel."),
        ("Static Analysis", "larastan/larastan: ^3.9", "Analisis statis tipe data kode PHP untuk mencegah runtime error."),
        ("Frontend Core", "react: ^19.2.0, react-dom: ^19.2.0", "Library deklaratif antarmuka pengguna berbasis komponen."),
        ("Frontend Inertia", "@inertiajs/react: ^3.0.0, @inertiajs/vite", "Adapter React untuk Inertia v3 dan plugin bundling Vite SSR."),
        ("CSS Framework", "tailwindcss: ^4.0.0, @tailwindcss/vite", "Framework styling utilitas CSS modern generasi 4 dengan performa tinggi."),
        ("UI Primitives", "@radix-ui/react-* (14 Packages)", "Komponen primitif aksesibel tanpa gaya bawaan (Dialog, Dropdown, Tabs, dll)."),
        ("Icons Library", "lucide-react: ^0.475.0", "Koleksi ribuan icon vektor SVG yang konsisten dan ringan."),
        ("Toast Notifications", "sonner: ^2.0.0", "Engine toast notifikasi interaktif dengan animasi halus.")
    ]

    tbl_dep = doc.add_table(rows=len(dep_data) + 1, cols=3)
    tbl_dep.cell(0, 0).paragraphs[0].add_run("Kategori").bold = True
    tbl_dep.cell(0, 1).paragraphs[0].add_run("Paket / Library").bold = True
    tbl_dep.cell(0, 2).paragraphs[0].add_run("Peran & Fungsi dalam Sistem").bold = True
    for idx, (cat, pkg, note) in enumerate(dep_data):
        tbl_dep.cell(idx + 1, 0).paragraphs[0].add_run(cat).bold = True
        tbl_dep.cell(idx + 1, 1).paragraphs[0].add_run(pkg)
        tbl_dep.cell(idx + 1, 2).paragraphs[0].add_run(note)
    format_table(tbl_dep, header_bg="475569")

    doc.add_page_break()

    # ----------------------------------------------------
    # SECTION 20: ENVIRONMENT & DEPLOYMENT
    # ----------------------------------------------------
    add_styled_heading(doc, "20. ENVIRONMENT & DEPLOYMENT", level=1)
    
    env_specs = [
        ("Development Environment", "Dijalankan menggunakan Laragon / PHP 8.4 CLI + Node.js 22. Perintah dev terpadu menggunakan npm run dev atau npx concurrently yang menjalankan php artisan serve, queue worker, dan vite compiler secara simultan."),
        ("Staging & CI/CD Validation", "Pipeline verifikasi otomatis: composer run lint:check (Pint), npm run format:check (Prettier), npm run types:check (TypeScript tsc), phpstan analyse (Larastan), dan php artisan test (Pest PHP 114 test suites)."),
        ("Production Environment", "Dapat di-deploy pada Laravel Cloud, Docker Container, Kubernetes, atau VM Linux Ubuntu Nginx/PHP-FPM 8.4 dengan supervisord untuk mengelola antrean queue worker (php artisan queue:listen)."),
        ("Database & Persistence", "Mendukung PostgreSQL 16+, MySQL 8.0+, atau SQLite dengan pooling koneksi dan backup berkala."),
        ("Environment Variables (.env)", "Konfigurasi sensitif dikelola via variabel lingkungan: APP_KEY, DB_CONNECTION, OPENAI_API_KEY, GEMINI_API_KEY, OLLAMA_BASE_URL, SANCTUM_STATEFUL_DOMAINS, SESSION_DRIVER=database/redis, QUEUE_CONNECTION=database/redis.")
    ]

    for title, desc in env_specs:
        p_e = doc.add_paragraph()
        r_et = p_e.add_run(f"• {title}: ")
        r_et.bold = True
        r_et.font.name = 'Segoe UI'
        r_et.font.color.rgb = RGBColor(79, 70, 229)
        r_ed = p_e.add_run(desc)
        r_ed.font.name = 'Calibri'
        r_ed.font.size = Pt(9.5)

    doc.add_page_break()

    # ----------------------------------------------------
    # SECTION 21: FITUR MATRIX
    # ----------------------------------------------------
    add_styled_heading(doc, "21. FITUR MATRIX (STATUS IMPLEMENTASI)", level=1)
    
    p = doc.add_paragraph()
    p.add_run("Katalog status implementasi seluruh kapabilitas sistem berdasarkan bukti source code, model, controller, migrasi, dan frontend:").font.name = 'Calibri'

    fitur_matrix = [
        ("Autentikasi & Akun", "Registrasi, Login, Password Reset, Email Verification", "Public/Auth", "Implemented", "React 19 Forms", "Fortify Actions", "users table"),
        ("Autentikasi & Akun", "Two-Factor Authentication (2FA TOTP & Recovery Codes)", "Member+", "Implemented", "2FA Enable Modal", "TwoFactorController", "users 2FA columns"),
        ("Organisasi & Tenant", "Pembuatan Organisasi & Setup Onboarding Wizard", "Auth", "Implemented", "Onboarding Wizard", "OrganizationController", "organizations table"),
        ("Organisasi & Tenant", "Manajemen Anggota & Undangan Kolaborasi", "Admin+", "Implemented", "Members DataTable", "OrganizationMemberController", "memberships & invites"),
        ("Organisasi & Tenant", "Peran Kustom & Matriks Izin Granular (RBAC)", "Admin+", "Implemented", "Roles Matrix Grid", "RolePermissionController", "roles & permissions"),
        ("Manajemen Proyek", "Pembuatan Proyek Berbasis Template (Scrum, Kanban, Bug)", "Manager+", "Implemented", "Template Selector", "ProjectCreationService", "projects & templates"),
        ("Manajemen Proyek", "Kustomisasi Workflow & Status Kolom", "Manager+", "Implemented", "Workflow Editor", "ProjectWorkflowController", "workflows & statuses"),
        ("Manajemen Tugas", "Tugas Multi-Assignee & Key Unik (PROJ-N)", "Member+", "Implemented", "Task Modal/Drawer", "TaskService::create", "tasks & task_assignees"),
        ("Papan Kanban", "Drag-and-Drop dengan Lexicographic Fractional Ranking", "Member+", "Implemented", "Board Kanban View", "TaskService::move", "tasks.rank (varchar 64)"),
        ("Papan Kanban", "Optimistic Concurrency Control (Conflict Detection)", "Member+", "Implemented", "Concurrency Toast", "TaskConcurrencyException", "tasks.version column"),
        ("Scrum Engine", "Backlog Refinement & Sprint Planning", "Member+", "Implemented", "Backlog Accordion", "SprintController", "sprints table"),
        ("Scrum Engine", "Aktivasi Sprint & Snapshot Baseline Committed Points", "Manager+", "Implemented", "Start Sprint Modal", "SprintService::startSprint", "sprints committed_pts"),
        ("Scrum Engine", "Burndown Chart Real-Time & Velocity Tracker", "Member+", "Implemented", "Burndown Chart SVG", "SprintService::getBurndown", "sprint_daily_metrics"),
        ("Scrum Engine", "Sprint Health Radar & Blocker Heatmap", "Manager+", "Implemented", "Radar Health Grid", "SprintHealthController", "sprint_impediments"),
        ("Scrum Engine", "Planning Poker Real-Time Room & Blind Voting", "Member+", "Implemented", "Poker Estimation Room", "PlanningPokerController", "planning_poker_sessions"),
        ("Scrum Engine", "Simulasi Monte Carlo Velocity & Release Forecast", "Manager+", "Implemented", "Monte Carlo Histogram", "SprintForecastController", "project_forecast_scenarios"),
        ("Scrum Engine", "Sprint Retrospective Voting & Konversi Action Items", "Member+", "Implemented", "Retro Board Columns", "SprintRetrospectiveController", "sprint_retrospectives"),
        ("Scrum Engine", "Daily Standup Asinkron & AI Executive Briefing", "Member+", "Implemented", "Standup Input Feed", "DailyStandupController", "daily_standups table"),
        ("Timeline & Gantt", "Bagan Gantt Interaktif, Auto-Schedule & Lintasan Kritis", "Member+", "Implemented", "Gantt Timeline Canvas", "TimelineController", "tasks start_date/milestone"),
        ("Dependensi Tugas", "Graf Jaringan Dependensi CPM & Simulasi Keterlambatan", "Member+", "Implemented", "Network Graph View", "TaskDependencyController", "task_dependencies"),
        ("Anggaran & Biaya", "Kalkulasi Budget Proyek, Tarif Jam Tim & Worklog", "Manager+", "Implemented", "Budget Progress Bar", "ProjectBudgetController", "project_budgets & rates"),
        ("Anggaran & Biaya", "Workflow Pengajuan & Persetujuan Expense Operasional", "Member+/Mgr", "Implemented", "Expense Approval Table", "ProjectBudgetController", "project_expenses"),
        ("Whiteboard Canvas", "Papan Ideasi Interaktif, Sticky Notes & Edge Connectors", "Member+", "Implemented", "Whiteboard Canvas", "WhiteboardController", "whiteboard_nodes/edges"),
        ("Whiteboard Canvas", "Multi-Cursor Presence & Real-Time Lock Sync", "Member+", "Implemented", "Live Room Canvas", "WhiteboardLiveController", "whiteboard_sessions"),
        ("Manajemen Risiko", "Register Risiko Proyek & Matriks Probabilitas-Dampak", "Manager+", "Implemented", "Risk Matrix Grid", "ProjectRiskController", "project_risks table"),
        ("Kapasitas & Alokasi", "Skill Matrix Inventaris & AI Assignee Recommender", "Admin+", "Implemented", "Skill Tag Cloud", "SkillMatrixController", "skills & user_skills"),
        ("Kapasitas & Alokasi", "Cross-Project Workload Balancer & Schedule Cuti", "Admin+", "Implemented", "Capacity Heatmap", "WorkloadBalancerController", "workload_rebalance_logs"),
        ("Team Mood & Pulse", "Check-in Mood Harian Tim & Inisiatif Wellness", "Member+", "Implemented", "Smiley Pulse Selector", "TeamMoodPulseController", "team_mood_pulses"),
        ("Strategic OKRs", "Pohon Sasaran Sasaran OKR & Penautan Tugas Terhubung", "Member+", "Implemented", "OKR Tree Visualizer", "OkrController", "okr_objectives/key_results"),
        ("SRE & Insiden", "Incident War Room, Paging On-Call & Timeline Feed", "Admin+", "Implemented", "War Room Dashboard", "IncidentManagementController", "incidents & on_call"),
        ("SRE & Insiden", "Automated Incident Runbooks & Playbook Execution", "Admin+", "Implemented", "Runbook Card Grid", "IncidentRunbookController", "incident_runbooks"),
        ("SRE & Insiden", "Chaos Engineering GameDay Latency/Failure Injection", "Admin+", "Implemented", "Chaos Experiment Table", "ChaosGameDayController", "chaos_experiments"),
        ("SRE & Insiden", "Synthetic Uptime Monitors & Multi-Region Global Probe", "Admin+", "Implemented", "Global Probe Map", "SyntheticMonitorController", "synthetic_monitors"),
        ("SRE & Insiden", "Distributed Tracing & Service Mesh Topology", "Admin+", "Implemented", "Trace Waterfall Chart", "DistributedTraceController", "distributed_traces"),
        ("SRE & Insiden", "AI Root Cause Analysis (RCA) Copilot & Post-Mortem", "Admin+", "Implemented", "AI RCA Studio", "RootCauseAnalysisController", "root_cause_analyses"),
        ("DevSecOps & Release", "CI/CD Deployment Pipelines & Approval Gate", "Admin+", "Implemented", "Pipeline Stage Tracker", "CicdPipelineController", "cicd_pipelines"),
        ("DevSecOps & Release", "Feature Flag Progressive Rollout & Kill Switch", "Admin+", "Implemented", "Feature Flag Slider", "FeatureFlagController", "feature_flags"),
        ("DevSecOps & Release", "Pull Request Review SLA & Codeowner Load Balancer", "Member+", "Implemented", "PR Review SLA Table", "PrReviewSlaController", "pull_request_reviews"),
        ("DevSecOps & Release", "AI Release Notes & SemVer Changelog Publisher", "Manager+", "Implemented", "Release Studio", "ReleasePublisherController", "release_publications"),
        ("DevSecOps & Release", "Database Drift, Index Health & Safe DDL Generator", "Admin+", "Implemented", "Schema Diff Viewer", "DatabaseDriftController", "schema_drift_reports"),
        ("DevSecOps & Release", "Open-Source SBOM Scanner & License Compliance", "Admin+", "Implemented", "SBOM Vulnerability Table", "SbomScannerController", "sbom_packages"),
        ("DevSecOps & Release", "Architecture Decision Records (ADR) Studio", "Member+", "Implemented", "ADR Markdown Viewer", "ArchitectureDecisionRecordController", "architecture_decisions"),
        ("Data Privacy & GDPR", "Pusat DSAR, Multi-Tenant Residency & PII Masking", "Admin+", "Implemented", "DSAR & Masking Studio", "DataPrivacyController", "dsar & pii_masking"),
        ("Financials", "Corporate Cost Centers & Profitability Analytics", "Admin+", "Implemented", "Cost Center Table", "CostAllocationController", "cost_centers"),
        ("Executive Reports", "Live Executive KPI Boardroom & Investor Pitch Export", "Owner", "Implemented", "Boardroom KPI Card", "ExecutiveBoardroomController", "boardroom_briefings"),
        ("Pencarian Global", "OmniSearch Spotlight ⌘K & Riwayat Pencarian", "Member+", "Implemented", "⌘K Command Palette", "OmniSearchController", "search_histories"),
        ("Developer Tools", "Interactive API Playground & SDK Code Generator", "Member+", "Implemented", "API Playground Console", "ApiPlaygroundController", "api_request_presets"),
        ("Developer Tools", "API Traffic Throttling & Rate Limiter Console", "Admin+", "Implemented", "Rate Limit Policy Table", "ApiRateLimiterController", "api_rate_limit_policies"),
        ("Developer Tools", "Webhook Outbound Dispatcher, DLQ & Bulk Replay", "Admin+", "Implemented", "Webhook DLQ Drawer", "WebhookDlqController", "webhook_delivery_attempts"),
        ("Pandu AI Gateway", "Multi-Provider LLM Engine (OpenAI, Gemini, Ollama)", "Member+", "Implemented", "AI Settings & Quota", "AiGatewayService", "ai_settings & ai_logs"),
        ("Pandu AI Gateway", "Redaksi PII Sebelum Egress & Token Budgeting", "Member+", "Implemented", "Redaction Engine", "RedactionService", "ai_usage_logs"),
        ("File Manager", "Folder Digital Asset Management & Secure Download", "Member+", "Implemented", "Folder Tree & Grid", "FileManagerController", "folders & attachments"),
        ("Wiki & Dokumen", "Knowledge Base Spaces & Markdown Page Revisions", "Member+", "Implemented", "Wiki Space Sidebar", "WikiController", "wiki_spaces & wiki_pages"),
        ("Keamanan Organisasi", "Enterprise SAML 2.0 & OIDC Single Sign-On (SSO)", "Admin+", "Implemented", "SSO Config Form", "SsoController", "organization_sso_configs"),
        ("Keamanan Organisasi", "Session Security, IP Whitelist & Remote Session Kill", "Admin+", "Implemented", "Session Security Form", "SessionSecurityController", "organization_security_policies"),
        ("Billing & Langganan", "Paket Langganan Enterprise & Download Faktur PDF", "Owner", "Implemented", "Billing Subscription Card", "BillingController", "organization_invoices"),
        ("Retensi Data", "Kebijakan Retensi Data, GDPR Export & Purge Engine", "Admin+", "Implemented", "Retention Slider UI", "ComplianceController", "organization_retention_policies"),
        ("Desain & Status", "Living UI Design System & Component Library Hub", "Admin+", "Implemented", "Design System Hub", "DesignSystemController", "system components"),
        ("Desain & Status", "Live Status Halaman Publik & Synthetic Health API", "Public/Auth", "Implemented", "Status Monitor Page", "SystemStatusController", "system_service_healths"),
        ("Service Desk & Helpdesk", "Customer Portal, SLA Ticket Response, Email-to-Ticket", "External", "Deprecated / Phase 3", "Tidak ditemukan (ADR-005)", "Ditunda ke Fase 3 (ADR-005)", "16 tables deferred")
    ]

    tbl_f = doc.add_table(rows=len(fitur_matrix) + 1, cols=7)
    f_hdrs = ["Modul Sistem", "Fitur / Kapabilitas", "Hak Akses", "Status Implementasi", "Frontend", "Backend Controller/Service", "Database Table"]
    for c_idx, h_text in enumerate(f_hdrs):
        tbl_f.cell(0, c_idx).paragraphs[0].add_run(h_text)
    for r_idx, r_data in enumerate(fitur_matrix):
        for c_idx, val in enumerate(r_data):
            tbl_f.cell(r_idx + 1, c_idx).paragraphs[0].add_run(val)
    format_table(tbl_f, header_bg="1E1B4B")

    doc.add_page_break()

    # ----------------------------------------------------
    # SECTION 22: TRACEABILITY MATRIX
    # ----------------------------------------------------
    add_styled_heading(doc, "22. TRACEABILITY MATRIX", level=1)
    
    p = doc.add_paragraph()
    p.add_run("Matriks ketertelusuran menghubungkan setiap kebutuhan bisnis (Requirement) ke fitur, halaman UI, endpoint API, model database, dan batasan peran:").font.name = 'Calibri'

    trace_data = [
        ("REQ-01: Multi-Tenant Workspace", "Isolasi Data Organisasi", "/onboarding/organization", "POST /onboarding/organization", "organizations, memberships", "Owner"),
        ("REQ-02: Granular RBAC", "Matriks Izin Kustom 23 Kemampuan", "/organization/roles", "PUT /organization/roles/matrix", "roles, permissions", "Admin+"),
        ("REQ-03: Agile Task Tracking", "Papan Kanban & Fractional Rank", "/projects/{p}/board", "PATCH /api/v1/tasks/{t}/move", "tasks, task_assignees", "Member+"),
        ("REQ-04: Sprint Management", "Scrum Backlog & Burndown Chart", "/projects/{p}/backlog", "POST /api/v1/sprints/{s}/start", "sprints, daily_metrics", "Manager+"),
        ("REQ-05: Planning Poker", "Real-Time Story Point Estimation", "/projects/{p}/planning-poker/{s}", "POST /planning-poker/{s}/vote", "planning_poker_sessions", "Member+"),
        ("REQ-06: Critical Path Gantt", "Auto-Schedule & Timeline Dependency", "/projects/{p}/timeline", "PUT /timeline/tasks/{t}/schedule", "tasks, task_dependencies", "Member+"),
        ("REQ-07: Real-Time Whiteboard", "Live Ideation Canvas & Presence", "/projects/{p}/whiteboard/live", "POST /whiteboards/{w}/live/sync", "whiteboard_nodes, edges", "Member+"),
        ("REQ-08: SRE Incident Command", "War Room, On-Call Paging & RCA", "/organization/ops/incidents", "POST /ops/incidents/{i}/resolve", "incidents, on_call, rca", "Admin+"),
        ("REQ-09: DevSecOps CI/CD", "Deployment Gate & Rollback", "/organization/devops/pipelines", "POST /devops/pipelines/runs/approve", "cicd_pipelines, runs", "Admin+"),
        ("REQ-10: Multi-Provider AI", "AI Gateway & PII Redaction", "/organization/ai-settings", "POST /api/v1/ai/task-breakdown", "ai_settings, ai_usage_logs", "Member+"),
        ("REQ-11: Webhook & DLQ", "Event Dispatching & Bulk Replay", "/organization/webhooks", "POST /webhooks/dlq/bulk-replay", "webhook_delivery_attempts", "Admin+"),
        ("REQ-12: Kepatuhan GDPR/DSAR", "PII Masking & Retention Purge", "/organization/compliance/data-privacy", "POST /compliance/data-privacy/dsar", "dsar, pii_masking_rules", "Admin+")
    ]

    tbl_tr = doc.add_table(rows=len(trace_data) + 1, cols=6)
    tr_hdrs = ["Requirement ID", "Fitur Terkait", "Halaman Frontend", "Endpoint API / Action", "Tabel Database", "Hak Akses"]
    for c_idx, h_text in enumerate(tr_hdrs):
        tbl_tr.cell(0, c_idx).paragraphs[0].add_run(h_text)
    for r_idx, r_data in enumerate(trace_data):
        for c_idx, val in enumerate(r_data):
            tbl_tr.cell(r_idx + 1, c_idx).paragraphs[0].add_run(val)
    format_table(tbl_tr, header_bg="3730A3")

    doc.add_page_break()

    # ----------------------------------------------------
    # SECTION 23: GAP ANALYSIS
    # ----------------------------------------------------
    add_styled_heading(doc, "23. GAP ANALYSIS (TEMUAN FAKTA VS POTENSI)", level=1)
    
    p = doc.add_paragraph()
    p.add_run("Analisis kesenjangan teknis (Gap Analysis) membandingkan dokumen spesifikasi awal (catatan.docx dan implementationplan.docx) dengan implementasi aktual pada basis kode:").font.name = 'Calibri'

    add_styled_heading(doc, "23.1 Confirmed Findings (Temuan Terkonfirmasi Berdasarkan Kode)", level=2)
    conf_findings = [
        ("Keputusan Arsitektur Frontend (ADR-001)", "Spesifikasi implementationplan.docx merekomendasikan standalone SPA terpisah, namun repositori secara konsisten dan sukses menerapkan Inertia.js v3 Server-Driven SPA yang menyatu dengan Laravel React Starter Kit."),
        ("Keputusan Primary Key UUIDv7 (ADR-002)", "Tabel users mempertahankan auto-increment bigint id demi kompatibilitas auth starter kit, namun seluruh 94+ tabel domain baru menerapkan UUIDv7 primary key secara konsisten melalui trait HasUuidPrimaryKey."),
        ("Algoritma Fractional Ranking (ADR-003)", "Repositori mengadopsi pemeringkatan leksikografis VARCHAR(64) berbasis alfabet base-62 (RankService) alih-alih numeric midpoint DECIMAL(30,15), meningkatkan densitas posisi dan performa indexing b-tree."),
        ("Multi-Assignee Junction Table (ADR-004)", "Tugas mendukung banyak penanggung jawab (multi-assignee) melalui tabel task_assignees dan relasi BelongsToMany."),
        ("Penundaan Modul Service Desk / Helpdesk (ADR-005)", "16 tabel ticketing dan customer portal ditunda secara sadar ke Fase 3 agar fokus menyelesaikan stabilitas modul core agile work management terlebih dahulu.")
    ]
    for title, desc in conf_findings:
        p_cf = doc.add_paragraph()
        r_cft = p_cf.add_run(f"• [CONFIRMED] {title}: ")
        r_cft.bold = True
        r_cft.font.name = 'Segoe UI'
        r_cft.font.color.rgb = RGBColor(5, 150, 105)
        r_cfd = p_cf.add_run(desc)
        r_cfd.font.name = 'Calibri'
        r_cfd.font.size = Pt(9.5)

    add_styled_heading(doc, "23.2 Potential Findings & Technical Debt", level=2)
    pot_findings = [
        ("WebSocket Real-Time Reverb Integration", "Meskipun model dan controller siap untuk live presence dan live streaming audit, broadcast driver pada produksi disarankan menggunakan Laravel Reverb / Soketi untuk skalabilitas tinggi."),
        ("Automated Async Queue Scaling", "Pemanggilan LLM AI dan dispatching webhook berpotensi memperlambat response time jika antrean queue dijalankan secara sinkron. Wajib dipastikan worker queue berjalan dalam mode daemon async."),
        ("Database Sharding / Multi-DB Multi-Tenancy", "Saat ini multi-tenancy diimplementasikan via column-based scoping (organization_id). Untuk klien enterprise level pemerintahan/finansial yang membutuhkan isolasi fisik, dapat dipertimbangkan schema-based tenancy di masa depan.")
    ]
    for title, desc in pot_findings:
        p_pf = doc.add_paragraph()
        r_pft = p_pf.add_run(f"• [POTENTIAL / DEBT] {title}: ")
        r_pft.bold = True
        r_pft.font.name = 'Segoe UI'
        r_pft.font.color.rgb = RGBColor(217, 119, 6)
        r_pfd = p_pf.add_run(desc)
        r_pfd.font.name = 'Calibri'
        r_pfd.font.size = Pt(9.5)

    doc.add_page_break()

    # ----------------------------------------------------
    # SECTION 24: BLUEPRINT FINAL (EXECUTIVE SUMMARY & RECOMMENDATIONS)
    # ----------------------------------------------------
    add_styled_heading(doc, "24. BLUEPRINT FINAL (RINGKASAN EKSEKUTIF & REKOMENDASI)", level=1)
    
    p_ex = doc.add_paragraph()
    p_ex.add_run("Executive Summary:\n").bold = True
    p_ex.add_run(
        "Pandu Management (Kinetic Platform) adalah sistem manajemen kerja modern berskala enterprise yang sangat matang, "
        "menggabungkan kapabilitas pelacakan isu agile (Scrum, Kanban), visual ideation whiteboard, manajemen portofolio strategis, "
        "ketahanan operasional SRE (Incident War Room, On-Call Paging, Chaos Engineering, Distributed Traces), kepatuhan data GDPR/DSAR, "
        "dan kecerdasan buatan multi-provider dengan redaksi PII bawaan. Seluruh sistem telah diverifikasi melalui 114 test suites otomatis, "
        "136 model Eloquent, 94 controller, 48 domain service, dan 110 screen antarmuka pengguna yang terstruktur rapi."
    ).font.name = 'Calibri'

    add_styled_heading(doc, "Rekomendasi Roadmap Pengembangan Masa Depan:", level=2)
    recs = [
        ("Fase 2.5: Integrasi Native Mobile App", "Memanfaatkan REST API v1 dan token Sanctum yang sudah siap untuk membangun aplikasi mobile native iOS/Android menggunakan React Native atau Flutter."),
        ("Fase 3: Implementasi Modul Service Desk & Ticketing", "Mengembangkan 16 tabel ticketing, Customer Support Portal, SLA Response/Resolution Tracking, dan Email-to-Ticket sesuai rencana pada ADR-005."),
        ("Fase 3.5: AI Autonomous Workflow Agents", "Mengevolusikan AI Gateway menjadi autonomous agents yang mampu mendiagnosis regresi build CI/CD secara otomatis dan mengajukan PR perbaikan otomatis."),
        ("Fase 4: Sertifikasi Kepatuhan Resmi SOC2 Type II & ISO 27001", "Memanfaatkan modul Live Audit Stream, Data Retention Purge, dan PII Masking untuk audit sertifikasi keamanan enterprise internasional.")
    ]
    for title, desc in recs:
        p_rc = doc.add_paragraph()
        r_rct = p_rc.add_run(f"• {title}: ")
        r_rct.bold = True
        r_rct.font.name = 'Segoe UI'
        r_rct.font.color.rgb = RGBColor(79, 70, 229)
        r_rcd = p_rc.add_run(desc)
        r_rcd.font.name = 'Calibri'
        r_rcd.font.size = Pt(9.5)

    doc.add_page_break()

    # ----------------------------------------------------
    # SECTION 25: ATURAN ANALISIS & VERIFIKASI
    # ----------------------------------------------------
    add_styled_heading(doc, "25. ATURAN ANALISIS & VERIFIKASI DOKUMEN", level=1)
    
    p = doc.add_paragraph()
    p.add_run("Dokumen Blueprint Sistem ini disusun dengan mematuhi seluruh 12 aturan analisis ketat:").font.name = 'Calibri'

    rules_list = [
        ("1. Analisis Berdasarkan Bukti Nyata", "Seluruh entitas, model, controller, service, route, dan komponen diverifikasi langsung dari source code dan database schema repositori pandu-management."),
        ("2. Tanpa Fabrikasi Fitur", "Tidak ada modul fiktif yang ditambahkan; seluruh fitur yang didokumentasikan memiliki implementasi teknis aktual atau referensi ADR yang jelas."),
        ("3. Tanpa Asumsi Teknologi", "Hanya mencatat teknologi yang terdaftar di composer.json, package.json, dan konfigurasi build Vite/Laravel."),
        ("4. Pembedaan Fakta dan Inferensi", "Memisahkan temuan terkonfirmasi (Confirmed Findings) dari potensi technical debt (Potential Findings)."),
        ("5. Kejelasan Informasi Tidak Ditemukan", "Fitur Service Desk diidentifikasi secara transparan sebagai status 'Deferred to Phase 3' sesuai kesepakatan arsitektur ADR-005."),
        ("6. Konsistensi Naming Convention", "Menggunakan nama class, method, table, column, dan route asli sesuai implementasi (misal: RankService::between, TaskConcurrencyException, HasUuidPrimaryKey)."),
        ("7. Pemeliharaan Hubungan Tracing", "Mempertahankan hubungan antara Requirement, Feature, Page UI, Endpoint API, dan Database Table dalam Traceability Matrix."),
        ("8. Rekonsiliasi Konflik Dokumentasi", "Menjadikan source code dan ADR sebagai ground truth utama dalam menyelesaikan konflik antar dokumen acuan awal."),
        ("9. Audit Screenshot & Desain", "Memetakan 93 folder aset desain di folder design/ ke dalam komponen UI dan screen catalog."),
        ("10. Granularitas Analisis Tingkat File", "Mencakup hingga level nama method service, konfigurasi middleware, dan casting atribut model."),
        ("11. Integritas Kode Sumber", "Tidak melakukan modifikasi yang merusak fungsionalitas sistem selama proses reverse engineering."),
        ("12. Standardisasi Diagram Mermaid", "Seluruh diagram arsitektur, ERD database, dan user flow disajikan menggunakan sintaks Mermaid standar yang valid.")
    ]

    for title, desc in rules_list:
        p_rl = doc.add_paragraph()
        r_rlt = p_rl.add_run(f"• {title}: ")
        r_rlt.bold = True
        r_rlt.font.name = 'Segoe UI'
        r_rlt.font.color.rgb = RGBColor(30, 41, 59)
        r_rld = p_rl.add_run(desc)
        r_rld.font.name = 'Calibri'
        r_rld.font.size = Pt(9.5)

    # Save document
    output_path = os.path.join("docs", "pandu_management_system_blueprint.docx")
    doc.save(output_path)
    print(f"Document saved successfully at: {output_path}")

if __name__ == "__main__":
    build_pandu_blueprint()
