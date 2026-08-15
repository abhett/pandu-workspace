<?php

namespace App\Services\Auth;

class PermissionRegistry
{
    /**
     * Get all catalogued permissions grouped by category.
     *
     * @return array<string, array<int, array{id: string, name: string, description: string}>>
     */
    public static function allGrouped(): array
    {
        return [
            'Workspace & Organisasi' => [
                [
                    'id' => 'org:manage',
                    'name' => 'Kelola Organisasi',
                    'description' => 'Mengubah pengaturan nama, slug, zona waktu, dan logo organisasi',
                ],
                [
                    'id' => 'org:billing',
                    'name' => 'Kelola Billing & Langganan',
                    'description' => 'Mengakses informasi pembayaran, faktur, dan upgrade paket langganan',
                ],
            ],
            'Anggota & Tim' => [
                [
                    'id' => 'members:view',
                    'name' => 'Lihat Direktori Anggota',
                    'description' => 'Melihat daftar anggota, status keaktifan, dan profil kerja',
                ],
                [
                    'id' => 'members:invite',
                    'name' => 'Undang Anggota Baru',
                    'description' => 'Mengirim tautan atau email undangan ke anggota baru',
                ],
                [
                    'id' => 'members:update_role',
                    'name' => 'Ubah Peran Anggota',
                    'description' => 'Mengubah tingkat peran atau hak akses anggota organisasi',
                ],
                [
                    'id' => 'members:remove',
                    'name' => 'Keluarkan Anggota',
                    'description' => 'Menghapus atau menonaktifkan keanggotaan pengguna dari organisasi',
                ],
                [
                    'id' => 'teams:manage',
                    'name' => 'Kelola Tim & Departemen',
                    'description' => 'Membuat, mengubah, dan menghapus tim serta menunjuk Team Lead',
                ],
            ],
            'Keamanan & Hak Akses' => [
                [
                    'id' => 'roles:manage',
                    'name' => 'Kelola Peran Kustom',
                    'description' => 'Membuat dan mengatur peran kustom dalam organisasi',
                ],
                [
                    'id' => 'permissions:manage',
                    'name' => 'Atur Matriks Izin',
                    'description' => 'Mengubah hak akses granular pada setiap peran',
                ],
                [
                    'id' => 'audit:view',
                    'name' => 'Lihat Audit Logs',
                    'description' => 'Melihat rekaman jejak aktivitas audit keamanan organisasi',
                ],
            ],
            'Proyek & Portofolio' => [
                [
                    'id' => 'projects:view',
                    'name' => 'Lihat Proyek',
                    'description' => 'Melihat daftar proyek dan papan kerja dalam organisasi',
                ],
                [
                    'id' => 'projects:create',
                    'name' => 'Buat Proyek Baru',
                    'description' => 'Membuat proyek baru dengan metodologi Scrum, Kanban, atau Hybrid',
                ],
                [
                    'id' => 'projects:edit',
                    'name' => 'Edit Proyek',
                    'description' => 'Mengubah detail konfigurasi, alur sprint, dan anggota proyek',
                ],
                [
                    'id' => 'projects:delete',
                    'name' => 'Hapus/Arsipkan Proyek',
                    'description' => 'Menghapus atau mengarsipkan proyek yang telah selesai',
                ],
                [
                    'id' => 'portfolios:manage',
                    'name' => 'Kelola Portofolio',
                    'description' => 'Mengatur inisiatif strategis dan portofolio lintas proyek',
                ],
            ],
            'Tugas & Papan Kerja' => [
                [
                    'id' => 'tasks:view',
                    'name' => 'Lihat Tugas',
                    'description' => 'Melihat rincian tugas dan backlog sprint',
                ],
                [
                    'id' => 'tasks:create',
                    'name' => 'Buat Tugas Baru',
                    'description' => 'Membuat item tugas (Epic, Story, Task, Bug, Subtask)',
                ],
                [
                    'id' => 'tasks:edit',
                    'name' => 'Edit Konten Tugas',
                    'description' => 'Mengubah deskripsi, checklist, dan atribut tugas',
                ],
                [
                    'id' => 'tasks:move_status',
                    'name' => 'Pindah Status Tugas',
                    'description' => 'Menggeser tugas antar kolom Kanban atau mengubah status sprint',
                ],
                [
                    'id' => 'tasks:assign',
                    'name' => 'Tugaskan Anggota (Assignee)',
                    'description' => 'Menambahkan atau mengganti penanggung jawab tugas',
                ],
                [
                    'id' => 'tasks:delete',
                    'name' => 'Hapus Tugas',
                    'description' => 'Menghapus tugas dari backlog atau papan',
                ],
                [
                    'id' => 'tasks:comment',
                    'name' => 'Komentar & Diskusi',
                    'description' => 'Memberikan komentar dan menyebut rekan tim pada tugas',
                ],
            ],
            'AI & Otomasi' => [
                [
                    'id' => 'ai:access',
                    'name' => 'Gunakan Asisten Pandu AI',
                    'description' => 'Mengakses fitur rekomendasi, ringkasan sprint, dan chat Pandu AI',
                ],
                [
                    'id' => 'ai:configure',
                    'name' => 'Konfigurasi Model AI',
                    'description' => 'Mengatur provider dan parameter kecerdasan buatan organisasi',
                ],
                [
                    'id' => 'automations:manage',
                    'name' => 'Kelola Otomasi Workflow',
                    'description' => 'Membuat rule otomatisasi tindakan tugas dan webhook',
                ],
            ],
        ];
    }

    /**
     * Get flat array of all permissions.
     *
     * @return array<int, array{id: string, name: string, category: string, description: string}>
     */
    public static function allFlat(): array
    {
        $flat = [];
        foreach (self::allGrouped() as $category => $items) {
            foreach ($items as $item) {
                $flat[] = [
                    'id' => $item['id'],
                    'name' => $item['name'],
                    'category' => $category,
                    'description' => $item['description'],
                ];
            }
        }

        return $flat;
    }

    /**
     * Get default permissions for a standard role slug.
     *
     * @return list<string>
     */
    public static function defaultPermissionsForRole(string $roleSlug): array
    {
        $all = array_column(self::allFlat(), 'id');

        return match ($roleSlug) {
            'owner' => $all,
            'admin' => array_values(array_diff($all, ['org:billing'])),
            'manager' => [
                'members:view',
                'members:invite',
                'teams:manage',
                'projects:view',
                'projects:create',
                'projects:edit',
                'portfolios:manage',
                'tasks:view',
                'tasks:create',
                'tasks:edit',
                'tasks:move_status',
                'tasks:assign',
                'tasks:comment',
                'ai:access',
                'automations:manage',
            ],
            'member' => [
                'members:view',
                'projects:view',
                'tasks:view',
                'tasks:create',
                'tasks:edit',
                'tasks:move_status',
                'tasks:assign',
                'tasks:comment',
                'ai:access',
            ],
            'guest' => [
                'projects:view',
                'tasks:view',
                'tasks:comment',
            ],
            default => [],
        };
    }
}
