<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Order;
use App\Models\ShippingArea;
use App\Models\Trip;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class ImportExportController extends Controller
{
    public function index()
    {
        return Inertia::render('import-export/index');
    }

    // ─── IMPORT ───────────────────────────────────────────────

    public function preview(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls|max:20480',
        ]);

        // Delete any leftover file from a previous upload session.
        $oldPath = session('import_path');
        if ($oldPath && Storage::exists($oldPath)) {
            Storage::delete($oldPath);
        }

        $path        = $request->file('file')->store('imports');
        $fullPath    = storage_path('app/private/' . $path);
        $spreadsheet = IOFactory::load($fullPath);
        $sheetNames  = $spreadsheet->getSheetNames();

        $sheetIndex = array_search('Orders', $sheetNames);
        $sheet      = $sheetIndex !== false
            ? $spreadsheet->getSheet((int) $sheetIndex)
            : $spreadsheet->getSheet(0);

        $rows    = $sheet->toArray(null, true, true, false);
        $preview = $this->parseRows($rows);

        if (empty($preview)) {
            Storage::delete($path);
            return back()->with('error', 'No valid data rows found in the uploaded file. Please check the format.');
        }

        session(['import_data' => $preview, 'import_path' => $path]);

        return Inertia::render('import-export/preview', [
            'preview'   => array_slice($preview, 0, 50),
            'totalRows' => count($preview),
        ]);
    }

    private function parseRows(array $rows): array
    {
        $parsed        = [];
        $lastName      = '';
        $lastPhone     = '';
        $lastArea      = '';
        $lastType      = 'normal';
        $lastPromoType = 'default';
        $lastTrip      = '';
        $lastStatus    = 'bought';
        $lastDP        = 0;
        $lastDate      = null;
        $lastAn        = '';
        $lastNotes     = '';
        $lastPrice     = 0;

        // Column map (0-based):
        // 0:No   1:Name   2:Phone   3:Area    4:Code   5:Color  6:Size
        // 7:Price  8:DP   9:Date of DP  10:AN  11:Notes
        // 12:Type  13:Promo Type  14:Trip  15:Status

        foreach ($rows as $i => $row) {
            if ($i === 0) continue;

            $row = array_values($row);

            $code = trim((string)($row[4] ?? ''));
            if ($code === '' || $code === '#N/A') continue;

            $name = trim((string)($row[1] ?? ''));
            if ($name !== '') {
                if ($name !== $lastName) {
                    $lastDP     = 0;
                    $lastDate   = null;
                    $lastPrice  = 0;
                    $lastStatus = 'bought';
                    $lastTrip   = '';
                }
                $lastName  = $name;
                $lastPhone = trim((string)($row[2] ?? ''));
                $lastArea  = trim((string)($row[3] ?? ''));
                $lastAn    = trim((string)($row[10] ?? ''));
                $lastNotes = trim((string)($row[11] ?? ''));

                $rawType       = strtolower(trim((string)($row[12] ?? '')));
                $lastType      = $rawType === 'reseller' ? 'reseller' : 'normal';

                $rawPromo      = strtolower(trim((string)($row[13] ?? '')));
                $lastPromoType = $rawPromo === 'reseller_promo' ? 'reseller_promo' : 'default';

                // Trip name from column 14 — matched by name in import().
                $lastTrip = trim((string)($row[14] ?? ''));

                // Status from column 15 — only bought/keep/sold_out accepted.
                $rawStatus  = strtolower(trim((string)($row[15] ?? '')));
                $lastStatus = in_array($rawStatus, ['bought', 'keep', 'sold_out'])
                    ? $rawStatus
                    : 'bought';
            }

            if ($lastName === '') continue;

            $rawDate = $row[9] ?? null;
            if ($rawDate instanceof \DateTime) {
                $lastDate = $rawDate->format('Y-m-d');
            } elseif ($rawDate && is_numeric($rawDate)) {
                try {
                    $lastDate = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject((float)$rawDate)->format('Y-m-d');
                } catch (\Exception $e) {}
            } elseif ($rawDate && trim((string)$rawDate) !== '') {
                try { $lastDate = \Carbon\Carbon::parse((string)$rawDate)->format('Y-m-d'); } catch (\Exception $e) {}
            }

            $rowPrice = isset($row[7]) && is_numeric($row[7]) && (float)$row[7] > 0
                ? (float)$row[7] : null;
            if ($rowPrice !== null) $lastPrice = $rowPrice;

            $rowDP = isset($row[8]) && is_numeric($row[8]) && (float)$row[8] > 0
                ? (float)$row[8] : null;
            if ($rowDP !== null) $lastDP = $rowDP;

            $parsed[] = [
                'name'         => $lastName,
                'phone'        => $lastPhone,
                'area'         => $lastArea,
                'type'         => $lastType,
                'promo_type'   => $lastPromoType,
                'trip'         => $lastTrip,
                'status'       => $lastStatus,
                'product_code' => $code,
                'color'        => trim((string)($row[5] ?? '')),
                'size'         => trim((string)($row[6] ?? '')),
                'price'        => $lastPrice,
                'down_payment' => $lastDP,
                'order_date'   => $lastDate ?? now()->format('Y-m-d'),
                'an'           => $lastAn,
                'notes'        => $lastNotes,
                'row_dp'       => $rowDP,
            ];
        }

        return $parsed;
    }

    public function import()
    {
        $data       = session('import_data', []);
        $importPath = session('import_path');

        if (empty($data)) {
            return redirect()->route('import-export.index')
                ->with('error', 'Your import session has expired. Please upload the file again.');
        }

        $imported = 0;
        $skipped  = 0;

        DB::transaction(function () use ($data, &$imported, &$skipped) {
            $grouped           = [];
            $customerFirstDate = [];

            foreach ($data as $row) {
                $key = $row['name'] . '||' . $row['order_date'];
                if (!isset($customerFirstDate[$key])) {
                    $customerFirstDate[$key] = $row['order_date'];
                }
                $grouped[$key][] = $row;
            }

            // Pre-load all referenced trips in one query to avoid N+1.
            $tripNames = collect($grouped)
                ->map(fn($rows) => $rows[0]['trip'] ?? '')
                ->filter()
                ->unique()
                ->values();

            $trips = Trip::whereIn('name', $tripNames)
                ->get(['id', 'name'])
                ->keyBy(fn($t) => strtolower(trim($t->name)));

            foreach ($grouped as $key => $rows) {
                $first = $rows[0];
                try {
                    $area = ShippingArea::whereRaw('LOWER(name) = ?', [
                        strtolower(trim($first['area']))
                    ])->first();

                    $customer = Customer::firstOrCreate(
                        ['name' => $first['name'], 'phone' => $first['phone'] ?: null],
                        [
                            'area_id'    => $area?->id,
                            'address'    => null,
                            'type'       => $first['type']       ?? 'normal',
                            'promo_type' => $first['promo_type'] ?? 'default',
                        ]
                    );

                    if ($area && !$customer->area_id) {
                        $customer->update(['area_id' => $area->id]);
                    }

                    // Match trip by name (case-insensitive). Null if blank or not found.
                    $tripName = strtolower(trim($first['trip'] ?? ''));
                    $trip     = $tripName !== '' ? ($trips[$tripName] ?? null) : null;

                    $itemsTotal  = collect($rows)->sum('price');
                    $downPayment = 0;
                    foreach ($rows as $row) {
                        if (!empty($row['row_dp']) && $row['row_dp'] > 0) {
                            $downPayment = $row['row_dp'];
                            break;
                        }
                    }

                    $remaining = $itemsTotal - $downPayment;
                    $orderDate = $customerFirstDate[$key] ?? now()->format('Y-m-d');

                    $order = Order::create([
                        'customer_id'         => $customer->id,
                        'user_id'             => Auth::id(),
                        'trip_id'             => $trip?->id,
                        'order_date'          => $orderDate,
                        // Use status from spreadsheet (validated in parseRows).
                        // This preserves keep/sold_out orders on re-import and
                        // ensures trip → PO → allocation flow works correctly.
                        'status'              => $first['status'] ?? 'bought',
                        'discount'            => 0,
                        'discount_product'    => 0,
                        'discount_shipping'   => 0,
                        'shipping_fee'        => 0,
                        'shipping_fee_per_kg' => $area?->price_per_kg ?? 0,
                        'total_shipping_fee'  => 0,
                        'weight'              => 0,
                        'down_payment'        => $downPayment,
                        'remaining_payment'   => $remaining,
                        'total_price'         => $itemsTotal,
                        'notes'               => $first['notes'] ?: null,
                    ]);

                    foreach ($rows as $row) {
                        $order->items()->create([
                            'product_name' => $row['product_code'],
                            'color'        => $row['color'] ?: null,
                            'size'         => $row['size'] ?: null,
                            'quantity'     => 1,
                            'price'        => $row['price'],
                            'total_price'  => $row['price'],
                        ]);
                    }

                    $imported++;
                } catch (\Exception $e) {
                    Log::warning('Import row skipped', [
                        'customer' => $first['name'] ?? 'unknown',
                        'error'    => $e->getMessage(),
                        'file'     => $e->getFile(),
                        'line'     => $e->getLine(),
                    ]);
                    $skipped++;
                }
            }
        });

        if ($importPath && Storage::exists($importPath)) {
            Storage::delete($importPath);
        }

        Session::forget(['import_data', 'import_path']);

        $message = "Import complete! {$imported} orders imported.";
        if ($skipped > 0) {
            $message .= " {$skipped} skipped — check storage/logs/laravel.log for details.";
        }

        return redirect()->route('orders.index')->with('success', $message);
    }

    // ─── EXPORT ───────────────────────────────────────────────

    private function extractCode(string $productName): string
    {
        if (strpos($productName, ' — ') !== false) {
            return explode(' — ', $productName)[0];
        }
        return $productName;
    }

    public function export()
    {
        $spreadsheet = new Spreadsheet();
        /** @var \PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet */
        $sheet = $spreadsheet->getActiveSheet() ?? $spreadsheet->createSheet();
        $sheet->setTitle('Orders');

        // Column order matches template and import column map exactly.
        $headers = [
            'No', 'Name', 'Phone', 'Area', 'Code', 'Color', 'Size',
            'Price', 'DP', 'Date of DP', 'AN', 'Notes',
            'Type', 'Promo Type', 'Trip', 'Status', 'Discount',
        ];
        foreach ($headers as $col => $header) {
            $sheet->getCell(Coordinate::stringFromColumnIndex($col + 1) . '1')->setValue($header);
        }
        $sheet->getStyle('A1:Q1')->applyFromArray([
            'font'      => ['bold' => true],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'BDD7EE']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(20);

        $rowNum = 2;
        $no     = 1;

        // Eager-load trip so we can write the trip name per order.
        Order::with(['customer.area', 'items', 'trip'])->latest()->chunk(200, function ($orders) use (&$sheet, &$rowNum, &$no) {
            foreach ($orders as $order) {
                $itemsList  = $order->items->values()->all();
                $totalItems = count($itemsList);
                if ($totalItems === 0) continue;

                $totalDP   = (float) $order->down_payment;
                $orderDate = $order->order_date ? $order->order_date->format('Y-m-d') : '';
                $custName  = $order->customer?->name        ?? '';
                $custPhone = $order->customer?->phone       ?? '';
                $areaName  = $order->customer?->area?->name ?? '';
                $custType  = $order->customer?->type        ?? 'normal';
                $promoType = $order->customer?->promo_type  ?? 'default';
                $tripName  = $order->trip?->name            ?? '';
                $status    = $order->status;
                $notes     = $order->notes ?? '';
                $discount  = (float) $order->discount;

                for ($i = 0; $i < $totalItems; $i++) {
                    $item    = $itemsList[$i];
                    $isFirst = ($i === 0);

                    $values = [
                        1  => $isFirst ? $no        : '',
                        2  => $isFirst ? $custName  : '',
                        3  => $isFirst ? $custPhone : '',
                        4  => $isFirst ? $areaName  : '',
                        5  => $this->extractCode($item->product_name),
                        6  => $item->color ?? '',
                        7  => $item->size  ?? '',
                        8  => (float) $item->price,
                        9  => ($isFirst && $totalDP > 0) ? $totalDP : '',
                        10 => $isFirst ? $orderDate : '',
                        11 => $isFirst ? $custName  : '',
                        12 => $isFirst ? $notes     : '',
                        13 => $isFirst ? $custType  : '',
                        14 => $isFirst ? $promoType : '',
                        15 => $isFirst ? $tripName  : '',
                        16 => $isFirst ? $status    : '',
                        17 => ($isFirst && $discount > 0) ? $discount : '',
                    ];

                    foreach ($values as $col => $value) {
                        $sheet->getCell(Coordinate::stringFromColumnIndex($col) . $rowNum)->setValue($value);
                    }

                    // Colour-code rows by status so they're easy to scan in Excel.
                    $statusColor = match($status) {
                        'keep'     => 'FFF2CC', // yellow
                        'sold_out' => 'FCE4D6', // red-ish
                        default    => 'E2EFDA', // green (bought)
                    };
                    $sheet->getStyle("A{$rowNum}:Q{$rowNum}")->applyFromArray([
                        'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $statusColor]],
                        'borders' => ['allBorders' => [
                            'borderStyle' => Border::BORDER_THIN,
                            'color'       => ['rgb' => 'D9D9D9'],
                        ]],
                    ]);

                    $rowNum++;
                }
                $no++;
            }
        });

        $widths = [
            1=>6,  2=>20, 3=>15, 4=>18, 5=>12, 6=>12, 7=>8,
            8=>15, 9=>15, 10=>14, 11=>15, 12=>20,
            13=>12, 14=>16, 15=>22, 16=>12, 17=>15,
        ];
        foreach ($widths as $col => $width) {
            $sheet->getColumnDimensionByColumn($col)->setWidth($width);
        }

        $filename = 'orders_export_' . now()->format('Ymd_His') . '.xlsx';
        $writer   = new Xlsx($spreadsheet);
        $tempFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . uniqid('export_') . '.xlsx';
        $writer->save($tempFile);

        return response()->download($tempFile, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    // ─── TEMPLATE ─────────────────────────────────────────────

    public function template()
    {
        $spreadsheet = new Spreadsheet();
        /** @var \PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet */
        $sheet = $spreadsheet->getActiveSheet() ?? $spreadsheet->createSheet();
        $sheet->setTitle('Orders');

        // Columns match export and import column map exactly.
        $headers = [
            'No', 'Name', 'Phone', 'Area', 'Code', 'Color', 'Size',
            'Price', 'DP', 'Date of DP', 'AN', 'Notes',
            'Type', 'Promo Type', 'Trip', 'Status',
        ];
        foreach ($headers as $col => $header) {
            $sheet->getCell(Coordinate::stringFromColumnIndex($col + 1) . '1')->setValue($header);
        }
        $sheet->getStyle('A1:P1')->applyFromArray([
            'font'      => ['bold' => true],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'BDD7EE']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(20);

        $samples = [
            [1, 'JASMINE 7911', '08123456789', 'Jakarta Selatan', 'NA_01', 'GREY',  'FZ', 169000, 500000, '2026-05-03', 'JASMINE', '', 'normal',   'default',        'China Trip May 2026', 'keep'],
            [2, 'JASMINE 7911', '08123456789', '',                'NA_02', 'BROWN', 'FZ', 169000, '',     '',           'JASMINE', '', '',         '',               '',                    ''],
            [3, 'PHOENIX',      '08198765432', 'Surabaya',        'NA_01', 'WHITE', 'FZ', 95000,  '',     '',           'PHOENIX', '', 'reseller', 'default',        'China Trip May 2026', 'keep'],
            [4, 'MAYA',         '08199990000', 'Bandung',         'NA_01', 'BLACK', 'FZ', 169000, '',     '',           'MAYA',    '', 'normal',   'reseller_promo', '',                    'bought'],
        ];

        $rowNum = 2;
        foreach ($samples as $sample) {
            foreach ($sample as $col => $value) {
                $sheet->getCell(Coordinate::stringFromColumnIndex($col + 1) . $rowNum)->setValue($value);
            }
            $sheet->getStyle("A{$rowNum}:P{$rowNum}")->applyFromArray([
                'font'    => ['color' => ['rgb' => 'AAAAAA'], 'italic' => true],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'D9D9D9']]],
            ]);
            $rowNum++;
        }

        $noteRow = $rowNum + 1;
        $sheet->getCell('A' . $noteRow)->setValue(
            '* Type: "normal" or "reseller"  |  ' .
            'Promo Type: "default" or "reseller_promo"  |  ' .
            'Trip: must exactly match an existing trip name in the app (leave blank if none)  |  ' .
            'Status: "bought", "keep", or "sold_out" (defaults to "bought" if blank)'
        );
        $sheet->getStyle('A' . $noteRow)->applyFromArray([
            'font' => ['italic' => true, 'color' => ['rgb' => '888888'], 'size' => 9],
        ]);
        $sheet->mergeCells('A' . $noteRow . ':P' . $noteRow);

        $widths = [
            1=>6,  2=>20, 3=>15, 4=>18, 5=>12, 6=>12, 7=>8,
            8=>15, 9=>15, 10=>14, 11=>15, 12=>20,
            13=>12, 14=>16, 15=>22, 16=>12,
        ];
        foreach ($widths as $col => $width) {
            $sheet->getColumnDimensionByColumn($col)->setWidth($width);
        }

        $writer   = new Xlsx($spreadsheet);
        $tempFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . uniqid('template_') . '.xlsx';
        $writer->save($tempFile);

        return response()->download($tempFile, 'orders_template.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }
}