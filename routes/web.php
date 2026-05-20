<?php

use App\Http\Controllers\CustomerController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ReportController;
use Illuminate\Support\Facades\Route;

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

    // Print Specific Order Report
    Route::get('customers/{customer}/print', [CustomerController::class, 'print'])
    ->name('customers.print');
});

require __DIR__.'/settings.php';