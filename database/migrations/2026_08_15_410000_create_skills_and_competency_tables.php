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
        Schema::create('skills', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('category', 50)->default('backend'); // frontend, backend, devops, design, qa, product_management, data, other
            $table->text('description')->nullable();
            $table->string('color', 30)->default('#3b82f6');
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->unique(['organization_id', 'name']);
            $table->index(['organization_id', 'category']);
        });

        Schema::create('user_skills', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('skill_id')->constrained('skills')->cascadeOnDelete();
            $table->string('proficiency_level', 30)->default('intermediate'); // beginner, intermediate, advanced, expert
            $table->double('years_of_experience')->default(1.0);
            $table->boolean('verified')->default(true);
            $table->foreignId('endorsed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();

            $table->unique(['user_id', 'skill_id']);
            $table->index(['organization_id', 'skill_id']);
            $table->index(['user_id']);
        });

        Schema::create('task_required_skills', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->foreignUuid('skill_id')->constrained('skills')->cascadeOnDelete();
            $table->string('min_proficiency', 30)->default('intermediate');
            $table->timestampsTz();

            $table->unique(['task_id', 'skill_id']);
            $table->index(['task_id']);
            $table->index(['skill_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_required_skills');
        Schema::dropIfExists('user_skills');
        Schema::dropIfExists('skills');
    }
};
