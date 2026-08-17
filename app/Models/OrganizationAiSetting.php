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
 * @property string $organization_id
 * @property string $default_provider
 * @property string|null $openai_api_key
 * @property string|null $gemini_api_key
 * @property string|null $ollama_base_url
 * @property string $default_model
 * @property int $monthly_token_budget
 * @property int $current_month_tokens_used
 * @property float $current_month_cost_estimate
 * @property int $budget_alert_threshold
 * @property bool $is_enabled
 * @property array<string, mixed>|null $settings
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'organization_id',
    'default_provider',
    'openai_api_key',
    'gemini_api_key',
    'ollama_base_url',
    'default_model',
    'monthly_token_budget',
    'current_month_tokens_used',
    'current_month_cost_estimate',
    'budget_alert_threshold',
    'is_enabled',
    'settings',
])]
class OrganizationAiSetting extends Model
{
    use HasFactory, HasUuidPrimaryKey;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'openai_api_key' => 'encrypted',
            'gemini_api_key' => 'encrypted',
            'monthly_token_budget' => 'integer',
            'current_month_tokens_used' => 'integer',
            'current_month_cost_estimate' => 'float',
            'budget_alert_threshold' => 'integer',
            'is_enabled' => 'boolean',
            'settings' => 'array',
        ];
    }

    /**
     * Get the organization this setting belongs to.
     *
     * @return BelongsTo<Organization, $this>
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Check if organization has reached its monthly token budget.
     */
    public function isBudgetExceeded(): bool
    {
        if ($this->monthly_token_budget <= 0) {
            return false; // Unlimited
        }

        return $this->current_month_tokens_used >= $this->monthly_token_budget;
    }

    /**
     * Calculate percentage of budget used.
     */
    public function budgetUsagePercent(): float
    {
        if ($this->monthly_token_budget <= 0) {
            return 0.0;
        }

        return min(100.0, round(($this->current_month_tokens_used / $this->monthly_token_budget) * 100, 1));
    }
}
