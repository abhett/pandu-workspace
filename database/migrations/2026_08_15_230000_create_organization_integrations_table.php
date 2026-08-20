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
        Schema::create('organization_integrations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->index();
            $table->string('provider', 50); // github, gitlab, slack, discord, figma, google_drive, google_calendar, zapier, custom_webhook
            $table->string('name', 100);
            $table->string('category', 50)->default('automation'); // development, communication, calendar, storage, design, automation
            $table->json('config')->nullable(); // webhook_url, channel_id, api_key, events, repo_url, etc.
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_synced_at')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('organization_integrations');
    }
};
