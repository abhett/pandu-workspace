<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incident_runbooks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('title', 200);
            $table->string('slug', 200);
            $table->text('description')->nullable();
            $table->string('category', 50)->default('database'); // database, networking, cache, deployment, scaling
            $table->string('severity', 20)->default('high'); // critical, high, medium, low
            $table->integer('estimated_duration_minutes')->default(5);
            $table->boolean('is_automated')->default(true);
            $table->json('steps')->nullable(); // Array of [{id, title, type, action_command, timeout_seconds}]
            $table->json('parameters')->nullable(); // Array of [{key, label, type, default, required}]
            $table->integer('total_runs')->default(0);
            $table->decimal('success_rate', 5, 2)->default(100.00);
            $table->dateTime('last_executed_at')->nullable();
            $table->timestampsTz();

            $table->index(['organization_id', 'category']);
        });

        Schema::create('runbook_executions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('incident_runbook_id')->constrained('incident_runbooks')->cascadeOnDelete();
            $table->foreignId('executed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 30)->default('running'); // running, completed, failed, cancelled
            $table->string('trigger_type', 40)->default('manual'); // manual, alert_webhook, oncall_escalation
            $table->json('execution_params')->nullable();
            $table->json('step_results')->nullable(); // [{step_id, title, type, status, output_logs, duration_ms}]
            $table->integer('total_duration_ms')->default(0);
            $table->dateTime('started_at')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->timestampsTz();

            $table->index(['incident_runbook_id', 'started_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('runbook_executions');
        Schema::dropIfExists('incident_runbooks');
    }
};
