<?php

namespace App\Http\Controllers;

use App\Models\PromoRule;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PromoRuleController extends Controller
{
    // ── Admin UI ──────────────────────────────────────────────

    public function index()
    {
        $rules = PromoRule::orderBy('customer_type')->orderBy('min_items')->get();
        return Inertia::render('promo-rules/index', compact('rules'));
    }

    public function create()
    {
        return Inertia::render('promo-rules/create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'label'             => 'required|string|max:255',
            'customer_type'     => 'required|in:all,normal,reseller',
            'min_items'         => 'required|integer|min:1',
            'discount_flat'     => 'nullable|integer|min:0',
            'discount_per_item' => 'nullable|integer|min:0',
            'free_shipping_max' => 'nullable|integer|min:0',
            'is_active'         => 'boolean',
        ]);

        PromoRule::create([
            'label'             => $validated['label'],
            'customer_type'     => $validated['customer_type'],
            'min_items'         => $validated['min_items'],
            'discount_flat'     => $validated['discount_flat']     ?? 0,
            'discount_per_item' => $validated['discount_per_item'] ?? 0,
            'free_shipping_max' => $validated['free_shipping_max'] ?? 0,
            'is_active'         => $validated['is_active']         ?? true,
        ]);

        return redirect()->route('promo-rules.index')
            ->with('success', 'Promo rule created.');
    }

    public function edit(PromoRule $promoRule)
    {
        return Inertia::render('promo-rules/edit', ['rule' => $promoRule]);
    }

    public function update(Request $request, PromoRule $promoRule)
    {
        $validated = $request->validate([
            'label'             => 'required|string|max:255',
            'customer_type'     => 'required|in:all,normal,reseller',
            'min_items'         => 'required|integer|min:1',
            'discount_flat'     => 'nullable|integer|min:0',
            'discount_per_item' => 'nullable|integer|min:0',
            'free_shipping_max' => 'nullable|integer|min:0',
            'is_active'         => 'boolean',
        ]);

        $promoRule->update([
            'label'             => $validated['label'],
            'customer_type'     => $validated['customer_type'],
            'min_items'         => $validated['min_items'],
            'discount_flat'     => $validated['discount_flat']     ?? 0,
            'discount_per_item' => $validated['discount_per_item'] ?? 0,
            'free_shipping_max' => $validated['free_shipping_max'] ?? 0,
            'is_active'         => $validated['is_active']         ?? true,
        ]);

        return redirect()->route('promo-rules.index')
            ->with('success', 'Promo rule updated.');
    }

    public function destroy(PromoRule $promoRule)
    {
        $promoRule->delete();
        return redirect()->route('promo-rules.index')
            ->with('success', 'Promo rule deleted.');
    }

    // ── API used by order create/edit form ────────────────────
    // Returns all active rules so the frontend can calculate discounts client-side.
    // No sensitive data exposed — just the promo configuration.

    public function api()
    {
        $rules = PromoRule::where('is_active', true)
            ->orderBy('customer_type')
            ->orderBy('min_items')
            ->get(['id', 'label', 'customer_type', 'min_items',
                   'discount_flat', 'discount_per_item', 'free_shipping_max']);

        return response()->json($rules);
    }
}