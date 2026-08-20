<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $wiki_space_id
 * @property string|null $parent_id
 * @property string $title
 * @property string $slug
 * @property string $icon
 * @property string|null $content
 * @property bool $is_favorite
 * @property int $version
 * @property int $created_by
 * @property int $last_edited_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'wiki_space_id',
    'parent_id',
    'title',
    'slug',
    'icon',
    'content',
    'is_favorite',
    'version',
    'created_by',
    'last_edited_by',
])]
class WikiPage extends Model
{
    use HasFactory, HasUuidPrimaryKey;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_favorite' => 'boolean',
            'version' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<WikiSpace, $this>
     */
    public function space(): BelongsTo
    {
        return $this->belongsTo(WikiSpace::class, 'wiki_space_id');
    }

    /**
     * @return BelongsTo<WikiPage, $this>
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(WikiPage::class, 'parent_id');
    }

    /**
     * @return HasMany<WikiPage, $this>
     */
    public function children(): HasMany
    {
        return $this->hasMany(WikiPage::class, 'parent_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function lastEditor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'last_edited_by');
    }

    /**
     * @return HasMany<WikiPageRevision, $this>
     */
    public function revisions(): HasMany
    {
        return $this->hasMany(WikiPageRevision::class);
    }
}
