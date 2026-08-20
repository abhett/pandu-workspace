<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property int $user_id
 * @property string $default_model
 * @property int $context_window
 * @property int $tone_style
 * @property string|null $custom_system_prompt
 * @property bool $auto_summarize_notifications
 * @property bool $inline_suggestions
 * @property string $suggestion_density
 * @property bool $model_training_opt_in
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'user_id',
    'default_model',
    'context_window',
    'tone_style',
    'custom_system_prompt',
    'auto_summarize_notifications',
    'inline_suggestions',
    'suggestion_density',
    'model_training_opt_in',
])]
class UserAiPreference extends Model
{
    use HasFactory, HasUuidPrimaryKey;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
            'context_window' => 'integer',
            'tone_style' => 'integer',
            'auto_summarize_notifications' => 'boolean',
            'inline_suggestions' => 'boolean',
            'model_training_opt_in' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
