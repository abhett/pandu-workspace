<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('release_publications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignUuid('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignUuid('release_id')->nullable()->constrained('releases')->nullOnDelete();
            $table->string('version_tag', 50);
            $table->string('version_type', 20)->default('minor'); // major, minor, patch
            $table->string('release_title', 200);
            $table->text('executive_summary');
            $table->longText('markdown_content');
            $table->json('categories')->nullable(); // {"features": [...], "fixes": [...], "breaking": [...]}
            $table->json('target_channels')->nullable(); // ["public_changelog", "github_releases", "slack_broadcast", "email_digest"]
            $table->string('status', 30)->default('draft'); // draft, scheduled, published
            $table->dateTimeTz('published_at')->nullable();
            $table->foreignId('published_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();

            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'version_tag']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('release_publications');
    }
};
