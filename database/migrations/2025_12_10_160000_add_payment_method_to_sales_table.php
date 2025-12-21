<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            if (! Schema::hasColumn('sales', 'payment_method')) {
                $table->enum('payment_method', ['orange_money', 'caisse'])
                    ->default('caisse')
                    ->after('status');
                $table->index('payment_method');
            }
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            if (Schema::hasColumn('sales', 'payment_method')) {
                $table->dropIndex(['payment_method']);
                $table->dropColumn('payment_method');
            }
        });
    }
};
