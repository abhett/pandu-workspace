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
        Schema::create('system_service_healths', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('service_name', 50)->unique();
            $table->string('display_name', 100);
            $table->string('category', 50)->default('core'); // core, ai, storage, networking
            $table->string('status', 30)->default('operational'); // operational, degraded, outage, maintenance
            $table->decimal('uptime_percentage', 5, 2)->default(99.99);
            $table->integer('latency_ms')->default(25);
            $table->jsonb('meta')->nullable();
            $table->timestamp('last_checked_at')->nullable();
            $table->timestamps();
        });

        Schema::create('system_incidents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title');
            $table->text('description');
            $table->string('severity', 30)->default('minor'); // minor, major, critical, maintenance
            $table->string('status', 30)->default('resolved'); // investigating, identified, monitoring, resolved
            $table->jsonb('affected_services')->nullable();
            $table->timestamp('started_at');
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('system_incidents');
        Schema::dropIfExists('system_service_healths');
    }
};
