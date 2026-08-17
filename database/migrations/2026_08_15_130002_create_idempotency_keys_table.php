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
        Schema::create('idempotency_keys', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('key', 255);
            $table->foreignUuid('organization_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('request_method', 10);
            $table->string('request_path', 500);
            $table->string('request_checksum', 64);
            $table->string('status', 30)->default('processing');
            $table->unsignedSmallInteger('response_status')->nullable();
            $table->jsonb('response_headers')->nullable();
            $table->longText('response_body')->nullable();
            $table->timestampTz('expires_at');
            $table->timestampsTz();

            $table->unique(['key', 'organization_id', 'user_id'], 'idempotency_keys_unique');
            $table->index(['key']);
            $table->index(['expires_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('idempotency_keys');
    }
};
