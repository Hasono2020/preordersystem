import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
    all:      'All Customers',
    normal:   'Normal Only',
    reseller: 'Reseller Only',
};

export default function PromoRulesIndex({ rules, flash }: any) {
    function toggleActive(rule: any) {
        router.patch(`/promo-rules/${rule.id}`, {
            ...rule,
            is_active: !rule.is_active,
        }, { preserveScroll: true });
    }

    function destroy(rule: any) {
        if (!confirm(`Delete rule "${rule.label}"?`)) return;
        router.delete(`/promo-rules/${rule.id}`);
    }

    return (
        <>
            <Head title="Promo Rules" />
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Promo Rules</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Manage automatic discount &amp; free shipping rules applied on order creation.
                        </p>
                    </div>
                    <Link href="/promo-rules/create">
                        <Button size="sm"><Plus className="size-4 mr-1" /> Add Rule</Button>
                    </Link>
                </div>

                {flash?.success && (
                    <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                        {flash.success}
                    </div>
                )}

                {/* Rules table */}
                <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground">
                            <tr>
                                <th className="text-left px-4 py-3">Label</th>
                                <th className="text-left px-4 py-3">Applies To</th>
                                <th className="text-center px-4 py-3">Min Items</th>
                                <th className="text-right px-4 py-3">Flat Discount</th>
                                <th className="text-right px-4 py-3">Per-item Discount</th>
                                <th className="text-right px-4 py-3">Free Ship Max</th>
                                <th className="text-center px-4 py-3">Active</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {rules.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-center px-4 py-8 text-muted-foreground">
                                        No promo rules yet. Click "Add Rule" to create one.
                                    </td>
                                </tr>
                            )}
                            {rules.map((rule: any) => (
                                <tr key={rule.id} className={!rule.is_active ? 'opacity-40' : ''}>
                                    <td className="px-4 py-3 font-medium">{rule.label}</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                                            ${rule.customer_type === 'reseller' ? 'bg-purple-100 text-purple-700' :
                                              rule.customer_type === 'normal'   ? 'bg-blue-100 text-blue-700' :
                                                                                  'bg-gray-100 text-gray-700'}`}>
                                            {TYPE_LABELS[rule.customer_type]}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center font-mono">{rule.min_items}+</td>
                                    <td className="px-4 py-3 text-right font-mono">
                                        {rule.discount_flat > 0 ? `Rp${Number(rule.discount_flat).toLocaleString()}` : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono">
                                        {rule.discount_per_item > 0 ? `Rp${Number(rule.discount_per_item).toLocaleString()} × items` : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono">
                                        {rule.free_shipping_max > 0 ? `Rp${Number(rule.free_shipping_max).toLocaleString()}` : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button onClick={() => toggleActive(rule)} className="text-muted-foreground hover:text-foreground">
                                            {rule.is_active
                                                ? <ToggleRight className="size-5 text-green-600" />
                                                : <ToggleLeft  className="size-5" />}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2 justify-end">
                                            <Link href={`/promo-rules/${rule.id}/edit`}>
                                                <Button variant="ghost" size="icon">
                                                    <Pencil className="size-4" />
                                                </Button>
                                            </Link>
                                            <Button variant="ghost" size="icon" onClick={() => destroy(rule)}>
                                                <Trash2 className="size-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Legend */}
                <div className="text-xs text-muted-foreground space-y-1 border rounded p-3 bg-muted/20">
                    <p className="font-medium text-foreground">How rules are applied on order creation:</p>
                    <p>• Rules are matched by customer type and total item quantity.</p>
                    <p>• The <strong>highest matching rule</strong> wins — lower rules do not stack.</p>
                    <p>• If a reseller rule matches (e.g. 30+ items), it overrides all "all customer" rules completely.</p>
                    <p>• Free shipping is capped at the actual shipping fee (you won't get more than what's charged).</p>
                </div>
            </div>
        </>
    );
}