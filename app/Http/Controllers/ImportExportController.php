<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Order;
use App\Models\ShippingArea;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
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
    // ─── Column map (0-based index) ───────────────────────────
    // 0: NO
    // 1: NAME
    // 2: PHONE
    // 3: AREA
    // 4: CODE
    // 5: COLOR
    // 6: SIZE
    // 7: PRICE
    // 8: DP
    // 9: DATE OF DP
    // 10: AN
    // 11: NOTES

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

        $path        = $request->file('file')->store('imports');
        $fullPath    = storage_path('app/private/' . $path);
        $spreadsheet = IOFactory::load($fullPath);
        $sheetNames  = $spreadsheet->getSheetNames();

        // Accept sheet named 'Orders' or first sheet
        $sheetIndex = array_search('Orders', $sheetNames);
        $sheet      = $sheetIndex !== false
            ? $spreadsheet->getSheet((int) $sheetIndex)
            : $spreadsheet->getSheet(0);

        $rows    = $sheet->toArray(null, true, true, false);
        $preview = $this->parseRows($rows);

        session(['import_data' => $preview, 'import_path' => $path]);

        return Inertia::render('import-export/preview', [
            'preview'   => array_slice($preview, 0, 50),
            'totalRows' => count($preview),
        ]);
    }

    private function parseRows(array $rows): array
    {
        $parsed    = [];
        $lastName  = '';
        $lastPhone = '';
        $lastArea  = '';
        $lastDP    = 0;
        $lastDate  = null;
        $lastAn    = '';
        $lastNotes = '';
        $lastPrice = 0;

        foreach ($rows as $i => $row) {
            // Skip header row (row index 0)
            if ($i === 0) continue;

            $row = array_values($row);

            // Col 4: CODE (required)
            $code = trim((string)($row[4] ?? ''));
            if ($code === '' || $code === '#N/A') continue;

            // Col 1: NAME — inherit if blank
            $name = trim((string)($row[1] ?? ''));
            if ($name !== '') {
                // New customer detected — reset DP and Date so they don't bleed
                // into this customer from the previous one
                if ($name !== $lastName) {
                    $lastDP   = 0;
                    $lastDate = null;
                }
                $lastName  = $name;
                $lastPhone = trim((string)($row[2] ?? ''));
                $lastArea  = trim((string)($row[3] ?? ''));
                $lastAn    = trim((string)($row[10] ?? ''));
                $lastNotes = trim((string)($row[11] ?? ''));
            }

            if ($lastName === '') continue;

            // Col 9: DATE OF DP — inherit if blank
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

            // Col 7: PRICE — inherit if blank
            $rowPrice = isset($row[7]) && is_numeric($row[7]) && (float)$row[7] > 0
                ? (float)$row[7] : null;
            if ($rowPrice !== null) {
                $lastPrice = $rowPrice;
            }

            // Col 8: DP — inherit if blank
            $rowDP = isset($row[8]) && is_numeric($row[8]) && (float)$row[8] > 0
                ? (float)$row[8] : null;
            if ($rowDP !== null) {
                $lastDP = $rowDP;
            }

            $parsed[] = [
                'name'         => $lastName,
                'phone'        => $lastPhone,
                'area'         => $lastArea,
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
        $data = session('import_data', []);

        if (empty($data)) {
            return redirect()->route('import-export.index')
                ->with('error', 'No import data found. Please upload again.');
        }

        $imported = 0;
        $skipped  = 0;

        DB::transaction(function () use ($data, &$imported, &$skipped) {
            // Group by customer name only
            $grouped           = [];
            $customerFirstDate = [];

            foreach ($data as $row) {
                $name = $row['name'];
                if (!isset($customerFirstDate[$name])) {
                    $customerFirstDate[$name] = $row['order_date'];
                }
                $grouped[$name][] = $row;
            }

            foreach ($grouped as $customerName => $rows) {
                $first = $rows[0];
                try {
                    // Find shipping area by name
                    $area = ShippingArea::whereRaw('LOWER(name) = ?', [
                        strtolower(trim($first['area']))
                    ])->first();

                    // Create or find customer
                    $customer = Customer::firstOrCreate(
                        ['name' => $first['name'], 'phone' => $first['phone'] ?: null],
                        ['area_id' => $area?->id, 'address' => null]
                    );

                    // If customer exists, update area if found
                    if ($area && !$customer->area_id) {
                        $customer->update(['area_id' => $area->id]);
                    }

                    $itemsTotal  = collect($rows)->sum('price');
                    $downPayment = 0;
                    foreach ($rows as $row) {
                        if (!empty($row['row_dp']) && $row['row_dp'] > 0) {
                            $downPayment = $row['row_dp'];
                            break;
                        }
                    }

                    $remaining = $itemsTotal - $downPayment;
                    $orderDate = $customerFirstDate[$customerName] ?? now()->format('Y-m-d');

                    $order = Order::create([
                        'customer_id'         => $customer->id,
                        'user_id'             => Auth::id(),
                        'order_date'          => $orderDate,
                        'status'              => 'bought',
                        'discount'            => 0,
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
                    Log::warning('Import row skipped: ' . $e->getMessage());
                    $skipped++;
                }
            }
        });

        session()->forget(['import_data', 'import_path']);

        return redirect()->route('orders.index')
            ->with('success', "Import complete! {$imported} orders imported, {$skipped} skipped.");
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
        $orders = Order::with(['customer.area', 'items'])
            ->latest()
            ->get();

        $spreadsheet = new Spreadsheet();
        /** @var \PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet */
        $sheet = $spreadsheet->getActiveSheet() ?? $spreadsheet->createSheet();
        $sheet->setTitle('Orders');

        // ── Row 1: Headers
        $headers = ['No', 'Name', 'Phone', 'Area', 'Code', 'Color', 'Size', 'Price', 'DP', 'Date of DP', 'AN', 'Notes'];
        foreach ($headers as $col => $header) {
            $colLetter = Coordinate::stringFromColumnIndex($col + 1);
            $sheet->getCell($colLetter . '1')->setValue($header);
        }
        $sheet->getStyle('A1:L1')->applyFromArray([
            'font'      => ['bold' => true],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'BDD7EE']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(20);

        // ── Data rows
        $rowNum = 2;
        $no     = 1;

        foreach ($orders as $order) {
            $itemsList = $order->items->values()->all();
            $totalItems = count($itemsList);

            if ($totalItems === 0) continue;

            $totalDP    = (float) $order->down_payment;
            $orderDate  = $order->order_date ? $order->order_date->format('Y-m-d') : '';
            $custName   = $order->customer?->name ?? '';
            $custPhone  = $order->customer?->phone ?? '';
            $areaName   = $order->customer?->area?->name ?? '';
            $an         = $custName; // AN = customer name (order by)
            $notes      = $order->notes ?? '';

            for ($i = 0; $i < $totalItems; $i++) {
                $item    = $itemsList[$i];
                $isFirst = ($i === 0);

                $values = [
                    1  => $isFirst ? $no : '',          // No: once per order
                    2  => $isFirst ? $custName  : '',   // Name: once per order
                    3  => $isFirst ? $custPhone : '',   // Phone: once per order
                    4  => $isFirst ? $areaName  : '',   // Area: once per order
                    5  => $this->extractCode($item->product_name),
                    6  => $item->color ?? '',
                    7  => $item->size  ?? '',
                    8  => (float) $item->price,
                    9  => ($isFirst && $totalDP > 0) ? $totalDP : '', // Total DP: once per order
                    10 => $isFirst ? $orderDate : '',   // Date: once per order
                    11 => $isFirst ? $an    : '',       // AN: once per order
                    12 => $isFirst ? $notes : '',       // Notes: once per order
                ];

                foreach ($values as $col => $value) {
                    $colLetter = Coordinate::stringFromColumnIndex($col);
                    $sheet->getCell($colLetter . $rowNum)->setValue($value);
                }

                $sheet->getStyle("A{$rowNum}:L{$rowNum}")->applyFromArray([
                    'borders' => ['allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color'       => ['rgb' => 'D9D9D9'],
                    ]],
                ]);

                $rowNum++;
            }

            $no++; // Increment No per ORDER, after all its item rows
        }

        // ── Column widths
        $widths = [1=>6, 2=>20, 3=>15, 4=>18, 5=>12, 6=>12, 7=>8, 8=>15, 9=>15, 10=>14, 11=>15, 12=>20];
        foreach ($widths as $col => $width) {
            $sheet->getColumnDimensionByColumn($col)->setWidth($width);
        }

        $filename = 'orders_export_' . now()->format('Ymd_His') . '.xlsx';
        $writer   = new Xlsx($spreadsheet);
        $tempFile = tempnam(sys_get_temp_dir(), 'export_');
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

        // Headers — same as export
        $headers = ['No', 'Name', 'Phone', 'Area', 'Code', 'Color', 'Size', 'Price', 'DP', 'Date of DP', 'AN', 'Notes'];
        foreach ($headers as $col => $header) {
            $colLetter = Coordinate::stringFromColumnIndex($col + 1);
            $sheet->getCell($colLetter . '1')->setValue($header);
        }
        $sheet->getStyle('A1:L1')->applyFromArray([
            'font'      => ['bold' => true],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'BDD7EE']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(20);

        // Sample rows — matches export format:
        // Name & Phone repeat every row, Area & DP only on first row per customer
        // No blank rows between customers — new customer just starts on the next row
        $samples = [
            // No   Name             Phone           Area              Code     Color    Size  Price   DP       Date          AN          Notes
            [1,  'JASMINE 7911',  '08123456789',  'Jakarta Selatan', 'NA_03', 'GREY',  'FZ', 169000, 500000, '2026-05-03', 'JASMINE',  ''],
            [2,  'JASMINE 7911',  '08123456789',  '',                'NA_03', 'BROWN', 'FZ', 169000, '',     '',           'JASMINE',  ''],
            [3,  'JASMINE 7911',  '08123456789',  '',                'NA_03', 'NAVY',  'FZ', 169000, '',     '',           'JASMINE',  ''],
            [4,  'PHOENIX',       '08198765432',  'Surabaya',        'NZ_01', 'WHITE', 'FZ', 95000,  '',     '',           'PHOENIX',  ''],
            [5,  'PHOENIX',       '08198765432',  '',                'NZ_01', 'BLACK', 'FZ', 95000,  '',     '',           'PHOENIX',  ''],
        ];

        $rowNum = 2;
        foreach ($samples as $sample) {
            foreach ($sample as $col => $value) {
                $colLetter = Coordinate::stringFromColumnIndex($col + 1);
                $sheet->getCell($colLetter . $rowNum)->setValue($value);
            }
            $sheet->getStyle("A{$rowNum}:L{$rowNum}")->applyFromArray([
                'font'    => ['color' => ['rgb' => 'AAAAAA'], 'italic' => true],
                'borders' => ['allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color'       => ['rgb' => 'D9D9D9'],
                ]],
            ]);
            $rowNum++;
        }

        // Column widths — same as export
        $widths = [1=>6, 2=>20, 3=>15, 4=>18, 5=>12, 6=>12, 7=>8, 8=>15, 9=>15, 10=>14, 11=>15, 12=>20];
        foreach ($widths as $col => $width) {
            $sheet->getColumnDimensionByColumn($col)->setWidth($width);
        }

        $writer   = new Xlsx($spreadsheet);
        $tempFile = tempnam(sys_get_temp_dir(), 'template_');
        $writer->save($tempFile);

        return response()->download($tempFile, 'orders_template.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }
}