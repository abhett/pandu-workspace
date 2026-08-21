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
        Schema::create('sla_escalation_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignUuid('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->foreignUuid('tracker_id')->nullable()->constrained('task_sla_trackers')->nullOnDelete();
            $table->foreignId('triggered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->integer('escalation_tier')->default(1); // 1 = Lead, 2 = Manager, 3 = Executive War Room
            $table->string('previous_priority', 30)->default('medium');
            $table->string('new_priority', 30)->default('high');
            $table->foreignId('previous_assignee_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('new_assignee_id')->nullable()->constrained('users')->nullOnDelete();
            $table->float('breach_risk_score')->default(0.0);
            $table->text('reason');
            $table->json('actions_taken')->nullable();
            $table->timestampsTz();

            $table->index(['organization_id', 'escalation_tier']);
            $table->index(['task_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sla_escalation_logs');
    }
};
