<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $service_name
 * @property string $display_name
 * @property string $category
 * @property string $status
 * @property float $uptime_percentage
 * @property int $latency_ms
 * @property array<string, mixed>|null $meta
 * @property Carbon|null $last_checked_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'service_name',
    'display_name',
    'category',
    'status',
    'uptime_percentage',
    'latency_ms',
    'meta',
    'last_checked_at',
])]
class SystemServiceHealth extends Model
{
    use HasFactory, HasUuidPrimaryKey;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'uptime_percentage' => 'float',
            'latency_ms' => 'integer',
            'meta' => 'array',
            'last_checked_at' => 'datetime',
        ];
    }
}
