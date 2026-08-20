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
        Schema::create('team_mood_pulses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('mood_score'); // 1 = Exhausted, 2 = Stressed, 3 = Neutral, 4 = Good, 5 = Energized
            $table->unsignedTinyInteger('energy_level')->default(3); // 1 to 5
            $table->string('workload_feeling', 30)->default('manageable'); // underworked, manageable, heavy, overwhelmed
            $table->json('tags')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_anonymous')->default(false);
            $table->date('pulse_date');
            $table->timestampsTz();

            $table->unique(['organization_id', 'user_id', 'pulse_date']);
            $table->index(['organization_id', 'pulse_date']);
        });

        Schema::create('wellness_initiatives', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('title', 150);
            $table->string('category', 50)->default('workload_adjustment'); // workload_adjustment, no_meeting_day, team_building, training_wellness, process_simplification
            $table->string('status', 30)->default('active'); // active, in_progress, completed
            $table->text('impact_summary')->nullable();
            $table->date('target_date')->nullable();
            $table->timestampsTz();

            $table->index(['organization_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('wellness_initiatives');
        Schema::dropIfExists('team_mood_pulses');
    }
};
