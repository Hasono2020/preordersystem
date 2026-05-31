<?php

use App\Http\Controllers\AllocationController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ImportExportController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\PromoRuleController;
use App\Http\Controllers\PurchaseOrderController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ShippingAreaController;
use App\Http\Controllers\SummaryController;
use App\Http\Controllers\TripController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {

    Route::get('dashboard', DashboardController::class)->name('dashboard');

    // Customers
    Route::delete('customers/bulk-delete', [CustomerController::class, 'bulkDelete'])
        ->name('customers.bulk-delete');
    Route::resource('customers', CustomerController::class)->except(['show']);
    Route::get('customers/{customer}/print', [CustomerController::class, 'print'])
        ->name('customers.print');

    // Orders
    Route::resource('orders', OrderController::class);
    Route::post('orders/{order}/payments', [PaymentController::class, 'store'])
        ->name('orders.payments.store');
    Route::delete('orders/{order}/payments/{payment}', [PaymentController::class, 'destroy'])
        ->name('orders.payments.destroy');

    // Reports — admin only
    Route::get('reports', [ReportController::class, 'index'])
        ->middleware('admin')
        ->name('reports.index');

    // Users — admin only
    Route::resource('users', UserController::class)
        ->except(['show'])
        ->middleware('admin');

    // Promo Rules — admin only
    Route::get('promo-rules/api', [PromoRuleController::class, 'api'])
        ->name('promo-rules.api');
    Route::resource('promo-rules', PromoRuleController::class)
        ->except(['show'])
        ->middleware('admin');

    // Shipping Areas
    Route::get('shipping-areas/export',   [ShippingAreaController::class, 'export'])
        ->name('shipping-areas.export');
    Route::get('shipping-areas/template', [ShippingAreaController::class, 'template'])
        ->name('shipping-areas.template');
    Route::post('shipping-areas/import',  [ShippingAreaController::class, 'import'])
        ->name('shipping-areas.import');
    Route::resource('shipping-areas', ShippingAreaController::class)->except(['show']);

    // Products
    Route::resource('products', ProductController::class)->except(['show']);
    Route::get('products-search', [ProductController::class, 'search'])
        ->name('products.search');

    // Import / Export
    Route::get('import-export',          [ImportExportController::class, 'index'])
        ->name('import-export.index');
    Route::get('import-export/template', [ImportExportController::class, 'template'])
        ->name('import-export.template');
    Route::post('import-export/preview', [ImportExportController::class, 'preview'])
        ->name('import-export.preview');
    Route::post('import-export/confirm', [ImportExportController::class, 'import'])
        ->name('import-export.confirm');
    Route::get('import-export/export',   [ImportExportController::class, 'export'])
        ->name('import-export.export');

    // Summary
    // FIX 7: Use imported class instead of inline FQCN.
    Route::get('summary', [SummaryController::class, 'index'])
        ->name('summary.index');

    // Trips
    Route::resource('trips', TripController::class);
    Route::post('trips/{trip}/close', [TripController::class, 'close'])
        ->name('trips.close');

    // Purchase Orders
    Route::resource('purchases', PurchaseOrderController::class);

    // Stock Allocation
    // FIX 7: Use imported class instead of inline FQCN.
    Route::get('purchases/{purchase}/allocate',  [AllocationController::class, 'show'])
        ->name('allocation.show');
    Route::post('purchases/{purchase}/allocate', [AllocationController::class, 'allocate'])
        ->name('allocation.allocate');
});

require __DIR__ . '/settings.php';