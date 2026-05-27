import { useEffect } from 'react';
import { Head } from '@inertiajs/react';

const STATUS_LABELS: Record<string, string> = {
    bought: 'Bought', keep: 'Keep', sold_out: 'Sold Out',
};

function deriveDiscount(order: any) {
    const totalDiscount = Number(order.discount);
    const shippingPerKg = Number(order.shipping_fee_per_kg);
    const weight        = Number(order.weight ?? 0);
    const totalShipping = Number(order.total_shipping_fee);
    const rawShipping   = shippingPerKg * weight;
    const freeShipping  = Math.min(Math.max(rawShipping - totalShipping, 0), totalDiscount);
    const priceDiscount = totalDiscount - freeShipping;
    return { totalDiscount, freeShipping, priceDiscount };
}

export default function CustomerPrint({ customer, summary }: any) {

    useEffect(() => {
        setTimeout(() => window.print(), 500);
    }, []);

    return (
        <>
            <Head title={`Sales Report — ${customer.name}`} />

            <style>{`
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: Arial, sans-serif; font-size: 13px; color: #000; background: #fff; }
                @media print {
                    @page { margin: 15mm; size: A4; }
                    .no-print { display: none !important; }
                    body { font-size: 11px; }
                }
                .page { max-width: 800px; margin: 0 auto; padding: 32px; }
                .header { border-bottom: 2px solid #000; padding-bottom: 16px; margin-bottom: 20px; }
                .header h1 { font-size: 20px; font-weight: bold; }
                .header-row { display: flex; justify-content: space-between; align-items: flex-start; }
                .company-name { font-size: 16px; font-weight: bold; }
                .label { font-size: 11px; color: #555; text-transform: uppercase; letter-spacing: 0.05em; }
                .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
                .summary-box { border: 1px solid #ccc; padding: 10px 12px; }
                .summary-box .val { font-size: 16px; font-weight: bold; margin-top: 4px; }
                .order-block { border: 1px solid #ccc; margin-bottom: 16px; }
                .order-header { background: #f5f5f5; padding: 8px 12px; border-bottom: 1px solid #ccc; display: flex; justify-content: space-between; align-items: center; }
                .order-header-left { display: flex; gap: 16px; align-items: center; }
                .badge { border: 1px solid #999; padding: 1px 8px; border-radius: 999px; font-size: 11px; }
                table { width: 100%; border-collapse: collapse; }
                th { background: #f9f9f9; text-align: left; padding: 7px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #555; border-bottom: 1px solid #ddd; }
                th.right, td.right { text-align: right; }
                td { padding: 7px 12px; border-bottom: 1px solid #eee; }
                tr:last-child td { border-bottom: none; }
                .order-footer { border-top: 1px solid #ccc; }
                .order-footer-summary { background: #f9f9f9; padding: 8px 12px; display: flex; justify-content: flex-end; gap: 32px; font-size: 12px; }
                .order-footer-summary span { color: #555; }
                .order-footer-summary strong { color: #000; }
                .promo-box { background: #f0faf0; border-top: 1px solid #c3e6cb; padding: 8px 12px; font-size: 11px; }
                .promo-box-title { font-weight: bold; color: #276749; margin-bottom: 5px; }
                .promo-row { display: flex; justify-content: space-between; color: #276749; padding: 2px 0; }
                .promo-row.total { font-weight: bold; border-top: 1px solid #c3e6cb; margin-top: 4px; padding-top: 5px; }
                .remaining-due { color: #c00; font-weight: bold; }
                .remaining-paid { color: #060; font-weight: bold; }
                .page-footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #ccc; text-align: center; font-size: 11px; color: #888; }
                .print-actions { position: fixed; bottom: 24px; right: 24px; display: flex; gap: 10px; }
                .btn-print { background: #000; color: #fff; border: none; padding: 10px 20px; font-size: 13px; cursor: pointer; border-radius: 6px; }
                .btn-close { background: #eee; color: #333; border: none; padding: 10px 20px; font-size: 13px; cursor: pointer; border-radius: 6px; }
                .btn-print:hover { background: #333; }
                .btn-close:hover { background: #ddd; }
            `}</style>

            <div className="page">

                {/* Header */}
                <div className="header">
                    <div className="header-row">
                        <div>
                            <div className="company-name">Sales System</div>
                            <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Internal Dashboard</div>
                            <h1 style={{ marginTop: 12 }}>Customer Sales Report</h1>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div className="label">Customer</div>
                            <div style={{ fontSize: 18, fontWeight: 'bold', marginTop: 4 }}>{customer.name}</div>
                            {customer.phone && <div style={{ color: '#444', marginTop: 2 }}>{customer.phone}</div>}
                            {customer.address && <div style={{ color: '#444', marginTop: 2, maxWidth: 200 }}>{customer.address}</div>}
                            <div style={{ marginTop: 8, color: '#666', fontSize: 11 }}>
                                Date: {new Date().toLocaleDateString('en-GB', {
                                    day: '2-digit', month: 'long', year: 'numeric'
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary */}
                <div className="summary-grid">
                    {[
                        { label: 'Total Orders',    value: summary.total_orders },
                        { label: 'Total Sales',     value: Number(summary.total_sales).toLocaleString() },
                        { label: 'Total Paid',      value: Number(summary.total_paid).toLocaleString() },
                        { label: 'Total Remaining', value: Number(summary.total_remaining).toLocaleString() },
                    ].map(card => (
                        <div className="summary-box" key={card.label}>
                            <div className="label">{card.label}</div>
                            <div className="val">{card.value}</div>
                        </div>
                    ))}
                </div>

                {/* Orders */}
                <div>
                    {customer.orders.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '32px', color: '#888', border: '1px solid #ccc' }}>
                            No orders found for this customer.
                        </p>
                    ) : (
                        customer.orders.map((order: any) => {
                            const { totalDiscount, freeShipping, priceDiscount } = deriveDiscount(order);
                            const hasBreakdown = totalDiscount > 0 && (freeShipping > 0 || priceDiscount > 0);

                            return (
                                <div className="order-block" key={order.id}>

                                    {/* Order header */}
                                    <div className="order-header">
                                        <div className="order-header-left">
                                            <strong>Order #{order.id}</strong>
                                            <span>{new Date(order.order_date).toLocaleDateString('en-GB', {
                                                day: '2-digit', month: 'short', year: 'numeric'
                                            })}</span>
                                            <span className="badge">{STATUS_LABELS[order.status]}</span>
                                            {order.courier && <span style={{ color: '#555' }}>via {order.courier}</span>}
                                        </div>
                                        <strong>Total: {Number(order.total_price).toLocaleString()}</strong>
                                    </div>

                                    {/* Items table */}
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Product</th>
                                                <th>Color</th>
                                                <th>Size</th>
                                                <th className="right">Qty</th>
                                                <th className="right">Price</th>
                                                <th className="right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {order.items.map((item: any) => (
                                                <tr key={item.id}>
                                                    <td><strong>{item.product_name}</strong></td>
                                                    <td>{item.color ?? '—'}</td>
                                                    <td>{item.size ?? '—'}</td>
                                                    <td className="right">{item.quantity}</td>
                                                    <td className="right">{Number(item.price).toLocaleString()}</td>
                                                    <td className="right">{Number(item.total_price).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {/* Promo breakdown (only when discount > 0) */}
                                    {hasBreakdown && (
                                        <div className="promo-box">
                                            <div className="promo-box-title">🎉 Promo discount</div>
                                            {priceDiscount > 0 && (
                                                <div className="promo-row">
                                                    <span>Product discount</span>
                                                    <span>- {priceDiscount.toLocaleString()}</span>
                                                </div>
                                            )}
                                            {freeShipping > 0 && (
                                                <div className="promo-row">
                                                    <span>Free shipping</span>
                                                    <span>- {freeShipping.toLocaleString()}</span>
                                                </div>
                                            )}
                                            <div className="promo-row total">
                                                <span>Total savings</span>
                                                <span>- {totalDiscount.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Payment footer */}
                                    <div className="order-footer-summary">
                                        {!hasBreakdown && totalDiscount > 0 && (
                                            <div>
                                                <span>Discount: </span>
                                                <strong>{totalDiscount.toLocaleString()}</strong>
                                            </div>
                                        )}
                                        <div>
                                            <span>Shipping: </span>
                                            <strong>{Number(order.total_shipping_fee).toLocaleString()}</strong>
                                        </div>
                                        <div>
                                            <span>Down Payment: </span>
                                            <strong>{Number(order.down_payment).toLocaleString()}</strong>
                                        </div>
                                        <div>
                                            <span>Remaining: </span>
                                            <strong className={Number(order.remaining_payment) > 0 ? 'remaining-due' : 'remaining-paid'}>
                                                {Number(order.remaining_payment) > 0
                                                    ? Number(order.remaining_payment).toLocaleString()
                                                    : 'PAID'}
                                            </strong>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Page footer */}
                <div className="page-footer">
                    Generated by Sales System &nbsp;·&nbsp; {new Date().toLocaleString()}
                </div>

            </div>

            {/* Print / Close buttons — hidden on print */}
            <div className="print-actions no-print">
                <button className="btn-print" onClick={() => window.print()}>
                    🖨️ Print / Save PDF
                </button>
                <button className="btn-close" onClick={() => window.history.length > 1 ? window.history.back() : window.close()}>
                    ✕ Close
                </button>
            </div>
        </>
    );
}

CustomerPrint.layout = (page: any) => page;