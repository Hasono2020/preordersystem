import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

// ── Tag chip input ────────────────────────────────────────────────────────────
function TagInput({ id, value, onChange, placeholder }: {
    id: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
    const [input, setInput] = useState('');
    function addTag(raw: string) {
        const tag = raw.trim().toUpperCase();
        if (!tag || value.includes(tag)) { setInput(''); return; }
        onChange([...value, tag]); setInput('');
    }
    function removeTag(i: number) { onChange(value.filter((_, idx) => idx !== i)); }
    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') { e.preventDefault(); addTag(input); }
        if (e.key === ',')     { e.preventDefault(); addTag(input); }
        if (e.key === 'Backspace' && input === '' && value.length > 0) removeTag(value.length - 1);
    }
    return (
        <div className="min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm
            flex flex-wrap gap-1.5 items-center cursor-text focus-within:ring-2 focus-within:ring-ring"
            onClick={() => document.getElementById(id)?.focus()}>
            {value.map((tag, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
                    {tag}
                    <button type="button" onClick={() => removeTag(i)} className="hover:text-destructive"><X className="size-3" /></button>
                </span>
            ))}
            <input id={id} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown} onBlur={() => { if (input.trim()) addTag(input); }}
                placeholder={value.length === 0 ? placeholder : ''}
                className="flex-1 min-w-20 bg-transparent outline-none placeholder:text-muted-foreground" />
        </div>
    );
}

