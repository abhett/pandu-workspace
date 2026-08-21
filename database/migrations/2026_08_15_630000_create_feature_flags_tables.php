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
        Schema::create('feature_flags', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignUuid('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->string('key', 100);
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->string('strategy', 50)->default('boolean'); // boolean, percentage_rollout, user_targeting, kill_switch
            $table->boolean('is_enabled')->default(false);
            $table->integer('rollout_percentage')->default(0); // 0 to 100
            $table->json('target_rules')->nullable();
            $table->bigInteger('evaluations_count')->default(0);
            $table->float('error_rate_pct')->default(0.0);
            $table->string('status', 30)->default('active'); // active, paused, archived, killed
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();

            $table->index(['organization_id', 'key']);
            $table->index(['organization_id', 'status', 'strategy']);
            $table->unique(['organization_id', 'key']);
        });

        Schema::create('feature_flag_evaluation_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('feature_flag_id')->constrained('feature_flags')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('environment', 30)->default('production');
            $table->boolean('evaluated_result');
            $table->string('evaluation_reason', 100);
            $table->dateTimeTz('evaluated_at');

            $table->index(['feature_flag_id', 'evaluated_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('feature_flag_evaluation_logs');
        Schema::dropIfExists('feature_flags');
    }
};
