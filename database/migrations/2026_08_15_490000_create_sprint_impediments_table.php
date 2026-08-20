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
        Schema::create('sprint_impediments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignUuid('sprint_id')->constrained('sprints')->cascadeOnDelete();
            $table->foreignUuid('task_id')->nullable()->constrained('tasks')->nullOnDelete();
            $table->foreignId('raised_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title', 150);
            $table->text('description')->nullable();
            $table->string('category', 50)->default('technical'); // technical, external_dependency, resource_bottleneck, unclear_requirements, third_party_outage
            $table->string('severity', 20)->default('medium'); // critical, high, medium, low
            $table->string('status', 30)->default('open'); // open, investigating, escalated, resolved
            $table->timestamp('escalated_at')->nullable();
            $table->unsignedInteger('escalation_level')->default(0); // 0 = Team level, 1 = Scrum Master, 2 = Engineering Lead
            $table->text('escalation_notes')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->text('resolution_summary')->nullable();
            $table->timestampsTz();

            $table->index(['project_id', 'sprint_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sprint_impediments');
    }
};
