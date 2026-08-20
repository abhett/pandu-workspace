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
        Schema::create('user_ai_preferences', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('default_model', 50)->default('gemini'); // gpt4, claude3, gemini
            $table->integer('context_window')->default(75); // percentage or size
            $table->integer('tone_style')->default(40); // 0: direct/analytical, 100: creative/conversational
            $table->text('custom_system_prompt')->nullable();
            $table->boolean('auto_summarize_notifications')->default(true);
            $table->boolean('inline_suggestions')->default(true);
            $table->string('suggestion_density', 20)->default('medium'); // low, medium, high
            $table->boolean('model_training_opt_in')->default(false);
            $table->timestamps();
        });

        Schema::create('user_regional_preferences', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('language', 10)->default('id'); // id, en, en-gb, fr, ja, es
            $table->string('date_format', 20)->default('DD/MM/YYYY');
            $table->string('number_format', 20)->default('EU'); // EU (1.234,56), US (1,234.56), CH (1'234.56)
            $table->integer('first_day_of_week')->default(1); // 1: Monday, 0: Sunday, 6: Saturday
            $table->string('timezone', 50)->default('Asia/Jakarta');
            $table->boolean('time_format_24h')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_regional_preferences');
        Schema::dropIfExists('user_ai_preferences');
    }
};
