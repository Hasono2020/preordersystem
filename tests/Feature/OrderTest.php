<?php

use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeStaff(): User
{
    return User::factory()->create(['role' => 'staff']);
}

function makeAdmin(): User
{
    return User::factory()->create(['role' => 'admin']);
}

function makeCustomer(): Customer
{
    return Customer::factory()->create();
}

function makeProduct(int $quantity = 10): Product
{
    return Product::factory()->create(['quantity' => $quantity, 'price' => 50000]);
}

function orderPayload(Customer $customer, array $items = []): array
{
    return [
        'customer_mode'       => 'existing',
        'customer_id'         => $customer->id,
        'order_date'          => '2026-01-01',
        'status'              => 'bought',
        'discount'            => 0,
        'weight'              => 0,
        'shipping_fee_per_kg' => 0,
        'down_payment'        => 0,
        'courier'             => null,
        'notes'               => null,
        'items'               => $items ?: [[
            'product_id'   => null,
            'product_name' => 'Test Item',
            'color'        => 'RED',
            'size'         => 'M',
            'quantity'     => 1,
            'price'        => 100000,
        ]],
    ];
}

// ─── Authentication ────────────────────────────────────────────────────────────

test('guests are redirected to login when visiting orders', function () {
    $this->get(route('orders.index'))->assertRedirect(route('login'));
});

// ─── Index ────────────────────────────────────────────────────────────────────

test('authenticated users can view the orders list', function () {
    $this->actingAs(makeStaff())
        ->get(route('orders.index'))
        ->assertOk();
});

// ─── Create / Store ───────────────────────────────────────────────────────────

test('staff can create an order with a manual item', function () {
    $customer = makeCustomer();

    $this->actingAs(makeStaff())
        ->post(route('orders.store'), orderPayload($customer))
        ->assertRedirect(route('orders.index'));

    expect(Order::count())->toBe(1);
    expect(Order::first()->total_price)->toBe(100000.0);
});

test('creating an order records the correct user_id', function () {
    $staff    = makeStaff();
    $customer = makeCustomer();

    $this->actingAs($staff)
        ->post(route('orders.store'), orderPayload($customer));

    expect(Order::first()->user_id)->toBe($staff->id);
});

test('order total is calculated correctly from items and discount', function () {
    $customer = makeCustomer();
    $payload  = orderPayload($customer, [[
        'product_id'   => null,
        'product_name' => 'Shirt',
        'color'        => 'BLUE',
        'size'         => 'L',
        'quantity'     => 2,
        'price'        => 150000,
    ]]);
    $payload['discount'] = 50000;

    $this->actingAs(makeStaff())
        ->post(route('orders.store'), $payload);

    // total = (2 × 150000) − 50000 = 250000
    expect(Order::first()->total_price)->toBe(250000.0);
});

test('down payment is capped at total price', function () {
    $customer = makeCustomer();
    $payload  = orderPayload($customer);
    $payload['down_payment'] = 9999999; // larger than total

    $this->actingAs(makeStaff())
        ->post(route('orders.store'), $payload);

    $order = Order::first();
    expect($order->down_payment)->toBe($order->total_price);
    expect($order->remaining_payment)->toBe(0.0);
});

// ─── Stock management ─────────────────────────────────────────────────────────

test('creating an order with a linked product decrements its stock', function () {
    $product  = makeProduct(10);
    $customer = makeCustomer();
    $payload  = orderPayload($customer, [[
        'product_id'   => $product->id,
        'product_name' => $product->name,
        'color'        => null,
        'size'         => null,
        'quantity'     => 3,
        'price'        => $product->price,
    ]]);

    $this->actingAs(makeStaff())
        ->post(route('orders.store'), $payload);

    expect($product->fresh()->quantity)->toBe(7);
});

test('order is rejected when product stock is insufficient', function () {
    $product  = makeProduct(2); // only 2 in stock
    $customer = makeCustomer();
    $payload  = orderPayload($customer, [[
        'product_id'   => $product->id,
        'product_name' => $product->name,
        'color'        => null,
        'size'         => null,
        'quantity'     => 5, // requesting 5
        'price'        => $product->price,
    ]]);

    $this->actingAs(makeStaff())
        ->post(route('orders.store'), $payload)
        ->assertSessionHasErrors('items.0.quantity');

    expect(Order::count())->toBe(0);
    expect($product->fresh()->quantity)->toBe(2); // stock unchanged
});

