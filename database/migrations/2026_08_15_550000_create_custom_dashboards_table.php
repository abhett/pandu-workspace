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
        Schema::create('custom_dashboards', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->string('category', 50)->default('executive'); // executive, engineering, financial, security, product
            $table->string('icon', 50)->default('layout-dashboard');
            $table->boolean('is_starred')->default(false);
            $table->boolean('is_shared')->default(true);
            $table->json('layout');
            $table->integer('refresh_interval_seconds')->default(0);
            $table->timestampsTz();

            $table->index(['organization_id', 'category']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('custom_dashboards');
    }
};
