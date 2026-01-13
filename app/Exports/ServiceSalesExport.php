<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ServiceSalesExport implements FromCollection, ShouldAutoSize, WithColumnFormatting, WithHeadings, WithMapping, WithStyles, WithTitle
{
    public function __construct(protected $rows, protected $totals) {}

    public function title(): string
    {
        return 'Rapport Ventes Services';
    }

    public function collection()
    {
        $data = collect($this->rows);

        $data->push([
            'service_name' => 'TOTAL GÉNÉRAL',
            'unit_price' => '',
            'total_count' => $this->totals['sum_count'],
            'total_amount' => $this->totals['sum_amount'],
        ]);

        return $data;
    }

    public function headings(): array
    {
        return [
            'Service',
            'Prix Unitaire',
            'Nombre',
            'Montant Total',
        ];
    }

    public function map($row): array
    {
        return [
            $row['service_name'],
            $row['unit_price'] === '' ? '' : (float) $row['unit_price'],
            (int) $row['total_count'],
            (float) $row['total_amount'],
        ];
    }

    public function columnFormats(): array
    {
        return [
            'B' => '#,##0.00',
            'D' => '#,##0.00',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        $rowCount = count($this->rows);
        $lastRow = $rowCount + 2; // +1 heading, +1 total row
        $fullRange = 'A1:D'.$lastRow;

        // Global border and alignment
        $sheet->getStyle($fullRange)->applyFromArray([
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => '000000'],
                ],
            ],
            'alignment' => [
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ]);

        // Specific alignment for numeric columns (except header)
        $sheet->getStyle('B2:B'.$lastRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        $sheet->getStyle('C2:C'.$lastRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('D2:D'.$lastRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

        // Header styling
        $sheet->getStyle('A1:D1')->applyFromArray([
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '333333'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
            ],
        ]);

        // Total row styling
        $sheet->getStyle('A'.$lastRow.':D'.$lastRow)->applyFromArray([
            'font' => [
                'bold' => true,
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'EEEEEE'],
            ],
        ]);

        return [];
    }
}
