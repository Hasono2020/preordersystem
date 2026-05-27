<?php

namespace App\Http\Controllers;

use App\Models\ShippingArea;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

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
            'price_per_kg' => 'required|numeric|min:0',
        ]);

        $shippingArea->update($validated);

        return redirect()->route('shipping-areas.index')
            ->with('success', 'Shipping area updated.');
    }

    public function destroy(ShippingArea $shippingArea)
    {
        // FIX 3: Block deletion if any customers are assigned to this area.
        // Without this, deleting an area leaves customers with a dangling
        // area_id — either a FK crash on MySQL or silent orphan on SQLite.
        if ($shippingArea->customers()->exists()) {
            $count = $shippingArea->customers()->count();
            return redirect()->route('shipping-areas.index')
                ->with('error',
                    "Cannot delete \"{$shippingArea->name}\" — " .
                    "{$count} customer(s) are assigned to it. " .
                    "Reassign those customers first."
                );
        }

        $shippingArea->delete();

        return redirect()->route('shipping-areas.index')
            ->with('success', 'Shipping area deleted.');
    }

    // ─── EXPORT ───────────────────────────────────────────────

    public function export()
    {
        $areas       = ShippingArea::orderBy('name')->get();
        $spreadsheet = new Spreadsheet();

        /** @var \PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet */
        $sheet = $spreadsheet->getActiveSheet() ?? $spreadsheet->createSheet();
        $sheet->setTitle('Shipping Areas');

        $sheet->mergeCells('A1:B1');
        $sheet->getCell('A1')->setValue('SHIPPING AREAS');
        $sheet->getStyle('A1')->applyFromArray([
            'font'      => ['bold' => true, 'size' => 14],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'BDD7EE']],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(25);

        $sheet->getCell('A2')->setValue('AREA NAME');
        $sheet->getCell('B2')->setValue('PRICE PER KG');
        $sheet->getStyle('A2:B2')->applyFromArray([
            'font'      => ['bold' => true],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'DDEBF7']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
        ]);

        $row = 3;
        foreach ($areas as $area) {
            $sheet->getCell('A' . $row)->setValue($area->name);
            $sheet->getCell('B' . $row)->setValue($area->price_per_kg);
            $sheet->getStyle('A' . $row . ':B' . $row)->applyFromArray([
                'borders' => ['allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color'       => ['rgb' => 'D9D9D9'],
                ]],
            ]);
            $row++;
        }

        $sheet->getColumnDimension('A')->setWidth(30);
        $sheet->getColumnDimension('B')->setWidth(20);

        $filename = 'shipping_areas_' . now()->format('Ymd_His') . '.xlsx';
        $writer   = new Xlsx($spreadsheet);
        $tempFile = tempnam(sys_get_temp_dir(), 'shipping_');
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
        $sheet->setTitle('Shipping Areas');

        $sheet->mergeCells('A1:B1');
        $sheet->getCell('A1')->setValue('SHIPPING AREAS');
        $sheet->getStyle('A1')->applyFromArray([
            'font'      => ['bold' => true, 'size' => 14],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'BDD7EE']],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(25);

        $sheet->getCell('A2')->setValue('AREA NAME');
        $sheet->getCell('B2')->setValue('PRICE PER KG');
        $sheet->getStyle('A2:B2')->applyFromArray([
            'font'      => ['bold' => true],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'DDEBF7']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
        ]);

        $samples = [
            ['Jakarta Selatan', 15000],
            ['Surabaya',        12000],
            ['Medan',           18000],
        ];
        $row = 3;
        foreach ($samples as $sample) {
            $sheet->getCell('A' . $row)->setValue($sample[0]);
            $sheet->getCell('B' . $row)->setValue($sample[1]);
            $sheet->getStyle('A' . $row . ':B' . $row)->applyFromArray([
                'font'    => ['color' => ['rgb' => 'AAAAAA'], 'italic' => true],
                'borders' => ['allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color'       => ['rgb' => 'D9D9D9'],
                ]],
            ]);
            $row++;
        }

        $sheet->getColumnDimension('A')->setWidth(30);
        $sheet->getColumnDimension('B')->setWidth(20);

        $writer   = new Xlsx($spreadsheet);
        $tempFile = tempnam(sys_get_temp_dir(), 'template_');
        $writer->save($tempFile);

        return response()->download($tempFile, 'shipping_areas_template.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    // ─── IMPORT ───────────────────────────────────────────────

    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls|max:10240',
        ]);

        $path        = $request->file('file')->store('imports');
        $fullPath    = storage_path('app/private/' . $path);
        $spreadsheet = IOFactory::load($fullPath);

        $sheetNames = $spreadsheet->getSheetNames();
        $sheetIndex = array_search('Shipping Areas', $sheetNames);
        $sheet      = $sheetIndex !== false
            ? $spreadsheet->getSheet((int) $sheetIndex)
            : $spreadsheet->getSheet(0);

        $rows     = $sheet->toArray(null, true, true, false);
        $imported = 0;
        $updated  = 0;
        $skipped  = 0;

        foreach ($rows as $i => $row) {
            if ($i <= 1) continue;

            $row   = array_values($row);
            $name  = trim((string)($row[0] ?? ''));
            $price = $row[1] ?? null;

            if ($name === '') continue;

            if (!is_numeric($price)) {
                $skipped++;
                continue;
            }

            $existing = ShippingArea::whereRaw('LOWER(name) = ?', [strtolower($name)])->first();

            if ($existing) {
                $existing->update(['price_per_kg' => (float) $price]);
                $updated++;
            } else {
                ShippingArea::create(['name' => $name, 'price_per_kg' => (float) $price]);
                $imported++;
            }
        }

        Storage::delete($path);

        $message = "Import complete! {$imported} areas added, {$updated} updated.";
        if ($skipped > 0) {
            $message .= " {$skipped} rows skipped (invalid data).";
        }

        return redirect()->route('shipping-areas.index')->with('success', $message);
    }
}