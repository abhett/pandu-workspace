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
        Schema::create('kaizen_initiatives', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignUuid('retrospective_item_id')->nullable()->constrained('retrospective_items')->nullOnDelete();
            $table->foreignUuid('source_sprint_id')->nullable()->constrained('sprints')->nullOnDelete();
            $table->foreignUuid('target_sprint_id')->nullable()->constrained('sprints')->nullOnDelete();
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('pillar', 50)->default('engineering_quality'); // engineering_quality, process_agility, team_collaboration, developer_experience
            $table->string('title', 200);
            $table->text('problem_statement');
            $table->text('action_plan');
            $table->text('expected_impact')->nullable();
            $table->text('measured_outcome')->nullable();
            $table->string('status', 30)->default('in_progress'); // proposed, in_progress, implemented, verified_effective, abandoned
            $table->integer('impact_score')->default(0); // 0 to 100
            $table->date('due_date')->nullable();
            $table->dateTimeTz('verified_at')->nullable();
            $table->timestampsTz();

            $table->index(['organization_id', 'project_id', 'status']);
            $table->index(['project_id', 'pillar']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kaizen_initiatives');
    }
};
