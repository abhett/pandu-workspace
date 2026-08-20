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
        Schema::dropIfExists('wiki_page_revisions');
        Schema::dropIfExists('wiki_pages');
        Schema::dropIfExists('wiki_spaces');

        Schema::create('wiki_spaces', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->index();
            $table->uuid('project_id')->nullable()->index();
            $table->string('name');
            $table->string('slug');
            $table->string('icon', 50)->default('folder');
            $table->text('description')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('project_id')->references('id')->on('projects')->nullOnDelete();
        });

        Schema::create('wiki_pages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('wiki_space_id')->index();
            $table->uuid('parent_id')->nullable()->index();
            $table->string('title');
            $table->string('slug');
            $table->string('icon', 50)->default('description');
            $table->longText('content')->nullable();
            $table->boolean('is_favorite')->default(false);
            $table->integer('version')->default(1);
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('last_edited_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->foreign('wiki_space_id')->references('id')->on('wiki_spaces')->cascadeOnDelete();
        });

        Schema::table('wiki_pages', function (Blueprint $table) {
            $table->foreign('parent_id')->references('id')->on('wiki_pages')->nullOnDelete();
        });

        Schema::create('wiki_page_revisions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('wiki_page_id')->index();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->integer('version');
            $table->string('title');
            $table->longText('content')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('wiki_page_id')->references('id')->on('wiki_pages')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('wiki_page_revisions');
        Schema::dropIfExists('wiki_pages');
        Schema::dropIfExists('wiki_spaces');
    }
};
