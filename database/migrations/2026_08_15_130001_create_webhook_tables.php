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
        Schema::create('webhook_subscriptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('project_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('name', 150);
            $table->text('url');
            $table->text('secret');
            $table->jsonb('events')->default('[]');
            $table->boolean('active')->default(true);
            $table->jsonb('headers')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->index(['organization_id', 'active']);
            $table->index(['project_id']);
        });

        Schema::create('webhook_deliveries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('webhook_subscription_id')->constrained('webhook_subscriptions')->cascadeOnDelete();
            $table->string('event_id', 64);
            $table->string('event_type', 100);
            $table->jsonb('payload');
            $table->unsignedSmallInteger('attempt')->default(1);
            $table->string('status', 30)->default('pending');
            $table->unsignedSmallInteger('response_code')->nullable();
            $table->text('response_body')->nullable();
            $table->text('error_message')->nullable();
            $table->unsignedInteger('duration_ms')->nullable();
            $table->timestampTz('next_attempt_at')->nullable();
            $table->timestampTz('delivered_at')->nullable();
            $table->timestampsTz();

            $table->index(['webhook_subscription_id', 'created_at']);
            $table->index(['event_id']);
            $table->index(['status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('webhook_deliveries');
        Schema::dropIfExists('webhook_subscriptions');
    }
};
