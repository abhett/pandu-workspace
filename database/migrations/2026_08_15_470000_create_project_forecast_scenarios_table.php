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
        Schema::create('project_forecast_scenarios', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('title', 150);
            $table->string('target_scope_type', 50)->default('remaining_backlog'); // remaining_backlog, sprint_scope, custom_points
            $table->decimal('target_points', 7, 2);
            $table->unsignedInteger('simulation_runs')->default(1000);
            $table->unsignedInteger('historical_sprints_count')->default(5);
            $table->unsignedInteger('sprint_duration_days')->default(14);
            $table->date('start_date');
            $table->json('results')->nullable();
            $table->timestampsTz();

            $table->index(['project_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_forecast_scenarios');
    }
};
