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
        Schema::create('architecture_decision_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignUuid('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->integer('adr_number');
            $table->string('domain', 50)->default('data_architecture'); // data_architecture, api_design, infrastructure, security_compliance, frontend_architecture
            $table->string('title', 200);
            $table->string('status', 30)->default('proposed'); // proposed, accepted, superseded, deprecated, rejected
            $table->text('context_and_problem');
            $table->text('decision_outcome');
            $table->json('positive_consequences')->nullable();
            $table->json('negative_consequences')->nullable();
            $table->json('alternatives_considered')->nullable();
            $table->uuid('superseded_by_id')->nullable();
            $table->date('decided_at')->nullable();
            $table->timestampsTz();

            $table->index(['organization_id', 'status', 'domain']);
            $table->unique(['organization_id', 'adr_number']);
        });

        Schema::table('architecture_decision_records', function (Blueprint $table) {
            $table->foreign('superseded_by_id')
                ->references('id')
                ->on('architecture_decision_records')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('architecture_decision_records');
    }
};