// ── Variant stock grid ────────────────────────────────────────────────────────
// Rows = colors, Columns = sizes. Each cell = quantity input for that combination.
function VariantGrid({ colors, sizes, variants, onChange }: {
    colors: string[]; sizes: string[];
    variants: Record<string, number>; onChange: (v: Record<string, number>) => void;
}) {
    function k(color: string, size: string) { return `${color}__${size}`; }
    function setQty(color: string, size: string, qty: number) {
        onChange({ ...variants, [k(color, size)]: qty });
    }
    const total = Object.values(variants).reduce((s, n) => s + (n || 0), 0);
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label>Stock per Variant</Label>
                <span className="text-xs text-muted-foreground">Total stock: <strong>{total}</strong></span>
            </div>
            <div className="rounded-lg border overflow-auto">
                <table className="w-full text-sm">
                    <thead className="bg-muted text-muted-foreground">
                        <tr>
                            <th className="text-left px-3 py-2 font-medium">Color \ Size</th>
                            {sizes.map(s => <th key={s} className="px-3 py-2 font-medium text-center min-w-20">{s}</th>)}
                            <th className="px-3 py-2 font-medium text-right">Row total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {colors.map(color => {
                            const rowTotal = sizes.reduce((s, size) => s + (variants[k(color, size)] || 0), 0);
                            return (
                                <tr key={color} className="hover:bg-muted/30">
                                    <td className="px-3 py-2 font-medium">{color}</td>
                                    {sizes.map(size => (
                                        <td key={size} className="px-2 py-1.5 text-center">
                                            <Input type="number" min="0"
                                                value={variants[k(color, size)] ?? 0}
                                                onChange={e => setQty(color, size, parseInt(e.target.value) || 0)}
                                                className="w-16 text-center mx-auto" />
                                        </td>
                                    ))}
                                    <td className="px-3 py-2 text-right font-medium text-muted-foreground">{rowTotal}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="bg-muted/50 border-t">
                        <tr>
                            <td className="px-3 py-2 font-medium text-muted-foreground">Col total</td>
                            {sizes.map(size => {
                                const colTotal = colors.reduce((s, color) => s + (variants[k(color, size)] || 0), 0);
                                return <td key={size} className="px-3 py-2 text-center font-medium text-muted-foreground">{colTotal}</td>;
                            })}
                            <td className="px-3 py-2 text-right font-semibold">{total}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ProductCreate() {
    const { data, setData, post, processing, errors } = useForm<any>({
        code: '', name: '', price: '', weight: '',
        exclude_from_promo: false,
        variants: [],
    });

    const [colors,  setColors]  = useState<string[]>([]);
    const [sizes,   setSizes]   = useState<string[]>([]);
    const [varGrid, setVarGrid] = useState<Record<string, number>>({});

    // Sync grid state → variants array for the form
    useEffect(() => {
        const variants = colors.flatMap(color =>
            sizes.map(size => ({ color, size, quantity: varGrid[`${color}__${size}`] || 0 }))
        );
        setData('variants', variants);
    }, [colors, sizes, varGrid]);

    // Auto-detect Z-suffix products
    useEffect(() => {
        if (data.code.trim().toUpperCase().endsWith('Z')) setData('exclude_from_promo', true);
    }, [data.code]);

    function submit(e: React.FormEvent) { e.preventDefault(); post('/products'); }

    const totalStock = (data.variants as any[]).reduce((s: number, v: any) => s + (v.quantity || 0), 0);

    return (
        <>
            <Head title="Add Product" />
            <div className="p-6 max-w-2xl space-y-5">
                <div className="flex items-center gap-3">
                    <Link href="/products" className="text-muted-foreground hover:text-foreground text-sm">← Back</Link>
                    <h1 className="text-xl font-semibold">Add Product</h1>
                </div>

                <form onSubmit={submit} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Product Code *</Label>
                            <Input value={data.code} onChange={e => setData('code', e.target.value)}
                                placeholder="e.g. NA_01 or MZ_01" className="font-mono" />
                            {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label>Product Name *</Label>
                            <Input value={data.name} onChange={e => setData('name', e.target.value)} placeholder="e.g. Kemeja Casual" />
                            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label>Price (Rp) *</Label>
                            <Input type="number" min="0" value={data.price} onChange={e => setData('price', e.target.value)} placeholder="0" />
                            {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label>Weight (grams) *</Label>
                            <Input type="number" min="0" value={data.weight} onChange={e => setData('weight', e.target.value)} placeholder="0" />
                            {errors.weight && <p className="text-xs text-destructive">{errors.weight}</p>}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label>Colors</Label>
                        <TagInput id="tag-colors" value={colors} onChange={setColors} placeholder="Type a color, press Enter or comma — e.g. RED" />
                        <p className="text-xs text-muted-foreground">Press Enter or comma after each color. Click × to remove.</p>
                    </div>

                    <div className="space-y-1">
                        <Label>Sizes</Label>
                        <TagInput id="tag-sizes" value={sizes} onChange={setSizes} placeholder="Type a size, press Enter or comma — e.g. S" />
                        <p className="text-xs text-muted-foreground">Press Enter or comma after each size. Click × to remove.</p>
                    </div>

                    {/* Variant grid appears once both colors and sizes exist */}
                    {colors.length > 0 && sizes.length > 0 ? (
                        <VariantGrid colors={colors} sizes={sizes} variants={varGrid} onChange={setVarGrid} />
                    ) : (
                        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                            Add at least one <strong>color</strong> and one <strong>size</strong> above to set stock per variant.
                        </div>
                    )}

                    {errors.variants && <p className="text-xs text-destructive">{errors.variants}</p>}

                    {/* Promo exclusion toggle */}
                    <div className={`rounded-lg border p-4 transition-colors ${data.exclude_from_promo ? 'border-orange-300 bg-orange-50' : 'border-border bg-muted/30'}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm font-medium">Exclude from Promo</Label>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    This product will not receive any discount or free shipping from promo rules.
                                    {data.code.trim().toUpperCase().endsWith('Z') && (
                                        <span className="ml-1 text-orange-600 font-medium">Auto-detected: code ends with Z.</span>
                                    )}
                                </p>
                            </div>
                            <button type="button" role="switch" aria-checked={data.exclude_from_promo}
                                onClick={() => setData('exclude_from_promo', !data.exclude_from_promo)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                                    focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2
                                    ${data.exclude_from_promo ? 'bg-orange-500' : 'bg-muted-foreground/30'}`}>
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${data.exclude_from_promo ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>

                    <Button type="submit" disabled={processing}>Save Product</Button>
                </form>
            </div>
        </>
    );
}

ProductCreate.layout = (page: any) => page;