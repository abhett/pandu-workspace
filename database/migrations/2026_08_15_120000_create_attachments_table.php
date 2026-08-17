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
        Schema::create('attachments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('project_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('attachable_type', 100);
            $table->uuid('attachable_id');
            $table->foreignId('uploader_id')->constrained('users')->cascadeOnDelete();
            $table->string('disk', 50)->default('local');
            $table->string('object_key');
            $table->string('filename');
            $table->string('mime_type', 150);
            $table->unsignedBigInteger('size_bytes');
            $table->string('checksum_sha256', 64)->nullable();
            $table->string('scan_status', 30)->default('clean');
            $table->jsonb('metadata')->default('{}');
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->index(['attachable_type', 'attachable_id']);
            $table->index(['organization_id', 'created_at']);
            $table->index(['checksum_sha256']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attachments');
    }
};
