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
        Schema::create('api_rate_limit_policies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('tier', 30)->default('free'); // free, pro, enterprise, custom
            $table->integer('requests_per_minute')->default(60);
            $table->integer('burst_allowance')->default(20);
            $table->bigInteger('daily_quota')->default(10000);
            $table->boolean('is_throttling_enabled')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestampsTz();

            $table->index(['organization_id', 'tier']);
        });

        Schema::create('api_traffic_snapshots', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignUuid('policy_id')->nullable()->constrained('api_rate_limit_policies')->nullOnDelete();
            $table->string('endpoint_route', 150);
            $table->string('client_identifier', 150);
            $table->bigInteger('total_requests')->default(0);
            $table->bigInteger('throttled_requests')->default(0);
            $table->float('avg_latency_ms')->default(45.0);
            $table->bigInteger('status_2xx_count')->default(0);
            $table->bigInteger('status_4xx_count')->default(0);
            $table->bigInteger('status_5xx_count')->default(0);
            $table->dateTimeTz('recorded_at');

            $table->index(['organization_id', 'recorded_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('api_traffic_snapshots');
        Schema::dropIfExists('api_rate_limit_policies');
    }
};
