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
        Schema::create('project_risks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('title', 150);
            $table->text('description')->nullable();
            $table->string('category', 50)->default('technical'); // technical, schedule, budget, resource, security, external, compliance, other
            $table->unsignedTinyInteger('probability')->default(3); // 1 to 5
            $table->unsignedTinyInteger('impact')->default(3); // 1 to 5
            $table->unsignedTinyInteger('exposure_score')->default(9); // probability * impact
            $table->string('risk_level', 20)->default('medium'); // low, medium, high, critical
            $table->string('status', 30)->default('open'); // open, mitigating, accepted, transferred, avoided, closed
            $table->text('mitigation_strategy')->nullable();
            $table->text('contingency_plan')->nullable();
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('task_id')->nullable()->constrained('tasks')->nullOnDelete();
            $table->date('identified_date');
            $table->date('target_resolution_date')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->index(['project_id', 'status']);
            $table->index(['project_id', 'risk_level']);
            $table->index(['project_id', 'exposure_score']);
        });

        Schema::create('risk_action_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('risk_id')->constrained('project_risks')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->text('action_taken');
            $table->string('status_before', 30);
            $table->string('status_after', 30);
            $table->unsignedTinyInteger('residual_probability')->nullable();
            $table->unsignedTinyInteger('residual_impact')->nullable();
            $table->timestampsTz();

            $table->index(['risk_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('risk_action_logs');
        Schema::dropIfExists('project_risks');
    }
};
