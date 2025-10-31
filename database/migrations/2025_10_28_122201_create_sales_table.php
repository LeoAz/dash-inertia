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
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->string('uuid')->unique();
            $table->foreignId('shop_id')
                ->nullable()
                ->constrained()
                ->cascadeOnDelete();
            $table->foreignId('user_id')
                ->nullable()
                ->constrained()
                ->cascadeOnDelete();
            $table->string('customer_name');
            $table->string('customer_phone');
            $table->date('sale_date');
            $table->decimal('total_amount', 10, 2);
            $table->enum('status', ['En attente', 'Attribué'])->default('En attente');
            $table->foreignId('hairdresser_id')
                ->nullable()
                ->constrained()
                ->nullOnDelete();
            $table->foreignId('promotion_id')
                ->nullable()
                ->constrained('promotions')
                ->nullOnDelete();
            $table->decimal('discount_amount', 10, 2)
                ->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales');
    }
};
