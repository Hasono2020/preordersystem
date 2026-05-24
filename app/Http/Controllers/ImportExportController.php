<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
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

        $path        = $request->file('file')->store('imports');
        $fullPath    = storage_path('app/private/' . $path);
        $spreadsheet = IOFactory::load($fullPath);
        $sheetNames  = $spreadsheet->getSheetNames();
        $sheetIndex  = array_search('PO CHN', $sheetNames);

        if ($sheetIndex === false) {
            return back()->with('error', 'Sheet "PO CHN" not found in the uploaded file.');
        }

        $sheet   = $spreadsheet->getSheet((int) $sheetIndex);
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
        $lastCity  = '';
        $lastDP    = 0;
        $lastDate  = null;
        $lastPrice = 0;

        foreach ($rows as $i => $row) {
            if ($i <= 1) continue;

            // PHP toArray with false = 0-indexed BUT
            // sheet->toArray returns associative when columns param is false
            // Re-index to be safe
            $row = array_values($row);

            $name = trim((string)($row[2] ?? ''));
            $code = trim((string)($row[5] ?? ''));

            if ($code === '' || $code === '#N/A') continue;

            if ($name !== '') {
                $lastName  = $name;
                $lastPhone = trim((string)($row[3] ?? ''));
                $lastCity  = trim((string)($row[4] ?? ''));
            }

            if ($lastName === '') continue;

            // Parse date
            $rawDate = $row[10] ?? null;
            if ($rawDate instanceof \DateTime) {
                $lastDate = $rawDate->format('Y-m-d');
            } elseif ($rawDate && is_numeric($rawDate)) {
                try {
                    $lastDate = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject((float)$rawDate)->format('Y-m-d');
                } catch (\Exception $e) {}
            } elseif ($rawDate) {
                try { $lastDate = \Carbon\Carbon::parse((string)$rawDate)->format('Y-m-d'); } catch (\Exception $e) {}
            }

            // Price — col index 8
            $rowPrice = isset($row[8]) && is_numeric($row[8]) && (float)$row[8] > 0
                ? (float)$row[8]
                : null;
            if ($rowPrice !== null) {
                $lastPrice = $rowPrice;
            }

            // DP — col index 9
            $rowDP = isset($row[9]) && is_numeric($row[9]) && (float)$row[9] > 0
                ? (float)$row[9]
                : null;
            if ($rowDP !== null) {
                $lastDP = $rowDP;
            }

            $parsed[] = [
                'name'         => $lastName,
                'phone'        => $lastPhone,
                'city'         => $lastCity,
                'product_code' => $code,
                'color'        => trim((string)($row[6] ?? '')),
                'size'         => trim((string)($row[7] ?? '')),
                'price'        => $lastPrice,
                'down_payment' => $lastDP,
                'order_date'   => $lastDate ?? now()->format('Y-m-d'),
                'notes'        => trim((string)($row[12] ?? '')),
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
                    // Create one customer per unique name
                    $customer = Customer::create([
                        'name'    => $first['name'],
                        'phone'   => $first['phone'] ?: null,
                        'address' => $first['city'] ?: null,
                    ]);

                    // Sum all item prices
                    $itemsTotal = collect($rows)->sum('price');

                    // Use the first DP found across all rows
                    $downPayment = 0;
                    foreach ($rows as $row) {
                        if (!empty($row['row_dp']) && $row['row_dp'] > 0) {
                            $downPayment = $row['row_dp'];
                            break;
                        }
                    }

                    $remaining = $itemsTotal - $downPayment;

                    // Use first date seen for this customer
                    $orderDate = $customerFirstDate[$customerName] ?? now()->format('Y-m-d');

                    $order = Order::create([
                        'customer_id'         => $customer->id,
                        'user_id'             => Auth::id(),
                        'order_date'          => $orderDate,
                        'status'              => 'bought',
                        'discount'            => 0,
                        'shipping_fee'        => 0,
                        'shipping_fee_per_kg' => 0,
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
                    $skipped++;
                }
            }
        });

        session()->forget(['import_data', 'import_path']);

        return redirect()->route('orders.index')
            ->with('success', "Import complete! {$imported} orders imported, {$skipped} skipped.");
    }

    // ─── EXPORT ───────────────────────────────────────────────

    public function export()
    {
        $orders = Order::with(['customer', 'items'])
            ->latest()
            ->get();

        $spreadsheet = new Spreadsheet();
        /** @var \PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet */
        $sheet = $spreadsheet->getActiveSheet() ?? $spreadsheet->createSheet();
        $sheet->setTitle('PO CHN');

        // ── Row 1: Title
        $sheet->mergeCells('A1:M1');
        $sheet->getCell('A1')->setValue('LIST ORDERAN CUSTOMER');
        $sheet->getStyle('A1')->applyFromArray([
            'font'      => ['bold' => true, 'size' => 14],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FFE699']],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(25);

        // ── Row 2: Headers
        $headers = ['KET','NO','NAMA','IG/WA','KOTA','KODE','WARNA','SIZE','HARGA SATUAN','DP','TGL DP','AN','KET'];
        foreach ($headers as $col => $header) {
            $colLetter = Coordinate::stringFromColumnIndex($col + 1);
            $sheet->getCell($colLetter . '2')->setValue($header);
        }
        $sheet->getStyle('A2:M2')->applyFromArray([
            'font'      => ['bold' => true],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'BDD7EE']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
        ]);

        // ── Data rows
        $row = 3;
        $no  = 1;

        foreach ($orders as $order) {
            $isFirstRow = true;

            foreach ($order->items as $item) {
                $values = [
                    1  => '',
                    2  => $no,
                    3  => $isFirstRow ? ($order->customer->name ?? '') : '',
                    4  => $isFirstRow ? ($order->customer->phone ?? 'RESL') : '',
                    5  => $isFirstRow ? ($order->customer->address ?? '') : '',
                    6  => $item->product_name,
                    7  => $item->color ?? '',
                    8  => $item->size ?? '',
                    9  => $item->price,
                    10 => $isFirstRow && $order->down_payment > 0 ? $order->down_payment : '',
                    11 => $isFirstRow && $order->order_date ? $order->order_date->format('Y-m-d') : '',
                    12 => $isFirstRow ? ($order->customer->name ?? '') : '',
                    13 => $isFirstRow ? ($order->notes ?? '') : '',
                ];

                foreach ($values as $col => $value) {
                    $colLetter = Coordinate::stringFromColumnIndex($col);
                    $sheet->getCell($colLetter . $row)->setValue($value);
                }

                $sheet->getStyle("A{$row}:M{$row}")->applyFromArray([
                    'borders' => ['allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color'       => ['rgb' => 'D9D9D9'],
                    ]],
                ]);

                $isFirstRow = false;
                $no++;
                $row++;
            }
        }

        // ── Column widths
        $widths = [1=>8, 2=>6, 3=>20, 4=>12, 5=>15, 6=>10, 7=>10, 8=>8, 9=>15, 10=>15, 11=>12, 12=>12, 13=>15];
        foreach ($widths as $col => $width) {
            $sheet->getColumnDimensionByColumn($col)->setWidth($width);
        }

        // ── Output
        $filename = 'orders_export_' . now()->format('Ymd_His') . '.xlsx';
        $writer   = new Xlsx($spreadsheet);
        $tempFile = tempnam(sys_get_temp_dir(), 'export_');
        $writer->save($tempFile);

        return response()->download($tempFile, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }
}