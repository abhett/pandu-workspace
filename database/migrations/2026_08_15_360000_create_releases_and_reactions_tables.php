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
        Schema::create('releases', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('project_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('version', 32); // e.g. v3.4.0
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->string('type', 32)->default('minor'); // major, minor, patch, hotfix
            $table->string('status', 32)->default('draft'); // draft, published, archived
            $table->boolean('is_public')->default(true);
            $table->dateTime('published_at')->nullable();
            $table->json('content')->nullable(); // structured categories: new_features, improvements, bug_fixes, breaking_changes
            $table->timestamps();

            $table->unique(['organization_id', 'version'], 'org_release_version_unique');
        });

        Schema::create('release_reactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('release_id')->constrained('releases')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('ip_address', 45)->nullable();
            $table->string('emoji', 32); // rocket, heart, party, fire, thumbs_up
            $table->timestamps();

            $table->index(['release_id', 'emoji']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('release_reactions');
        Schema::dropIfExists('releases');
    }
};
