<?php

namespace Database\Factories;

use App\Models\Attachment;
use App\Models\Organization;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Attachment>
 */
class AttachmentFactory extends Factory
{
    protected $model = Attachment::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $filename = fake()->word().'.png';

        return [
            'organization_id' => Organization::factory(),
            'project_id' => Project::factory(),
            'attachable_type' => Task::class,
            'attachable_id' => Task::factory(),
            'uploader_id' => User::factory(),
            'disk' => 'local',
            'object_key' => 'organizations/'.Str::uuid().'/attachments/'.Str::uuid().'_'.$filename,
            'filename' => $filename,
            'mime_type' => 'image/png',
            'size_bytes' => fake()->numberBetween(1024, 1048576),
            'checksum_sha256' => hash('sha256', fake()->sentence()),
            'scan_status' => 'clean',
            'metadata' => ['width' => 800, 'height' => 600],
        ];
    }
}
