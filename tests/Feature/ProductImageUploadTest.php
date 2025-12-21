<?php

use App\Models\Product;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Storage::fake('public');

    // Create roles if they don't exist
    Role::firstOrCreate(['name' => 'Super admin']);

    $this->user = User::factory()->create();
    $this->user->assignRole('Super admin');

    $this->shop = Shop::factory()->create();
    $this->user->shops()->attach($this->shop);
});

test('a super admin can upload a product image when creating a product', function () {
    $this->actingAs($this->user);

    $file = UploadedFile::fake()->image('product.jpg');

    $response = $this->post(route('shops.products.store', $this->shop), [
        'name' => 'New Product',
        'quantity' => 10,
        'price' => 99.99,
        'description' => 'Test description',
        'image' => $file,
    ]);

    $response->assertRedirect(route('shops.products.index', $this->shop));

    $product = Product::where('name', 'New Product')->first();
    expect($product->image_path)->not->toBeNull();
    Storage::disk('public')->assertExists($product->image_path);
});

test('a super admin can update a product image', function () {
    $this->actingAs($this->user);

    $product = Product::factory()->create([
        'shop_id' => $this->shop->id,
        'image_path' => 'products/old.jpg',
    ]);

    Storage::disk('public')->put('products/old.jpg', 'fake content');

    $file = UploadedFile::fake()->image('updated.jpg');

    $response = $this->post(route('shops.products.update', [$this->shop, $product]), [
        'name' => 'Updated Product',
        'quantity' => 5,
        'price' => 49.99,
        '_method' => 'PUT', // Simulating what Inertia form does with files
        'image' => $file,
    ]);

    $response->assertRedirect(route('shops.products.index', $this->shop));

    $product->refresh();
    expect($product->image_path)->not->toBe('products/old.jpg');
    Storage::disk('public')->assertExists($product->image_path);
    Storage::disk('public')->assertMissing('products/old.jpg');
});
