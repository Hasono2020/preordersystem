<?php

use App\Http\Controllers\CustomerController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ShippingAreaController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ImportExportController;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {

    Route::get('dashboard', \App\Http\Controllers\DashboardController::class)->name('dashboard');

    // Delete multiple customers at once
    Route::delete('customers/bulk-delete', [CustomerController::class, 'bulkDelete'])
        ->name('customers.bulk-delete');

Route::resource('customers', CustomerController::class)->except(['show']);

    // Customers
    Route::resource('customers', CustomerController::class)
        ->except(['show']);

    // Orders
    Route::resource('orders', OrderController::class);

    // Reports — admin only
    Route::get('reports', [ReportController::class, 'index'])
        ->middleware('admin')
        ->name('reports.index');

    // Print customer report
    Route::get('customers/{customer}/print', [CustomerController::class, 'print'])
        ->name('customers.print');

    // Users — admin only
    Route::resource('users', UserController::class)
        ->except(['show'])
        ->middleware('admin');

    // Shipping Areas — all users
    Route::resource('shipping-areas', ShippingAreaController::class)
        ->except(['show']);

    // Products
    Route::resource('products', ProductController::class)->except(['show']);
    Route::get('products-search', [ProductController::class, 'search'])->name('products.search');

    // Import / Export
    Route::get('import-export',          [ImportExportController::class, 'index'])->name('import-export.index');
    Route::post('import-export/preview', [ImportExportController::class, 'preview'])->name('import-export.preview');
    Route::post('import-export/confirm', [ImportExportController::class, 'import'])->name('import-export.confirm');
    Route::get('import-export/export',   [ImportExportController::class, 'export'])->name('import-export.export');
    
    });

require __DIR__.'/settings.php';