<?php

namespace App\Http\Controllers;

use App\Models\ShippingArea;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ShippingAreaController extends Controller
{
    public function index()
    {
        $areas = ShippingArea::latest()->get();
        return Inertia::render('shipping-areas/index', compact('areas'));
    }

    public function create()
    {
        return Inertia::render('shipping-areas/create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'         => 'required|string|max:255|unique:shipping_areas,name',
            'flat_price'   => 'required|numeric|min:0',
            'price_per_kg' => 'required|numeric|min:0',
        ]);

        ShippingArea::create($validated);

        return redirect()->route('shipping-areas.index')
            ->with('success', 'Shipping area added successfully.');
    }

    public function edit(ShippingArea $shippingArea)
    {
        return Inertia::render('shipping-areas/edit', compact('shippingArea'));
    }

    public function update(Request $request, ShippingArea $shippingArea)
    {
        $validated = $request->validate([
            'name'         => 'required|string|max:255|unique:shipping_areas,name,' . $shippingArea->id,
            'flat_price'   => 'required|numeric|min:0',
            'price_per_kg' => 'required|numeric|min:0',
        ]);

        $shippingArea->update($validated);

        return redirect()->route('shipping-areas.index')
            ->with('success', 'Shipping area updated.');
    }

    public function destroy(ShippingArea $shippingArea)
    {
        $shippingArea->delete();
        return redirect()->route('shipping-areas.index')
            ->with('success', 'Shipping area deleted.');
    }
}