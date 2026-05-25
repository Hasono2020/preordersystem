<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Order;
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

    public function preview(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls|max:20480',
        ]);

        // BUG 5 & 6 FIX: Delete any leftover file from a previous upload
        // before storing the new one, so abandoned files don't accumulate.
        $oldPath = session('import_path');
        if ($oldPath && Storage::exists($oldPath)) {
            Storage::delete($oldPath);
        }

        $path        = $request->file('file')->store('imports');
        $fullPath    = storage_path('app/private/' . $path);
        $spreadsheet = IOFactory::load($fullPath);
        $sheetNames  = $spreadsheet->getSheetNames();
        $sheetIndex  = array_search('PO CHN', $sheetNames);

        if ($sheetIndex === false) {
            // BUG 6 FIX: Clean up the uploaded file if the sheet is not found.
            Storage::delete($path);
            return back()->with('error', 'Sheet "PO CHN" not found in the uploaded file.');
        }

        $sheet   = $spreadsheet->getSheet((int) $sheetIndex);
        $rows    = $sheet->toArray(null, true, true, false);
        $preview = $this->parseRows($rows);

        session([
            'import_data' => $preview,
            'import_path' => $path,
        ]);

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

            $rowPrice = isset($row[8]) && is_numeric($row[8]) && (float)$row[8] > 0 ? (float)$row[8] : null;
            if ($rowPrice !== null) {
                $lastPrice = $rowPrice;
            }

            $rowDP = isset($row[9]) && is_numeric($row[9]) && (float)$row[9] > 0 ? (float)$row[9] : null;
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
        $data       = session('import_data', []);
        $importPath = session('import_path');

        // BUG 5 FIX: Detect session expiry with a clear user-facing message
        // instead of silently redirecting with a generic error.
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
                $name = $row['name'];
                if (!isset($customerFirstDate[$name])) {
                    $customerFirstDate[$name] = $row['order_date'];
                }
                $grouped[$name][] = $row;
            }

            foreach ($grouped as $customerName => $rows) {
                $first = $rows[0];
                try {
                    // BUG 1 FIX: Use firstOrCreate keyed on name + phone so that
                    // re-importing the same file finds the existing customer
                    // instead of creating a duplicate.
                    $customer = Customer::firstOrCreate(
                        [
                            'name'  => $first['name'],
                            'phone' => $first['phone'] ?: null,
                        ],
                        [
                            'address' => $first['city'] ?: null,
                        ]
                    );

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

        // BUG 6 FIX: Delete the uploaded file after import completes
        // so it doesn't accumulate in storage/app/private/imports/.
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

    public function export()
    {
        $orders = Order::with(['customer.area', 'items'])
            ->latest()
            ->get();

        $spreadsheet = new Spreadsheet();
        /** @var \PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet */
        $sheet = $spreadsheet->getActiveSheet() ?? $spreadsheet->createSheet();
        $sheet->setTitle('PO CHN');

        $sheet->mergeCells('A1:M1');
        $sheet->getCell('A1')->setValue('LIST ORDERAN CUSTOMER');
        $sheet->getStyle('A1')->applyFromArray([
            'font'      => ['bold' => true, 'size' => 14],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FFE699']],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(25);

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

        $row = 3;
        $no  = 1;

        foreach ($orders as $order) {
            $itemsArray = $order->items->values();
            $totalDP    = $order->down_payment;
            $orderDate  = $order->order_date ? $order->order_date->format('Y-m-d') : '';
            $custName   = $order->customer->name ?? '';
            $custPhone  = $order->customer->phone ?? '';
            $custCity   = $order->customer->area->name ?? $order->customer->address ?? '';

            foreach ($itemsArray as $idx => $item) {
                $isFirst = ($idx === 0);

                $values = [
                    1  => '',
                    2  => $no,
                    3  => $isFirst ? $custName  : '',
                    4  => $isFirst ? $custPhone : '',
                    5  => $isFirst ? $custCity  : '',
                    6  => $item->product_name,
                    7  => $item->color ?? '',
                    8  => $item->size  ?? '',
                    9  => $item->price,
                    10 => $isFirst && $totalDP > 0 ? $totalDP : '',
                    11 => $isFirst ? $orderDate : '',
                    12 => $isFirst ? $custName  : '',
                    13 => $isFirst ? ($order->notes ?? '') : '',
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

                $no++;
                $row++;
            }
        }

        $widths = [1=>8, 2=>6, 3=>20, 4=>12, 5=>15, 6=>10, 7=>10, 8=>8, 9=>15, 10=>15, 11=>12, 12=>12, 13=>15];
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
}