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
        Schema::create('okr_objectives', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->uuid('parent_id')->nullable()->index();
            $table->foreignUuid('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->string('level', 30)->default('company'); // company, department, team, project
            $table->string('period', 50)->default('2026-Q1');
            $table->string('status', 30)->default('on_track'); // on_track, at_risk, behind, achieved, draft
            $table->decimal('confidence_score', 3, 2)->default(0.80); // 0.00 to 1.00
            $table->timestampsTz();

            $table->index(['organization_id', 'period']);
        });

        Schema::table('okr_objectives', function (Blueprint $table) {
            $table->foreign('parent_id')->references('id')->on('okr_objectives')->nullOnDelete();
        });

        Schema::create('okr_key_results', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('objective_id')->constrained('okr_objectives')->cascadeOnDelete();
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title', 255);
            $table->string('metric_type', 30)->default('percentage'); // percentage, numeric, currency, boolean
            $table->decimal('initial_value', 12, 2)->default(0);
            $table->decimal('current_value', 12, 2)->default(0);
            $table->decimal('target_value', 12, 2)->default(100);
            $table->string('unit', 50)->nullable();
            $table->decimal('weight', 3, 2)->default(1.00);
            $table->string('status', 30)->default('on_track');
            $table->timestampsTz();
        });

        Schema::create('okr_key_result_tasks', function (Blueprint $table) {
            $table->foreignUuid('key_result_id')->constrained('okr_key_results')->cascadeOnDelete();
            $table->foreignUuid('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->timestampsTz();

            $table->primary(['key_result_id', 'task_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('okr_key_result_tasks');
        Schema::dropIfExists('okr_key_results');
        Schema::dropIfExists('okr_objectives');
    }
};
