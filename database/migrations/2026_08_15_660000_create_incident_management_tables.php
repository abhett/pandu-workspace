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
        Schema::create('incidents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignUuid('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->integer('incident_number');
            $table->string('title', 200);
            $table->string('severity', 20)->default('P2'); // P1, P2, P3, P4
            $table->string('status', 30)->default('investigating'); // investigating, identified, monitoring, resolved
            $table->text('impact_summary');
            $table->foreignId('commander_id')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTimeTz('started_at');
            $table->dateTimeTz('acknowledged_at')->nullable();
            $table->dateTimeTz('resolved_at')->nullable();
            $table->integer('mtta_minutes')->nullable();
            $table->integer('mttr_minutes')->nullable();
            $table->timestampsTz();

            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'severity']);
        });

        Schema::create('incident_updates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('incident_id')->constrained('incidents')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status_update', 30);
            $table->text('message');
            $table->dateTimeTz('posted_at');

            $table->index(['incident_id', 'posted_at']);
        });

        Schema::create('incident_post_mortems', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('incident_id')->constrained('incidents')->cascadeOnDelete();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('root_cause');
            $table->text('trigger_event');
            $table->text('lessons_learned')->nullable();
            $table->json('action_items')->nullable();
            $table->string('status', 30)->default('draft'); // draft, published, reviewed
            $table->dateTimeTz('published_at')->nullable();
            $table->timestampsTz();

            $table->unique(['incident_id']);
        });

        Schema::create('on_call_rotas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('shift_name', 100);
            $table->foreignId('primary_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('secondary_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTimeTz('shift_start');
            $table->dateTimeTz('shift_end');
            $table->boolean('is_active')->default(true);
            $table->timestampsTz();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('on_call_rotas');
        Schema::dropIfExists('incident_post_mortems');
        Schema::dropIfExists('incident_updates');
        Schema::dropIfExists('incidents');
    }
};
