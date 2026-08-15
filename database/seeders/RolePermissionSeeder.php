<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Services\Auth\PermissionRegistry;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Seed all permissions
        foreach (PermissionRegistry::allFlat() as $perm) {
            Permission::updateOrCreate(
                ['id' => $perm['id']],
                [
                    'name' => $perm['name'],
                    'category' => $perm['category'],
                    'description' => $perm['description'],
                ]
            );
        }

        // 2. Seed system roles
        $systemRoles = [
            [
                'slug' => 'owner',
                'name' => 'Owner',
                'description' => 'Pemilik organisasi dengan akses penuh ke seluruh modul, tagihan, dan konfigurasi sistem.',
            ],
            [
                'slug' => 'admin',
                'name' => 'Admin',
                'description' => 'Administrator organisasi yang dapat mengelola anggota, peran, tim, dan proyek.',
            ],
            [
                'slug' => 'manager',
                'name' => 'Manager',
                'description' => 'Manajer proyek dan tim yang dapat membuat proyek, mengelola sprint, dan membagi tugas.',
            ],
            [
                'slug' => 'member',
                'name' => 'Member',
                'description' => 'Anggota tim aktif yang dapat berkontribusi pada proyek, mengelola tugas, dan berkomentar.',
            ],
            [
                'slug' => 'guest',
                'name' => 'Guest',
                'description' => 'Tamu atau kolaborator eksternal dengan akses hanya-lihat (view-only) dan komentar.',
            ],
        ];

        foreach ($systemRoles as $roleData) {
            $role = Role::updateOrCreate(
                [
                    'organization_id' => null,
                    'slug' => $roleData['slug'],
                ],
                [
                    'name' => $roleData['name'],
                    'description' => $roleData['description'],
                    'is_system' => true,
                ]
            );

            // Sync default permissions
            $permissionIds = PermissionRegistry::defaultPermissionsForRole($roleData['slug']);
            $role->permissions()->sync($permissionIds);
        }
    }
}
