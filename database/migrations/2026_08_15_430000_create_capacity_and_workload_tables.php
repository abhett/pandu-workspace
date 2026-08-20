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
        Schema::create('member_capacity_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('weekly_capacity_hours', 5, 2)->default(40.00);
            $table->decimal('max_story_points_per_sprint', 5, 1)->default(20.0);
            $table->decimal('fte_ratio', 3, 2)->default(1.00); // 1.0 = full time, 0.5 = half time
            $table->boolean('is_active')->default(true);
            $table->timestampsTz();

            $table->unique(['organization_id', 'user_id']);
        });

        Schema::create('member_time_off_schedules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('type', 30)->default('vacation'); // vacation, sick_leave, training, public_holiday, other
            $table->string('title', 100);
            $table->date('start_date');
            $table->date('end_date');
            $table->decimal('hours_deducted', 5, 2)->default(8.00);
            $table->text('notes')->nullable();
            $table->timestampsTz();

            $table->index(['organization_id', 'user_id', 'start_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('member_time_off_schedules');
        Schema::dropIfExists('member_capacity_settings');
    }
};
