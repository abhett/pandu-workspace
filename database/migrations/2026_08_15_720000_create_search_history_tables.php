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
        Schema::create('search_histories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('query', 255);
            $table->json('filters')->nullable();
            $table->integer('results_count')->default(0);
            $table->string('clicked_entity_type', 50)->nullable();
            $table->string('clicked_entity_id', 100)->nullable();
            $table->timestampsTz();

            $table->index(['organization_id', 'user_id']);
            $table->index(['organization_id', 'query']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('search_histories');
    }
};
