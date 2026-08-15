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
        Schema::create('projects', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('key', 10); // e.g. KNT, PLT
            $table->string('slug');
            $table->text('description')->nullable();
            $table->string('type')->default('kanban'); // scrum, kanban, bug_tracking, general
            $table->string('icon')->default('FolderKanban');
            $table->string('color')->default('#3b82f6');
            $table->foreignId('lead_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('default_assignee_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status')->default('active'); // active, archived, on_hold
            $table->json('settings')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['organization_id', 'key']);
            $table->unique(['organization_id', 'slug']);
            $table->index(['organization_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
