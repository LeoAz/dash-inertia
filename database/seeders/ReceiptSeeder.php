<?php

namespace Database\Seeders;

use App\Models\Receipt;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class ReceiptSeeder extends Seeder
{
    /**
     * Seed the receipts table.
     */
    public function run(): void
    {
        // Ensure there is at least one user who can be the generator
        $userId = User::query()->inRandomOrder()->value('id') ?? User::factory()->create()->id;

        Sale::query()
            ->with(['receipt', 'shop'])
            ->orderBy('id')
            ->chunk(200, function ($sales) use ($userId) {
                foreach ($sales as $sale) {
                    if ($sale->receipt) {
                        continue; // already has a receipt
                    }

                    if (! $sale->shop_id) {
                        // Receipts require a non-null shop, skip such edge sales
                        continue;
                    }

                    $saleDate = $sale->sale_date ? Carbon::parse($sale->sale_date) : now();
                    $generatedAt = $saleDate->copy()->setTime(random_int(8, 20), random_int(0, 59));

                    $prefix = 'RC';
                    $datePart = $saleDate->format('Ymd');
                    $receiptNumber = sprintf(
                        '%s-%s-%s-%s',
                        $prefix,
                        $datePart,
                        str_pad((string) $sale->shop_id, 2, '0', STR_PAD_LEFT),
                        Str::upper(Str::random(5))
                    );

                    $receipt = new Receipt;
                    $receipt->sale_id = $sale->id;
                    $receipt->shop_id = $sale->shop_id;
                    $receipt->receipt_number = $receiptNumber;
                    $receipt->generated_by = $userId;
                    $receipt->generated_at = $generatedAt;
                    $receipt->save();
                }
            });
    }
}
