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
        Schema::create('developer_focus_snapshots', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('snapshot_date');
            $table->integer('deep_work_minutes')->default(0);
            $table->integer('meeting_minutes')->default(0);
            $table->integer('context_switches_count')->default(0);
            $table->integer('active_tasks_count')->default(0);
            $table->integer('pr_reviews_count')->default(0);
            $table->integer('burnout_risk_score')->default(20); // 0 to 100
            $table->string('burnout_risk_level', 30)->default('low'); // low, moderate, high, critical
            $table->float('focus_efficiency_pct')->default(85.0);
            $table->timestampsTz();

            $table->index(['organization_id', 'snapshot_date']);
            $table->index(['organization_id', 'user_id', 'snapshot_date']);
        });

        Schema::create('focus_time_recommendations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type', 50)->default('no_meeting_block'); // no_meeting_block, wip_limit_alert, async_standup_shift, batch_pr_review
            $table->string('title', 200);
            $table->text('description');
            $table->string('suggested_schedule', 100)->nullable();
            $table->string('status', 30)->default('active'); // active, acknowledged, applied
            $table->timestampsTz();

            $table->index(['organization_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('focus_time_recommendations');
        Schema::dropIfExists('developer_focus_snapshots');
    }
};
