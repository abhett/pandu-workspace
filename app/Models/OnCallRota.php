<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OnCallRota extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'on_call_rotas';

    protected $fillable = [
        'organization_id',
        'shift_name',
        'primary_user_id',
        'secondary_user_id',
        'shift_start',
        'shift_end',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'shift_start' => 'datetime',
            'shift_end' => 'datetime',
            'is_active' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function primaryUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'primary_user_id');
    }

    public function secondaryUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'secondary_user_id');
    }
}
