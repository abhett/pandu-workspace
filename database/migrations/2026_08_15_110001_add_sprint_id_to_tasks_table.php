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
        Schema::table('tasks', function (Blueprint $table) {
            $table->foreignUuid('sprint_id')
                ->nullable()
                ->after('status_id')
                ->constrained('sprints')
                ->nullOnDelete();

            $table->index(['project_id', 'sprint_id', 'rank']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropForeign(['sprint_id']);
            $table->dropColumn('sprint_id');
        });
    }
};
