<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\User;
use App\Models\WikiPage;
use App\Models\WikiPageRevision;
use App\Models\WikiSpace;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class WikiDocumentationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $organizations = Organization::all();
        $adminUser = User::first();

        if (! $adminUser) {
            return;
        }

        foreach ($organizations as $org) {
            $this->seedSpacesForOrganization($org, $adminUser);
        }
    }

    /**
     * Seed comprehensive documentation spaces and pages for an organization.
     */
    public function seedSpacesForOrganization(Organization $org, User $actor): void
    {
        // 1. SPACE: Panduan Penggunaan Sistem (User Guide)
        $userGuideSpace = WikiSpace::updateOrCreate(
            [
                'organization_id' => $org->id,
                'slug' => 'panduan-penggunaan-sistem',
            ],
            [
                'name' => 'Panduan Penggunaan Sistem',
                'icon' => 'book-open',
                'description' => 'Manual lengkap, panduan navigasi menu, dan alur kerja aplikasi Pandu Management.',
                'created_by' => $actor->id,
            ]
        );

        $this->seedPage($userGuideSpace, $actor, [
            'title' => 'Pengantar & Arsitektur Pandu Management',
            'slug' => 'pengantar-arsitektur-sistem',
            'icon' => 'sparkles',
            'is_favorite' => true,
            'content' => $this->getIntroductionContent(),
        ]);

        $this->seedPage($userGuideSpace, $actor, [
            'title' => 'Panduan Navigasi & Fungsi Seluruh Menu',
            'slug' => 'panduan-fungsi-seluruh-menu',
            'icon' => 'layout-dashboard',
            'is_favorite' => true,
            'content' => $this->getMenuGuideContent(),
        ]);

        $this->seedPage($userGuideSpace, $actor, [
            'title' => 'Alur Kerja Metodologi Agile & Sprint',
            'slug' => 'alur-kerja-agile-dan-sprint',
            'icon' => 'folder-kanban',
            'is_favorite' => true,
            'content' => $this->getAgileSprintGuideContent(),
        ]);

        $this->seedPage($userGuideSpace, $actor, [
            'title' => 'Kolaborasi Visual: Whiteboard Live & Dokumen',
            'slug' => 'kolaborasi-visual-whiteboard',
            'icon' => 'palette',
            'is_favorite' => false,
            'content' => $this->getWhiteboardGuideContent(),
        ]);

        // 2. SPACE: Glosarium & Kamus Istilah (Glossary)
        $glossarySpace = WikiSpace::updateOrCreate(
            [
                'organization_id' => $org->id,
                'slug' => 'glosarium-dan-kamus-istilah',
            ],
            [
                'name' => 'Glosarium & Kamus Istilah',
                'icon' => 'file-text',
                'description' => 'Kamus definisi istilah Agile, Scrum, Metrik Produktivitas, Keamanan, dan SRE.',
                'created_by' => $actor->id,
            ]
        );

        $this->seedPage($glossarySpace, $actor, [
            'title' => 'Istilah Manajemen Proyek & Agile/Scrum',
            'slug' => 'istilah-manajemen-proyek-agile',
            'icon' => 'layers',
            'is_favorite' => true,
            'content' => $this->getAgileGlossaryContent(),
        ]);

        $this->seedPage($glossarySpace, $actor, [
            'title' => 'Istilah Keamanan, RBAC & Infrastruktur Enterprise',
            'slug' => 'istilah-keamanan-rbac-infrastruktur',
            'icon' => 'shield-check',
            'is_favorite' => false,
            'content' => $this->getEnterpriseGlossaryContent(),
        ]);

        // 3. SPACE: SOP & Standar Tata Kelola Tim (SOP & Governance)
        $sopSpace = WikiSpace::updateOrCreate(
            [
                'organization_id' => $org->id,
                'slug' => 'sop-dan-tata-kelola-tim',
            ],
            [
                'name' => 'SOP & Standar Tata Kelola Tim',
                'icon' => 'check-circle-2',
                'description' => 'Standar operasional prosedur penulisan tiket, kriteria penerimaan, dan penanganan insiden.',
                'created_by' => $actor->id,
            ]
        );

        $this->seedPage($sopSpace, $actor, [
            'title' => 'Standar Penulisan & Siklus Hidup Tugas (Task Lifecycle)',
            'slug' => 'standar-penulisan-dan-siklus-tugas',
            'icon' => 'list-todo',
            'is_favorite' => false,
            'content' => $this->getTaskLifecycleSopContent(),
        ]);

        $this->seedPage($sopSpace, $actor, [
            'title' => 'Prosedur Manajemen Insiden & Eskalasi SLA',
            'slug' => 'prosedur-manajemen-insiden-eskalasi-sla',
            'icon' => 'alert-triangle',
            'is_favorite' => false,
            'content' => $this->getIncidentSlaSopContent(),
        ]);

        // 4. SPACE: Panduan AI & Otomasi Workflow (AI & Automations)
        $aiSpace = WikiSpace::updateOrCreate(
            [
                'organization_id' => $org->id,
                'slug' => 'panduan-ai-dan-otomasi',
            ],
            [
                'name' => 'Panduan AI & Otomasi Workflow',
                'icon' => 'bot',
                'description' => 'Cara memanfaatkan asisten kecerdasan buatan, perumusan prompt cerdas, dan aturan otomasi.',
                'created_by' => $actor->id,
            ]
        );

        $this->seedPage($aiSpace, $actor, [
            'title' => 'Tips Prompting & Pemanfaatan Asisten Pandu AI',
            'slug' => 'tips-prompting-dan-asisten-ai',
            'icon' => 'sparkles',
            'is_favorite' => true,
            'content' => $this->getAiPromptsGuideContent(),
        ]);

        $this->seedPage($aiSpace, $actor, [
            'title' => 'Panduan Otomasi Workflow & Aturan Tindakan',
            'slug' => 'panduan-otomasi-workflow-dan-rules',
            'icon' => 'zap',
            'is_favorite' => false,
            'content' => $this->getAutomationGuideContent(),
        ]);

        // 5. SPACE: Integrasi, Developer API & Webhook (Integrations & API)
        $integrationSpace = WikiSpace::updateOrCreate(
            [
                'organization_id' => $org->id,
                'slug' => 'integrasi-dan-developer-api',
            ],
            [
                'name' => 'Integrasi & Developer API Hub',
                'icon' => 'plug',
                'description' => 'Panduan menghubungkan GitHub, GitLab, Slack, Discord, Webhook, dan REST API.',
                'created_by' => $actor->id,
            ]
        );

        $this->seedPage($integrationSpace, $actor, [
            'title' => 'Integrasi GitHub, GitLab, Slack & Discord',
            'slug' => 'panduan-integrasi-github-gitlab-slack',
            'icon' => 'git-branch',
            'is_favorite' => false,
            'content' => $this->getIntegrationsGuideContent(),
        ]);

        $this->seedPage($integrationSpace, $actor, [
            'title' => 'Panduan REST API & Manajemen Token API',
            'slug' => 'panduan-rest-api-dan-tokens',
            'icon' => 'key',
            'is_favorite' => false,
            'content' => $this->getApiGuideContent(),
        ]);

        // 6. SPACE: FAQ & Template Dokumen Standar (FAQ & Templates)
        $faqSpace = WikiSpace::updateOrCreate(
            [
                'organization_id' => $org->id,
                'slug' => 'faq-dan-template-dokumen',
            ],
            [
                'name' => 'FAQ & Template Dokumen Standar',
                'icon' => 'help-circle',
                'description' => 'Solusi troubleshooting kendala umum dan template siap pakai untuk PRD, ADR, dan Post-Mortem.',
                'created_by' => $actor->id,
            ]
        );

        $this->seedPage($faqSpace, $actor, [
            'title' => 'FAQ & Panduan Pemecahan Masalah Umum',
            'slug' => 'faq-dan-troubleshooting-umum',
            'icon' => 'help-circle',
            'is_favorite' => true,
            'content' => $this->getFaqContent(),
        ]);

        $this->seedPage($faqSpace, $actor, [
            'title' => 'Template Standar: PRD, ADR & Post-Mortem',
            'slug' => 'template-dokumen-prd-adr-postmortem',
            'icon' => 'copy',
            'is_favorite' => false,
            'content' => $this->getDocumentTemplatesContent(),
        ]);
    }

    /**
     * Seed or update a wiki page with its revision.
     */
    protected function seedPage(WikiSpace $space, User $user, array $data): WikiPage
    {
        $title = trim($data['title']);
        $slug = $data['slug'] ?? Str::slug($title);

        $page = WikiPage::updateOrCreate(
            [
                'wiki_space_id' => $space->id,
                'slug' => $slug,
            ],
            [
                'parent_id' => $data['parent_id'] ?? null,
                'title' => $title,
                'icon' => $data['icon'] ?? 'description',
                'content' => $data['content'] ?? '',
                'is_favorite' => (bool) ($data['is_favorite'] ?? false),
                'version' => 1,
                'created_by' => $user->id,
                'last_edited_by' => $user->id,
            ]
        );

        WikiPageRevision::firstOrCreate(
            [
                'wiki_page_id' => $page->id,
                'version' => 1,
            ],
            [
                'user_id' => $user->id,
                'title' => $title,
                'content' => $data['content'] ?? '',
            ]
        );

        return $page;
    }

    protected function getIntroductionContent(): string
    {
        return <<<'MARKDOWN'
# 🚀 Pengantar & Arsitektur Pandu Management

Selamat datang di **Pandu Management System**, platform manajemen kerja terpadu (*All-in-One AI-Powered Work Management Platform*) yang dirancang khusus untuk tim *Engineering*, *Product*, *Design*, dan operasi lintas divisi skala *enterprise*.

---

## 🏛️ 1. Konsep Ruang Kerja Multi-Tenant
Aplikasi ini beroperasi menggunakan arsitektur **Multi-Tenancy** terisolasi penuh:
- Setiap akun pengguna dapat memiliki atau menjadi anggota di beberapa **Organisasi** sekaligus.
- Seluruh data proyek, tugas, berkas, pengaturan AI, serta hak akses terpisah secara aman antar-organisasi.
- **Pindah Organisasi**: Anda dapat beralih ruang kerja secara instan melalui *Organization Switcher* di pojok kiri atas bilah menu.

---

## 👥 2. Struktur Peran & Hak Akses (RBAC)
Pandu Management menerapkan kendali akses berbasis peran (*Role-Based Access Control*) dengan matriks izin granular:

| Peran (*Role*) | Deskripsi & Tanggung Jawab Utama |
|---|---|
| 👑 **Owner** | Pemilik organisasi dengan hak akses 100% tanpa batasan, termasuk pengelolaan paket langganan (*Billing*), kebijakan keamanan SSO, dan audit log global. |
| 🛡️ **Admin** | Administrator sistem yang mengelola keanggotaan tim, konfigurasi matriks peran kustom (RBAC), integrasi webhook, SLA, dan pengaturan kuota model AI. |
| 📊 **Manager** | *Project Manager* / *Scrum Master* yang mengelola inisiatif portofolio, pembuatan proyek, backlog refinement, sprint planning, beban kerja tim (*workload*), dan laporan BI. |
| 💻 **Member** | Anggota aktif (*Developer, Designer, QA, Contributor*) yang berfokus pada eksekusi tugas harian, update status kanban, papan tulis visual, daily standup, dan kolaborasi tim. |
| 👁️ **Guest** | Tamu atau klien eksternal dengan akses hanya-lihat (*read-only*) untuk meninjau roadmap proyek, wiki, dan catatan rilis publik. |

---

## ⚡ 3. Pintasan Navigasi Cepat (Keyboard Shortcuts)
Gunakan kombinasi tombol berikut di halaman mana saja untuk mempercepat alur kerja Anda:
- `Cmd / Ctrl + K` : Membuka **Omni-Search Bar** (Cari tugas, dokumen wiki, anggota, atau menu).
- `G` lalu `D` : Navigasi cepat ke **Dashboard**.
- `G` lalu `P` : Navigasi cepat ke **Daftar Proyek**.
- `G` lalu `I` : Membuka **Kotak Masuk (Inbox)**.
- `C` : Membuka dialog **Buat Tugas Baru (*Create Task*)**.
- `?` : Menampilkan seluruh daftar pintasan keyboard yang tersedia.
MARKDOWN;
    }

    protected function getMenuGuideContent(): string
    {
        return <<<'MARKDOWN'
# 🧭 Panduan Navigasi & Fungsi Seluruh Menu

Berikut adalah penjelasan lengkap fungsi dan tujuan setiap modul menu pada bilah navigasi (*sidebar*) Pandu Management:

---

## 📌 1. Menu Utama (Personal Work)
1. **Dashboard (`/dashboard`)**:
   - Menampilkan metrik real-time: tugas jatuh tempo minggu ini, total tugas aktif di papan, persentase keberhasilan sprint (*completion rate*), feed aktivitas terkini, dan tugas berprioritas tinggi.
2. **Pekerjaan Saya (`/my-work`)**:
   - Fokus personal untuk melihat seluruh tugas yang ditugaskan kepada Anda di berbagai proyek, dikelompokkan berdasarkan tenggat waktu (*Hari ini, Minggu ini, Terlewat*).
3. **Kotak Masuk (`/inbox`)**:
   - Pusat notifikasi aksi bergaya *Inbox Zero* yang merangkum sebutan (@mention), tugas baru, komentar tiket, dan pengingat batas waktu.

---

## 📂 2. Workspace & Proyek
1. **Proyek (`/projects`)**:
   - Katalog seluruh proyek organisasi (Scrum, Kanban, Hybrid). Di sini Anda dapat membuat proyek baru, mengatur alur status alur kerja (*Workflow*), dan mengelola anggota proyek.
2. **Timeline & Roadmap (`/timeline`)**:
   - Tampilan visual *Gantt Chart* untuk merencanakan dependensi antar-tugas, tanggal mulai & selesai, serta target milestone jangka panjang.
3. **Kalender (`/calendar`)**:
   - Tampilan agenda bulanan dan mingguan untuk memantau tenggat waktu tugas, jadwal sprint, dan rilis produk.
4. **Daily Standup Tim (`/scrum/daily-standup`)**:
   - Tempat tim mengisi laporan standup harian secara asinkron (*Apa yang dikerjakan kemarin, rencana hari ini, dan kendala/blocker*).
5. **Wiki & Dokumen (`/wiki`)**:
   - Basis pengetahuan internal dengan dukungan hierarki dokumen, riwayat versi (*revisions*), halaman favorit, dan rich markdown editor.
6. **Manajemen Berkas (`/files`)**:
   - Penyimpanan berkas terpusat yang mengorganisir lampiran dokumen, aset desain, dan media proyek ke dalam folder.
7. **Catatan Rilis (`/releases`)**:
   - Manajemen *Changelog* dan publikasi rilis fitur versi produk yang dapat dibagikan secara internal maupun publik.

---

## 👥 3. Tim & Portofolio (Manajemen Kapasitas)
1. **Portofolio (`/portfolio`)**:
   - Dasbor strategis level eksekutif untuk memantau kemajuan inisiatif besar lintas beberapa proyek sekaligus.
2. **Kapasitas Tim (`/workload`)**:
   - *Workload Balancer* untuk menganalisis beban jam kerja anggota tim guna mencegah kelebihan beban (*burnout*).
3. **Direktori Tim (`/teams`)**:
   - Manajemen struktur tim, pembagian departemen (*Engineering, Design, Marketing*), dan penetapan *Team Lead*.
4. **Keahlian & Alokasi Tim (`/organization/skills`)**:
   - Matriks keahlian anggota tim untuk memetakan spesialisasi teknis dan alokasi kebutuhan proyek.
5. **Mood & Pulse Tim (`/organization/pulse`)**:
   - Survei kepuasan dan sentimen tim secara anonim untuk menjaga kesehatan iklim kolaborasi.

---

## 📈 4. Laporan & Metrik (Analytics & BI)
1. **Laporan & Metrik (`/reports`)**:
   - Analitik performa Agile: *Velocity Chart*, *Burndown*, *Lead Time*, *Cycle Time*, dan *Throughput*.
2. **Executive BI & Widget Builder (`/dashboard/builder`)**:
   - Studio kustomisasi tata letak widget dashboard eksekutif untuk visualisasi metrik bisnis.
3. **Performa Kolaborasi (`/reports/collaboration`)**:
   - Analisis frekuensi interaksi, kecepatan respon review, dan efisiensi komunikasi antar-tim.

---

## 🤖 5. AI & Otomasi
1. **Asisten AI (`/search` / Quick Assistant)**:
   - Chatbot cerdas untuk merangkum tugas, merekomendasikan pemecahan subtask, dan pencarian semantik.
2. **Otomasi Workflow (`/automations`)**:
   - Pembuat aturan otomatis berbasis trigger (*Event-Condition-Action*), misal: *Saat status menjadi Done, assign reviewer dan kirim notifikasi ke Slack*.
3. **Pengaturan AI & Kuota (`/organization/ai-settings`)**:
   - Mengatur preferensi model AI (Gemini, Claude, GPT) dan pembatasan konsumsi token bulanan.
4. **AI Root Cause Analysis / RCA (`/sre/rca`)**:
   - Analisis otomatis penyebab akar masalah kegagalan sistem dan rekomendasi langkah pencegahan insiden.
5. **Distributed Traces & SRE (`/sre/traces`)**:
   - Observabilitas latensi mikroservis, pelacakan span trace request, dan pemantauan kesehatan sistem.

---

## ⚙️ 6. Administrasi & Keamanan
1. **Anggota Organisasi (`/organization/members`)**:
   - Mengundang pengguna baru via email, mengatur peran awal, dan mencabut akses anggota.
2. **Peran & Izin RBAC (`/organization/roles`)**:
   - Menyesuaikan hak akses granular untuk peran kustom (*Custom Roles*).
3. **Tagihan & Billing (`/organization/billing`)**:
   - Manajemen paket langganan, metode pembayaran, dan riwayat faktur (*invoice*).
4. **Marketplace Integrasi (`/integrations`)**:
   - Menghubungkan akun ke GitHub, GitLab, Jira, Slack, Discord, dan Google Workspace.
5. **Webhook Hub (`/organization/webhooks`)**:
   - Mengirim event real-time ke sistem pihak ketiga dengan fitur inspeksi payload dan retry otomatis.
6. **Kebijakan SLA (`/organization/sla`)**:
   - Menetapkan target waktu respon penanganan tiket berdasarkan tingkat keparahan (*Severity*).
MARKDOWN;
    }

    protected function getAgileSprintGuideContent(): string
    {
        return <<<'MARKDOWN'
# 🔄 Alur Kerja Metodologi Agile & Siklus Sprint

Pandu Management menyediakan dukungan penuh untuk metodologi **Scrum** dan **Kanban**. Berikut adalah panduan langkah demi langkah dalam menjalankan siklus sprint yang efektif:

```
[ Backlog Refinement ] ➔ [ Planning Poker ] ➔ [ Start Sprint ] ➔ [ Daily Standup & Kanban ] ➔ [ Sprint Health & Burndown ] ➔ [ Complete & Retrospective ]
```

---

## 1. Menyusun Backlog Proyek (`/projects/{key}/backlog`)
- Buat daftar kebutuhan fitur dalam bentuk **Epic** (inisiatif besar), **Story** (nilai dari kacamata pengguna), **Task** (tugas teknis), dan **Bug** (perbaikan kendala).
- Susun urutan prioritas tugas dari atas ke bawah (*Rank ordering*).

---

## 2. Sesi Planning Poker (`/projects/{key}/planning-poker`)
- Buka sesi estimasi interaktif bersama seluruh tim secara real-time.
- Setiap anggota memberikan vote nilai **Story Points (SP)** menggunakan deret Fibonacci (*1, 2, 3, 5, 8, 13, 21*).
- Sistem menghitung konsensus estimasi secara otomatis untuk dimasukkan ke dalam tugas.

---

## 3. Memulai Sprint Aktif
- Buat sprint baru (misal: *Sprint 1 Core Architecture*) dengan menentukan durasi (umumnya 1–2 minggu) dan **Sprint Goal** yang jelas.
- Pindahkan tugas-tugas dari Backlog ke dalam Sprint tersebut hingga mencapai target kapasitas *Story Points* tim.
- Klik tombol **"Mulai Sprint"** untuk mengaktifkan pelacakan waktu dan papan kerja.

---

## 4. Eksekusi Harian pada Papan Kanban (`/projects/{key}/board`)
- Selama sprint berjalan, anggota tim memperbarui status kartu tugas secara *drag-and-drop*:
  - **To Do**: Tugas siap dikerjakan.
  - **In Progress**: Sedang dalam tahap pengembangan aktif.
  - **Review / QA**: Menunggu tinjauan kode (*Code Review*) atau pengujian kualitas.
  - **Done**: Tugas telah memenuhi kriteria *Definition of Done (DoD)*.
- Isi laporan **Daily Standup** setiap pagi untuk menyelaraskan progres tim.

---

## 5. Monitoring Kesehatan Sprint (`/projects/{key}/sprints/health`)
- Pantau grafik **Burndown Chart** untuk memastikan sisa *Story Points* menurun sesuai garis ideal menuju tanggal akhir sprint.
- Catat hambatan pada menu **Impediment Escalator** jika terjadi kendala teknis atau dependensi yang memblokir tim.

---

## 6. Menyelesaikan Sprint & Retrospektif (`/projects/{key}/retrospectives`)
- Di akhir durasi sprint, klik **"Selesaikan Sprint"**.
- Tugas yang belum selesai dapat dipindahkan otomatis ke Sprint berikutnya atau dikembalikan ke Backlog.
- Gelar sesi **Sprint Retrospective** bersama tim untuk mendokumentasikan:
  - 🟢 *What went well* (Hal positif yang perlu dipertahankan).
  - 🔴 *What didn't go well* (Kendala dan hambatan yang terjadi).
  - 💡 *Action items* (Langkah konkrit perbaikan pada sprint mendatang).
MARKDOWN;
    }

    protected function getWhiteboardGuideContent(): string
    {
        return <<<'MARKDOWN'
# 🎨 Kolaborasi Visual: Whiteboard Live & Dokumen

Papan Tulis Kolaboratif (**Whiteboard Live**) pada Pandu Management memungkinkan tim mendesain arsitektur perangkat lunak, memetakan diagram alur, dan melakukan *brainstorming* ide secara visual dan real-time.

---

## 🛠️ Fitur-Fitur Utama Whiteboard:
1. **Sticky Notes Berwarna**: Tempelkan catatan ide cepat dengan kategori warna dinamis.
2. **Konektor & Diagram Alur**: Hubungkan node ide dengan panah relasi terarah untuk membuat bagan alir (*flowchart*) atau arsitektur sistem.
3. **Konversi Node Menjadi Tiket Tugas**:
   - Anda dapat mengubah sebuah node ide di whiteboard secara langsung menjadi **Task** resmi di papan kanban proyek dengan sekali klik.
4. **Sinkronisasi Multi-Kursor Real-Time**:
   - Melihat posisi kursor dan perubahan objek dari rekan kerja lain yang sedang membuka papan tulis yang sama secara langsung.
5. **Ekspor & Dokumentasi**:
   - Tangkapan whiteboard dapat disematkan langsung ke dalam halaman **Wiki** atau dilampirkan pada deskripsi *Epic*.
MARKDOWN;
    }

    protected function getAgileGlossaryContent(): string
    {
        return <<<'MARKDOWN'
# 📖 Kamus Istilah Manajemen Proyek & Agile/Scrum

Berikut adalah daftar istilah penting seputar manajemen proyek modern dan metodologi Agile yang digunakan di dalam aplikasi Pandu Management:

---

### 🔹 Backlog
Daftar inventaris terpusat yang berisi seluruh kebutuhan fitur, perbaikan bug, penyempurnaan teknis, dan inisiatif yang belum dijadwalkan ke dalam sprint aktif.

### 🔹 Sprint
Periode waktu berulang dengan durasi tetap (biasanya 1 hingga 4 minggu) di mana tim berkomitmen menyelesaikan sejumlah paket pekerjaan yang disepakati bersama (*Sprint Goal*).

### 🔹 Epic
Inisiatif atau fitur berukuran besar yang dapat dipecah menjadi beberapa *User Stories* atau *Tasks* yang lebih kecil dan dapat diselesaikan dalam beberapa sprint.

### 🔹 User Story
Penjelasan kebutuhan fungsional perangkat lunak yang ditulis dari sudut pandang pengguna akhir, biasanya mengikuti format:  
> *"Sebagai seorang [Peran Pengguna], saya ingin [Tindakan/Kebutuhan] agar [Tujuan/Manfaat]."*

### 🔹 Story Points (SP)
Satuan angka relatif (bukan jam waktu) yang merefleksikan tingkat kompleksitas, ketidakpastian, dan volume usaha yang dibutuhkan untuk menyelesaikan suatu tugas. Umumnya menggunakan skala Fibonacci: `1, 2, 3, 5, 8, 13, 21`.

### 🔹 Velocity (Kecepatan Tim)
Jumlah rata-rata total *Story Points* yang berhasil diselesaikan secara tuntas (*Done*) oleh tim dalam satu siklus sprint. Metrik ini digunakan untuk memprediksi kapasitas kerja sprint berikutnya.

### 🔹 Burndown Chart
Grafik visual yang membandingkan sisa *Story Points* pekerjaan terhadap sisa hari kerja dalam sprint. Garis aktual yang berada di bawah garis ideal menandakan tim bekerja lebih cepat dari target.

### 🔹 WIP Limit (Work in Progress Limit)
Batas maksimal jumlah kartu tugas yang boleh berada dalam satu kolom status Kanban secara bersamaan (misal: kolom *In Progress* dibatasi maksimal 5 tugas). Tujuannya untuk mencegah terjadinya *bottleneck* dan memastikan fokus penyelesaian.

### 🔹 Lead Time vs Cycle Time
- **Lead Time**: Waktu total yang dihitung sejak tugas pertama kali dibuat di backlog hingga dinyatakan selesai (*Done*).
- **Cycle Time**: Waktu aktual yang dibutuhkan sejak tim mulai aktif mengerjakan tugas (*In Progress*) hingga selesai (*Done*).

### 🔹 Definition of Done (DoD)
Daftar kriteria standar yang harus dipenuhi sebelum suatu tugas dapat dinyatakan benar-benar selesai (misal: *Kode telah di-review, lulus automated test, lulus QA, dan dokumentasi wiki diperbarui*).

### 🔹 Planning Poker
Teknik estimasi kolaboratif berbasis konsensus gamifikasi di mana anggota tim secara serentak membuka kartu estimasi *Story Points* untuk menghindari bias penjangkaran (*anchoring bias*).

### 🔹 Impediment (Blocker)
Segala kendala internal atau eksternal yang menghambat anggota tim dalam melanjutkan pekerjaannya sesuai rencana sprint.
MARKDOWN;
    }

    protected function getEnterpriseGlossaryContent(): string
    {
        return <<<'MARKDOWN'
# 🛡️ Kamus Istilah Keamanan, RBAC & Infrastruktur Enterprise

Berikut adalah glosarium istilah teknis, kepatuhan, keandalan sistem (*SRE*), dan keamanan pada Pandu Management:

---

### 🔹 Multi-Tenancy (Multi-Penyewa)
Arsitektur perangkat lunak di mana satu instance aplikasi melayani banyak organisasi (*tenant*), di mana data setiap organisasi diisolasi secara ketat dan aman sehingga tidak dapat diakses oleh organisasi lain.

### 🔹 RBAC (Role-Based Access Control)
Metode pembatasan akses sistem berdasarkan peran pengguna di dalam organisasi. Izin diberikan pada level tindakan (*permissions*, misal: `projects:create`, `billing:manage`, `audit:view`).

### 🔹 SSO (Single Sign-On)
Mekanisme autentikasi terpusat yang memungkinkan pengguna masuk ke dalam aplikasi menggunakan satu set kredensial perusahaan (misal melalui protokol SAML 2.0, Okta, Microsoft Azure AD, atau Google Workspace).

### 🔹 MFA / 2FA (Multi-Factor Authentication)
Lapisan keamanan ganda yang mewajibkan pengguna memasukkan kode verifikasi sementara (seperti aplikasi TOTP Google Authenticator / Authy) selain kata sandi saat masuk ke akun.

### 🔹 Audit Log
Rekam jejak digital yang tidak dapat dimanipulasi (*immutable*) yang mencatat setiap peristiwa penting di dalam sistem, termasuk siapa pelakunya, waktu kejadian, alamat IP, dan perubahan data sebelum serta sesudah.

### 🔹 SLA (Service Level Agreement)
Perjanjian tingkat layanan yang menetapkan komitmen batas waktu respon pertama dan penyelesaian tiket berdasarkan tingkat keparahan (*Severity Level*).

### 🔹 DLQ (Dead Letter Queue)
Antrean khusus pada sistem perpesanan/webhook untuk menampung payload event yang gagal terkirim ke server tujuan setelah mencapai batas maksimal percobaan ulang (*retry limit*), guna mempermudah analisis dan pengiriman ulang manual.

### 🔹 RCA (Root Cause Analysis)
Proses investigasi sistematis pasca-insiden untuk menemukan faktor penyebab utama suatu kegagalan sistem dan menyusun rencana tindakan pencegahan permanen.

### 🔹 SRE (Site Reliability Engineering)
Disiplin rekayasa perangkat lunak yang menerapkan metodologi otomatisasi untuk menjamin ketersediaan (*availability*), latensi yang rendah, dan performa tinggi pada infrastruktur aplikasi.

### 🔹 Synthetic Monitoring
Metode pemantauan performa aplikasi dengan cara menjalankan probe simulasi request API secara periodik dari berbagai lokasi server untuk mendeteksi gangguan layanan sebelum dirasakan oleh pengguna nyata.
MARKDOWN;
    }

    protected function getTaskLifecycleSopContent(): string
    {
        return <<<'MARKDOWN'
# 📋 SOP Standar Penulisan & Siklus Hidup Tugas (Task Lifecycle)

Untuk menjaga kualitas komunikasi dan efisiensi pelacakan pekerjaan tim, seluruh anggota wajib mematuhi standar penulisan tugas berikut:

---

## 1. Struktur Standar Judul Tugas
- Judul harus singkat, deskriptif, dan diawali dengan kata kerja tindakan aktif.
- **Contoh Baik**:
  - `[Frontend] Integrasikan komponen DropdownMenu pada baris tabel Backlog`
  - `[Backend] Buat endpoint REST API untuk penghitungan velocity sprint`
  - `[Fix] Perbaiki error column avatar not found pada query WikiService`
- **Contoh Buruk**:
  - `Fix bug`
  - `Update halaman`

---

## 2. Format Standar Deskripsi Tugas
Gunakan format terstruktur dengan bagian-bagian berikut:

```markdown
### 🎯 Konteks & Tujuan:
Jelaskan latar belakang mengapa tugas ini perlu dikerjakan dan masalah apa yang diselesaikan.

### 📋 Kriteria Penerimaan (Acceptance Criteria):
- [ ] Pengguna dapat melihat daftar sprint pada dropdown aksi.
- [ ] Tombol hapus memunculkan dialog konfirmasi sebelum request dikirim.
- [ ] Notifikasi sukses muncul di pojok kanan bawah setelah aksi berhasil.

### 🔗 Referensi & Lampiran:
- Desain Figma: [Link Figma]
- Dokumentasi API: [Link Wiki]
```

---

## 3. Matriks Penentuan Prioritas

| Prioritas | Kriteria Penggunaan | Target Penyelesaian |
|---|---|---|
| 🔴 **Urgent / Critical** | Layanan produksi mati (*down*), data rusak, atau fitur vital tidak berfungsi bagi seluruh pengguna. | < 4 Jam |
| 🟠 **High** | Fitur utama mengalami kendala berat tanpa *workaround* sementara bagi pengguna. | 1–2 Hari Kerja |
| 🟡 **Medium** | Masalah fungsionalitas umum atau kebutuhan fitur standar dalam sprint berjalan. | Sesuai Durasi Sprint |
| 🔵 **Low / Minor** | Perbaikan minor estetika UI, typo tulisan, atau penyempurnaan kecil yang tidak mendesak. | Backlog / Sprint Luang |
MARKDOWN;
    }

    protected function getIncidentSlaSopContent(): string
    {
        return <<<'MARKDOWN'
# 🚨 Prosedur Manajemen Insiden & Eskalasi SLA

Standar Operasional Prosedur (SOP) ini mengatur tata cara penanganan gangguan layanan, insiden keamanan, dan eskalasi teknis pada Pandu Management.

---

## 1. Klasifikasi Tingkat Keparahan Insiden (*Severity*)

- **Severity 1 (Critical Outage)**:
  - Dampak: Seluruh sistem tidak dapat diakses atau terjadi kebocoran data sensitif.
  - Respon Awal: **< 15 Menit**.
  - Update Status: Setiap 30 menit ke manajemen.
- **Severity 2 (Major Degradation)**:
  - Dampak: Fitur inti terganggu untuk sebagian besar pengguna, ada penurunan performa drastis.
  - Respon Awal: **< 1 Jam**.
  - Update Status: Setiap 2 jam.
- **Severity 3 (Minor Issue)**:
  - Dampak: Gangguan kecil pada fitur non-kritis dengan solusi alternatif (*workaround*).
  - Respon Awal: **< 4 Jam**.

---

## 2. Alur Kerja Penanganan Insiden
1. **Identifikasi & Pembukaan Tiket Insiden (`/sre/incidents`)**:
   - Tentukan *Incident Commander (IC)* yang memimpin koordinasi perbaikan.
2. **Mitigasi Cepat**:
   - Lakukan rollback deployment atau aktifkan feature flag proteksi untuk menghentikan dampak meluas.
3. **Penyelidikan Akar Masalah (*RCA*)**:
   - Gunakan fitur **AI Root Cause Analysis** (`/sre/rca`) dan **Distributed Traces** (`/sre/traces`) untuk memeriksa call stack dan error rate.
4. **Penyusunan Post-Mortem**:
   - Buat dokumen *Post-Mortem* pada Wiki dalam kurun waktu 24 jam pasca-insiden yang mencakup: *Ringkasan kejadian, garis waktu kronologis, akar masalah teknis, dan Action Items preventif*.
MARKDOWN;
    }

    protected function getAiPromptsGuideContent(): string
    {
        return <<<'MARKDOWN'
# 🤖 Tips Prompting & Pemanfaatan Asisten Pandu AI

Pandu Management dilengkapi dengan **AI Work Assistant** berbasis model LLM mutakhir (Gemini 1.5 Pro, Claude 3.5 Sonnet, GPT-4o). Berikut adalah cara memaksimalkan bantuan kecerdasan buatan dalam pekerjaan harian Anda:

---

## 💡 1. Kasus Penggunaan Utama AI di Pandu:
1. **Pembuatan & Breakdown Subtask Otomatis**:
   - Pada kartu tugas, klik tombol **"AI Subtasks"** untuk memecah User Story kompleks menjadi checklist teknis yang siap dikerjakan developer.
2. **AI Sprint Summary**:
   - Pada halaman Backlog, klik **"AI Summary"** untuk menghasilkan ringkasan eksekutif progres sprint yang siap dibagikan ke manajemen atau klien.
3. **AI Root Cause Analysis (RCA)**:
   - Pada modul `/sre/rca`, masukkan log error dan insiden untuk mendapatkan analisis *5-Whys* otomatis dan rekomendasi patch arsitektur.
4. **Pencarian Semantik Omni-Search (`Cmd + K`)**:
   - Cari dokumen atau tiket menggunakan bahasa alami, misalnya: *"Cari tiket terkait integrasi autentikasi Google bulan lalu"*.

---

## 📝 2. Contoh Prompting Efektif untuk Tim:

### A. Menulis Deskripsi User Story Standar
```text
Tolong ubah kebutuhan berikut menjadi User Story standar dengan Acceptance Criteria format Gherkin:
"Kami butuh fitur ekspor laporan performa sprint ke format PDF dan Excel dengan filter tanggal."
```

### B. Menganalisis Log Error / Bug
```text
Berdasarkan log stack trace error berikut, jelaskan kemungkinan akar penyebab masalah dan usulkan perbaikan kodenya:
[Tempel stack trace error]
```

### C. Ringkasan Retrospektif Sprint
```text
Berikut adalah catatan What Went Well dan What Didn't Go Well dari sprint 3. Tolong buatkan 3 Action Items prioritas tinggi yang terukur (SMART):
[Tempel catatan retro]
```
MARKDOWN;
    }

    protected function getAutomationGuideContent(): string
    {
        return <<<'MARKDOWN'
# ⚡ Panduan Otomasi Workflow & Aturan Tindakan

Modul **Otomasi Workflow (`/automations`)** memungkinkan Anda mengotomatiskan tugas-tugas administratif berulang menggunakan model **Trigger ➔ Condition ➔ Action**.

---

## 🧩 1. Struktur Aturan Otomasi:
- **Trigger (Pemicu)**: Peristiwa awal yang memulai otomasi (misal: *Saat Tugas Dibuat, Status Berubah, atau Batas Waktu Terlampaui*).
- **Condition (Syarat)**: Filter kriteria (misal: *Jika Prioritas = Urgent dan Tipe = Bug*).
- **Action (Tindakan)**: Tindakan yang dieksekusi sistem (misal: *Ubah Assignee ke Lead Engineer, Tambahkan Label "Hotfix", dan Kirim Webhook ke Slack*).

---

## 🚀 2. Resep Otomasi Populer:
1. **Auto-Assign Code Reviewer**:
   - *Trigger*: Status tugas berubah menjadi `In Review`.
   - *Action*: Tugaskan reviewer berdasarkan matriks keahlian tim (*Skill Matrix*).
2. **Notifikasi Eskalasi Blocker**:
   - *Trigger*: Tugas ditandai memiliki `Impediment/Blocker`.
   - *Action*: Kirim notifikasi berprioritas tinggi ke channel Slack `#engineering-leads`.
3. **Penutupan Tugas Otomatis dari Git**:
   - *Trigger*: Pull Request di-merge ke branch `main` dengan pesan `Closes KNT-101`.
   - *Action*: Ubah status tugas `KNT-101` menjadi `Done` dan catat riwayat commit.
MARKDOWN;
    }

    protected function getIntegrationsGuideContent(): string
    {
        return <<<'MARKDOWN'
# 🔌 Integrasi GitHub, GitLab, Slack & Discord

Hubungkan ekosistem kerja eksternal ke dalam Pandu Management melalui menu **Marketplace Integrasi (`/integrations`)** dan **Webhook Hub (`/organization/webhooks`)**.

---

## 🐙 1. Integrasi GitHub & GitLab
1. Buka `/integrations` dan pilih **GitHub** atau **GitLab**.
2. Masukkan *Personal Access Token (PAT)* atau pasang OAuth App.
3. **Fitur Otomatis**:
   - **Tautan Tiket**: Tulis ID tugas pada commit (misal: `git commit -m "[KNT-102] Selesaikan integrasi SSO"`) untuk menyinkronkan aktivitas commit ke kartu tugas.
   - **PR Review SLA**: Lacak waktu review pull request dan eskalasi otomatis jika melebihi batas target SLA.

---

## 💬 2. Integrasi Slack & Discord Webhooks
1. Buka `/organization/webhooks` dan klik **"+ Tambah Webhook Endpoint"**.
2. Masukkan Webhook URL dari channel Slack / Discord Anda.
3. Pilih event yang ingin dilanggan:
   - `task.created`, `task.completed`, `sprint.started`, `incident.escalated`.
4. Sistem akan mengirimkan notifikasi interaktif dalam format kartu kaya (*Rich Embeds*).
MARKDOWN;
    }

    protected function getApiGuideContent(): string
    {
        return <<<'MARKDOWN'
# 🔑 Panduan REST API & Manajemen Token API

Pandu Management menyediakan antarmuka pemrograman aplikasi (REST API) enterprise untuk integrasi kustom dan otomatisasi skrip backend.

---

## 1. Membuat Token Akses API (`/settings/api-tokens`)
1. Buka menu **Pengaturan ➔ Token API**.
2. Berikan nama token (misal: `CI/CD Deploy Pipeline`) dan pilih masa berlaku (*Expiration*).
3. Salin token rahasia yang dihasilkan (token hanya ditampilkan sekali demi keamanan).

---

## 2. Autentikasi Request
Kirimkan token pada header `Authorization` di setiap HTTP request:

```bash
curl -X GET "https://pandu.app/api/v1/projects" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Accept: application/json"
```

---

## 3. Rate Limiting & Kebijakan Batas Request
- Paket Starter: **60 request / menit**.
- Paket Enterprise: **1.000 request / menit** dengan jaminan latensi rendah.
- Status kuota request dapat dipantau langsung pada header response `X-RateLimit-Remaining`.
MARKDOWN;
    }

    protected function getFaqContent(): string
    {
        return <<<'MARKDOWN'
# ❓ FAQ & Panduan Pemecahan Masalah Umum (Troubleshooting)

Berikut adalah jawaban atas pertanyaan dan kendala yang paling sering dihadapi pengguna:

---

### Q1: Mengapa beberapa menu di sidebar tidak muncul di akun saya?
**Jawaban**: Tampilan menu disesuaikan secara dinamis berdasarkan **Peran (Role)** dan hak akses (*Permissions*) Anda di organisasi aktif. Misalnya, menu *Tagihan & Billing* hanya dapat dilihat oleh Owner, sedangkan menu *Portofolio & Laporan BI* diperuntukkan bagi Manager, Admin, dan Owner.

### Q2: Bagaimana cara mengaktifkan atau mereset Autentikasi Dua Faktor (MFA)?
**Jawaban**: Buka menu **Profil ➔ Keamanan & Autentikasi Dua Faktor** (`/settings/security`). Jika Anda kehilangan perangkat autentikator, hubungi Admin organisasi Anda untuk melakukan verifikasi identitas dan reset MFA sementara.

### Q3: Kenapa data di Kanban Board tidak langsung terupdate?
**Jawaban**: Pastikan koneksi internet stabil. Anda dapat menekan tombol `Cmd / Ctrl + R` untuk me-refresh state data terbaru, atau klik tombol filter reset pada papan kerja.

### Q4: Apakah saya bisa mengekspor data tugas dan dokumen wiki?
**Jawaban**: Ya. Dokumen Wiki dapat diekspor dalam format **Markdown (.md)** dan **PDF**, sedangkan laporan tugas proyek dapat diekspor ke format **CSV / Excel** melalui menu *Laporan & Metrik*.
MARKDOWN;
    }

    protected function getDocumentTemplatesContent(): string
    {
        return <<<'MARKDOWN'
# 📑 Template Standar: PRD, ADR & Post-Mortem

Salin dan gunakan template standar siap pakai berikut untuk membuat dokumen baru di Wiki:

---

## 📄 1. Template PRD (Product Requirement Document)

```markdown
# [PRD] Nama Inisiatif Fitur

- **Status**: Draft / In Review / Approved
- **Product Manager**: @nama
- **Lead Engineer**: @nama
- **Target Rilis**: Q3 2026

---

### 1. Latar Belakang & Masalah
Jelaskan masalah pengguna yang ingin diselesaikan.

### 2. Sasaran & Metrik Keberhasilan (KPI)
- Target peningkatan konversi: +15%
- Reduksi waktu pemrosesan: < 200ms

### 3. Kebutuhan Fungsional (User Stories)
1. Sebagai pengguna, saya dapat...
2. Sebagai admin, saya dapat...

### 4. Batasan & Hal di Luar Cakupan (Out of Scope)
- Fitur offline mode tidak didukung pada versi 1.0.
```

---

## 🏗️ 2. Template ADR (Architecture Decision Record)

```markdown
# ADR 001: Judul Keputusan Arsitektur

- **Status**: Accepted / Proposed / Deprecated
- **Tanggal**: 2026-08-30
- **Penulis**: @arsitek

---

### Konteks
Jelaskan tantangan teknis atau trade-off yang dihadapi sistem.

### Keputusan yang Diambil
Kami memutuskan untuk menggunakan [Teknologi/Pola Desain X] karena [Alasan Utama].

### Konsekuensi Positif & Negatif
- 🟢 **Positif**: Peningkatan throughput hingga 3x lipat.
- 🔴 **Negatif**: Membutuhkan konfigurasi worker redis tambahan.
```

---

## 💥 3. Template Incident Post-Mortem

```markdown
# Post-Mortem: Insiden Gangguan Database Connection Pool (2026-08-28)

- **Tingkat Keparahan**: Sev-1 (Critical)
- **Durasi Down**: 24 Menit (14:10 - 14:34 WIB)
- **Incident Commander**: @lead_sre

---

### Ringkasan Kejadian
Layanan API mengalami kenaikan latensi dan error 500 akibat kehabisan connection pool database PostgreSQL.

### Garis Waktu Kronologis
- **14:10 WIB**: Alert Prometheus mendeteksi lonjakan koneksi > 95%.
- **14:15 WIB**: Incident Commander mengaktifkan mode pemeliharaan parsial.
- **14:28 WIB**: Peningkatan limit pool PgBouncer diterapkan.
- **14:34 WIB**: Error rate kembali normal 0.00%.

### Rencana Tindakan Pencegahan (Action Items)
- [ ] [High] Tambahkan auto-scaler koneksi PgBouncer (Target: 2 Sept 2026).
- [ ] [Medium] Buat synthetic probe monitoring query lambat.
```
MARKDOWN;
    }
}
