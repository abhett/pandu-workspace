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
        Schema::create('webhook_endpoints', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('name', 150);
            $table->string('target_url', 500);
            $table->json('event_subscriptions');
            $table->string('secret_hash', 100)->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('max_retries')->default(5);
            $table->string('backoff_strategy', 30)->default('exponential'); // exponential, linear, fixed
            $table->timestampsTz();

            $table->index(['organization_id', 'is_active']);
        });

        Schema::create('webhook_delivery_attempts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignUuid('endpoint_id')->constrained('webhook_endpoints')->cascadeOnDelete();
            $table->string('event_type', 100);
            $table->json('payload');
            $table->json('request_headers')->nullable();
            $table->integer('response_status')->nullable();
            $table->text('response_body')->nullable();
            $table->float('response_latency_ms')->default(0.0);
            $table->integer('attempt_number')->default(1);
            $table->string('status', 30)->default('failed'); // pending, success, failed, dead_letter, replayed
            $table->string('error_reason', 150)->nullable();
            $table->dateTimeTz('next_retry_at')->nullable();
            $table->dateTimeTz('delivered_at')->nullable();
            $table->dateTimeTz('replayed_at')->nullable();
            $table->timestampsTz();

            $table->index(['organization_id', 'status']);
            $table->index(['endpoint_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('webhook_delivery_attempts');
        Schema::dropIfExists('webhook_endpoints');
    }
};
