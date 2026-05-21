<?php

use App\Http\Controllers\CustomerController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ShippingAreaController;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {

    Route::get('dashboard', \App\Http\Controllers\DashboardController::class)->name('dashboard');

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
});

require __DIR__.'/settings.php';