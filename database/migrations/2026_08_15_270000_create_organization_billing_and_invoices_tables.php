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
        Schema::create('organization_subscriptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->unique()->index();
            $table->string('plan_tier', 30)->default('pro'); // starter, pro, enterprise
            $table->string('status', 30)->default('active'); // active, trialing, past_due, canceled
            $table->string('billing_cycle', 20)->default('monthly'); // monthly, annually
            $table->integer('seat_limit')->default(50);
            $table->integer('storage_limit_gb')->default(100);
            $table->integer('ai_credits_limit')->default(10000000); // 10M tokens
            $table->integer('automation_runs_limit')->default(5000);
            $table->bigInteger('price_cents')->default(1500000000); // IDR 15.000.000 (cents)
            $table->string('currency', 10)->default('IDR');
            $table->timestamp('current_period_start')->nullable();
            $table->timestamp('current_period_end')->nullable();
            $table->string('payment_method_type', 50)->default('card'); // card, bank_transfer, corporate_invoice
            $table->string('payment_method_last4', 10)->nullable();
            $table->string('payment_method_brand', 30)->nullable();
            $table->string('billing_email')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
        });

        Schema::create('organization_invoices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->index();
            $table->string('invoice_number', 50)->unique();
            $table->bigInteger('amount_cents');
            $table->string('currency', 10)->default('IDR');
            $table->string('status', 30)->default('paid'); // paid, pending, failed
            $table->string('plan_tier', 30);
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('due_at')->nullable();
            $table->date('billing_period_start')->nullable();
            $table->date('billing_period_end')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('organization_invoices');
        Schema::dropIfExists('organization_subscriptions');
    }
};
