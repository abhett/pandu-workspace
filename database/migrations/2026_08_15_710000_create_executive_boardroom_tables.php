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
        Schema::create('boardroom_briefings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('title', 200);
            $table->string('period', 50)->default('Q3 2026');
            $table->text('executive_summary');
            $table->json('strategic_pillars')->nullable();
            $table->json('quarterly_okrs')->nullable();
            $table->string('status', 30)->default('draft'); // draft, finalized, presented
            $table->dateTimeTz('presented_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();

            $table->index(['organization_id', 'period']);
            $table->index(['organization_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('boardroom_briefings');
    }
};
