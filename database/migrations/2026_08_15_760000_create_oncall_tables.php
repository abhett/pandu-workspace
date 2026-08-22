<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('oncall_schedules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('name', 200);
            $table->string('rotation_type', 30)->default('weekly'); // weekly, biweekly, monthly
            $table->json('members')->nullable(); // [{"user_id": 1, "order": 1}, ...]
            $table->json('escalation_policy')->nullable(); // [{"level": 1, "target": "primary", "timeout_minutes": 5}, ...]
            $table->string('status', 30)->default('active'); // active, paused
            $table->dateTime('started_at')->nullable();
            $table->timestampsTz();

            $table->index(['organization_id', 'status']);
        });

        Schema::create('oncall_paging_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('oncall_schedule_id')->constrained('oncall_schedules')->cascadeOnDelete();
            $table->foreignId('triggered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('trigger_reason', 300);
            $table->integer('escalation_level')->default(1);
            $table->foreignId('responder_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->integer('response_time_seconds')->nullable();
            $table->dateTime('resolved_at')->nullable();
            $table->string('status', 30)->default('pending'); // pending, acknowledged, resolved, escalated
            $table->timestampsTz();

            $table->index(['oncall_schedule_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('oncall_paging_logs');
        Schema::dropIfExists('oncall_schedules');
    }
};
