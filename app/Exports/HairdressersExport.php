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

class HairdressersExport implements FromCollection, ShouldAutoSize, WithColumnFormatting, WithHeadings, WithMapping, WithStyles, WithTitle
{
    public function __construct(protected $rows, protected $totals) {}

    public function title(): string
    {
        return 'Rapport Ventes Coiffeurs';
    }

    public function collection()
    {
        $data = collect($this->rows);

        $data->push([
            'hairdresser_name' => 'TOTAL GÉNÉRAL',
            'orders_count' => $this->totals['sum_orders'],
            'total_amount' => $this->totals['sum_amount'],
        ]);

        return $data;
    }

    public function headings(): array
    {
        return [
            'Coiffeur',
            'Nombre de commandes',
            'Montant Total',
        ];
    }

    public function map($row): array
    {
        return [
            $row['hairdresser_name'],
            (int) $row['orders_count'],
            (float) $row['total_amount'],
        ];
    }

    public function columnFormats(): array
    {
        return [
            'C' => '#,##0.00',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        $rowCount = count($this->rows);
        $lastRow = $rowCount + 2; // +1 heading, +1 total row
        $fullRange = 'A1:C'.$lastRow;

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
        $sheet->getStyle('B2:B'.$lastRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('C2:C'.$lastRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

        // Header styling
        $sheet->getStyle('A1:C1')->applyFromArray([
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
        $sheet->getStyle('A'.$lastRow.':C'.$lastRow)->applyFromArray([
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
