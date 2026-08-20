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
        Schema::create('sla_policies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('project_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->string('priority', 50)->default('all'); // all, urgent, high, medium, low
            $table->string('issue_type', 50)->default('all'); // all, bug, task, story, epic
            $table->unsignedInteger('response_time_hours')->default(4);
            $table->unsignedInteger('resolution_time_hours')->default(24);
            $table->string('operational_hours', 50)->default('24x7'); // 24x7, business_hours
            $table->boolean('active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->index(['organization_id', 'active']);
            $table->index(['project_id', 'priority', 'issue_type']);
        });

        Schema::create('sla_escalation_rules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('sla_policy_id')->constrained('sla_policies')->cascadeOnDelete();
            $table->string('trigger_type', 50); // approaching_breach, response_breached, resolution_breached
            $table->integer('trigger_offset_minutes')->default(0);
            $table->string('action_type', 50); // escalate_priority, add_tag, notify_lead, reassign_role
            $table->jsonb('action_payload')->nullable();
            $table->unsignedSmallInteger('position')->default(0);
            $table->boolean('active')->default(true);
            $table->timestampsTz();

            $table->index(['sla_policy_id', 'active']);
        });

        Schema::create('task_sla_trackers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->foreignUuid('sla_policy_id')->constrained('sla_policies')->cascadeOnDelete();
            $table->timestampTz('response_due_at')->nullable();
            $table->timestampTz('responded_at')->nullable();
            $table->boolean('is_response_breached')->default(false);
            $table->timestampTz('resolution_due_at')->nullable();
            $table->timestampTz('resolved_at')->nullable();
            $table->boolean('is_resolution_breached')->default(false);
            $table->string('status', 30)->default('in_progress'); // in_progress, achieved, breached, paused
            $table->timestampTz('escalated_at')->nullable();
            $table->unsignedSmallInteger('escalation_level')->default(0);
            $table->timestampsTz();

            $table->index(['task_id']);
            $table->index(['sla_policy_id', 'status']);
            $table->index(['status', 'resolution_due_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_sla_trackers');
        Schema::dropIfExists('sla_escalation_rules');
        Schema::dropIfExists('sla_policies');
    }
};
