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
        Schema::create('promotions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_id')
                ->constrained('shops')
                ->cascadeOnDelete();
            $table->string('name');
            $table->decimal('percentage', 5, 2)->default(0);
            $table->integer('amount')->default(0);
            $table->json('days_of_week')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('applicable_to_products')->default(true);
            $table->boolean('applicable_to_services')->default(true);
            $table->date('starts_at')->nullable();
            $table->date('ends_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('promotions');
    }
};
