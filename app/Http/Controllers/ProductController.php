<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $products = Product::when($request->search, fn($q) =>
                $q->where('code', 'like', '%'.$request->search.'%')
                  ->orWhere('name', 'like', '%'.$request->search.'%')
            )
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('products/index', [
            'products' => $products,
            'filters'  => $request->only('search'),
        ]);
    }

    public function create()
    {
        return Inertia::render('products/create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code'     => 'required|string|max:50|unique:products,code',
            'name'     => 'required|string|max:255',
            'price'    => 'required|numeric|min:0',
            'weight'   => 'required|numeric|min:0',
            'quantity' => 'required|integer|min:0',
            'colors'   => 'nullable|string',
            'sizes'    => 'nullable|string',
        ]);

        Product::create([
            'code'     => strtoupper(trim($validated['code'])),
            'name'     => $validated['name'],
            'price'    => $validated['price'],
            'weight'   => $validated['weight'],
            'quantity' => $validated['quantity'],
            'colors'   => $validated['colors']
                ? array_filter(array_map('trim', explode(',', strtoupper($validated['colors']))))
                : [],
            'sizes'    => $validated['sizes']
                ? array_filter(array_map('trim', explode(',', strtoupper($validated['sizes']))))
                : [],
        ]);

        return redirect()->route('products.index')
            ->with('success', 'Product added successfully.');
    }

    public function edit(Product $product)
    {
        return Inertia::render('products/edit', compact('product'));
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'code'     => 'required|string|max:50|unique:products,code,' . $product->id,
            'name'     => 'required|string|max:255',
            'price'    => 'required|numeric|min:0',
            'weight'   => 'required|numeric|min:0',
            'quantity' => 'required|integer|min:0',
            'colors'   => 'nullable|string',
            'sizes'    => 'nullable|string',
        ]);

        $product->update([
            'code'     => strtoupper(trim($validated['code'])),
            'name'     => $validated['name'],
            'price'    => $validated['price'],
            'weight'   => $validated['weight'],
            'quantity' => $validated['quantity'],
            'colors'   => $validated['colors']
                ? array_filter(array_map('trim', explode(',', strtoupper($validated['colors']))))
                : [],
            'sizes'    => $validated['sizes']
                ? array_filter(array_map('trim', explode(',', strtoupper($validated['sizes']))))
                : [],
        ]);

        return redirect()->route('products.index')
            ->with('success', 'Product updated.');
    }

    public function destroy(Product $product)
    {
        $product->delete();
        return redirect()->route('products.index')
            ->with('success', 'Product deleted.');
    }

    public function search(Request $request)
    {
        $products = Product::where('code', 'like', '%'.$request->q.'%')
            ->orWhere('name', 'like', '%'.$request->q.'%')
            ->limit(10)
            ->get(['id', 'code', 'name', 'price', 'weight', 'quantity', 'colors', 'sizes']);

        return response()->json($products);
    }
}