test('deleting an order restores product stock', function () {
    $product  = makeProduct(10);
    $customer = makeCustomer();
    $payload  = orderPayload($customer, [[
        'product_id'   => $product->id,
        'product_name' => $product->name,
        'color'        => null,
        'size'         => null,
        'quantity'     => 4,
        'price'        => $product->price,
    ]]);

    $staff = makeStaff();
    $this->actingAs($staff)->post(route('orders.store'), $payload);
    expect($product->fresh()->quantity)->toBe(6);

    $order = Order::first();
    $this->actingAs($staff)->delete(route('orders.destroy', $order));
    expect($product->fresh()->quantity)->toBe(10); // fully restored
});

// ─── Authorization ────────────────────────────────────────────────────────────

test('staff cannot edit an order created by another user', function () {
    $owner    = makeStaff();
    $intruder = makeStaff();
    $customer = makeCustomer();

    $this->actingAs($owner)->post(route('orders.store'), orderPayload($customer));
    $order = Order::first();

    $this->actingAs($intruder)
        ->get(route('orders.edit', $order))
        ->assertForbidden();
});

test('staff cannot delete an order created by another user', function () {
    $owner    = makeStaff();
    $intruder = makeStaff();
    $customer = makeCustomer();

    $this->actingAs($owner)->post(route('orders.store'), orderPayload($customer));
    $order = Order::first();

    $this->actingAs($intruder)
        ->delete(route('orders.destroy', $order))
        ->assertForbidden();

    expect(Order::count())->toBe(1); // order still exists
});

test('admin can edit any order regardless of who created it', function () {
    $staff    = makeStaff();
    $admin    = makeAdmin();
    $customer = makeCustomer();

    $this->actingAs($staff)->post(route('orders.store'), orderPayload($customer));
    $order = Order::first();

    $this->actingAs($admin)
        ->get(route('orders.edit', $order))
        ->assertOk();
});

test('admin can delete any order', function () {
    $staff    = makeStaff();
    $admin    = makeAdmin();
    $customer = makeCustomer();

    $this->actingAs($staff)->post(route('orders.store'), orderPayload($customer));
    $order = Order::first();

    $this->actingAs($admin)
        ->delete(route('orders.destroy', $order))
        ->assertRedirect(route('orders.index'));

    expect(Order::count())->toBe(0);
});

// ─── Customer bulk delete ─────────────────────────────────────────────────────

test('staff cannot use bulk delete all customers', function () {
    makeCustomer();
    makeCustomer();

    $this->actingAs(makeStaff())
        ->delete(route('customers.bulk-delete'), ['all' => true])
        ->assertForbidden();

    expect(Customer::count())->toBe(2); // untouched
});

test('admin can bulk delete all customers', function () {
    makeCustomer();
    makeCustomer();

    $this->actingAs(makeAdmin())
        ->delete(route('customers.bulk-delete'), ['all' => true])
        ->assertRedirect(route('customers.index'));

    expect(Customer::count())->toBe(0);
});

// ─── Customer delete guard ────────────────────────────────────────────────────

test('cannot delete a customer who has existing orders', function () {
    $staff    = makeStaff();
    $customer = makeCustomer();

    $this->actingAs($staff)->post(route('orders.store'), orderPayload($customer));
    expect(Order::count())->toBe(1);

    $this->actingAs($staff)
        ->delete(route('customers.destroy', $customer))
        ->assertRedirect(route('customers.index'))
        ->assertSessionHas('error');

    expect(Customer::count())->toBe(1); // still there
});

test('can delete a customer with no orders', function () {
    $customer = makeCustomer();

    $this->actingAs(makeStaff())
        ->delete(route('customers.destroy', $customer))
        ->assertRedirect(route('customers.index'));

    expect(Customer::count())->toBe(0);
});