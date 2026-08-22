<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('synthetic_monitors', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('name', 200);
            $table->string('target_url', 500);
            $table->string('probe_type', 30)->default('http'); // http, api, ssl, tcp
            $table->integer('interval_seconds')->default(60); // 30, 60, 300
            $table->integer('timeout_seconds')->default(10);
            $table->integer('expected_status_code')->default(200);
            $table->string('response_regex_match', 300)->nullable();
            $table->json('locations')->nullable(); // ["JKT-1", "SIN-1", "HND-1", "FRA-1", "IAD-1"]
            $table->dateTime('ssl_expires_at')->nullable();
            $table->string('ssl_issuer', 200)->nullable();
            $table->decimal('uptime_percentage_24h', 5, 2)->default(100.00);
            $table->decimal('uptime_percentage_30d', 5, 2)->default(100.00);
            $table->integer('avg_latency_ms')->default(120);
            $table->string('status', 30)->default('healthy'); // healthy, degraded, down, paused
            $table->dateTime('last_checked_at')->nullable();
            $table->timestampsTz();

            $table->index(['organization_id', 'status']);
        });

        Schema::create('synthetic_probe_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('synthetic_monitor_id')->constrained('synthetic_monitors')->cascadeOnDelete();
            $table->string('location', 30);
            $table->integer('status_code')->nullable();
            $table->integer('latency_ms')->default(0);
            $table->boolean('is_success')->default(true);
            $table->integer('ssl_valid_days')->nullable();
            $table->text('error_message')->nullable();
            $table->dateTime('checked_at')->nullable();
            $table->timestampsTz();

            $table->index(['synthetic_monitor_id', 'checked_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('synthetic_probe_logs');
        Schema::dropIfExists('synthetic_monitors');
    }
};
