import AppHeaderLayout from '@/layouts/app/app-header-layout';
import { cn } from '@/lib/utils';
import { setUrlDefaults } from '@/wayfinder';
import { usePage } from '@inertiajs/react';
import type { PropsWithChildren, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Breadcrumbs from '@/components/breadcrumbs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    ColumnDef,
    ColumnFiltersState,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
    flexRender,
} from '@tanstack/react-table';
import {
    ListFilterIcon,
    EditIcon,
    TrashIcon, PrinterIcon
} from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import type { SaleRow } from '@/types/sale';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { router } from '@inertiajs/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SaleLayoutProps {
    breadcrumbs?: Array<{ title: string; href?: string }>;
    title?: ReactNode;
    shopId?: number | string;
    // Left column content (sale form)
    left?: ReactNode;
    // Right column rows: today's sales
    sales?: SaleRow[];
    onEditSale?: (sale: SaleRow) => void;
    onViewSale?: (sale: SaleRow) => void;
    // Sur tablette (<lg), afficher la liste des ventes (true) ou le formulaire (false)
    showSalesOnTablet?: boolean;
    onToggleSalesOnTablet?: () => void;
}

export default function SaleLayout({ breadcrumbs, title, shopId, left, sales, onEditSale, onViewSale, showSalesOnTablet = false, onToggleSalesOnTablet, children }: PropsWithChildren<SaleLayoutProps>) {
    const page = usePage<{ shop?: { id: number | string } }>();
    const { props } = page;

    const effectiveShopId = useMemo(() => {
        if (shopId !== undefined && shopId !== null) {
            return shopId;
        }
        const pageShop = props?.shop;
        if (pageShop && pageShop.id) {
            return pageShop.id;
        }
        const match = typeof window !== 'undefined' ? window.location.pathname.match(/\/shops\/(\d+|[^/]+)/) : null;
        return match ? match[1] : undefined;
    }, [shopId, props]);

    useEffect(() => {
        if (effectiveShopId !== undefined) {
            setUrlDefaults({ shop: effectiveShopId as number | string });
        }
    }, [effectiveShopId]);

    const hasLeft = Boolean(left);

    return (
        <AppHeaderLayout contentFullWidth contentClassName="px-26 md:px-28 mt-5">
            {/*
             * Responsive: sur <lg, on affiche soit le formulaire, soit la liste (plein écran) selon showSalesOnTablet.
             * Sur >=lg, on revient à une grille 1/2 (form) + 2/3 (liste).
             */}
            <div className={cn("grid gap-3 lg:gap-5", hasLeft ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1")}>
                {hasLeft && (
                    <aside
                        className={cn(
                            "min-h-[60vh] rounded-md bg-background p-2 md:p-3 overflow-y-auto",
                            !showSalesOnTablet ? "block" : "hidden",
                            "lg:col-span-1 lg:block lg:max-h-[calc(100vh-140px)]"
                        )}
                    >
                        {breadcrumbs && breadcrumbs.length > 0 && (
                            <div className="mb-2 md:mb-3">
                                <Breadcrumbs items={breadcrumbs} />
                            </div>
                        )}
                        {title && <h1 className="mb-2 text-base font-semibold md:mb-3 md:text-xl">{title}</h1>}
                        <div>{left}</div>
                    </aside>
                )}

                {/* Right: Today's sales listing */}
                <section
                    className={cn(
                        "min-h-[60vh] rounded-md bg-background p-2 md:p-3 overflow-y-auto",
                        hasLeft ? (showSalesOnTablet ? "block lg:col-span-2 lg:block" : "hidden lg:col-span-2 lg:block") : "block",
                        "lg:max-h-[calc(100vh-140px)]"
                    )}
                >
                    <div className="mb-2 flex items-center justify-between gap-2 md:mb-3">
                        <h2 className="text-base font-semibold md:text-lg">Liste des ventes</h2>
                        <div className="flex items-center gap-2">
                            {hasLeft && (
                                <Button type="button" variant="outline" className="lg:hidden" onClick={onToggleSalesOnTablet}>
                                    Créer une vente
                                </Button>
                            )}
                            <SalesToolbar />
                        </div>
                    </div>

                    {/* Slot pour contenu additionnel (statistiques, filtres, etc.) */}
                    {children}

                    <SalesDataTable rows={sales ?? []} onEdit={onEditSale} onView={onViewSale} />
                </section>
            </div>
        </AppHeaderLayout>
    );
}

function SalesToolbar() {
    return (
        <div className="flex items-center gap-2 text-muted-foreground">
            <ListFilterIcon className="h-4 w-4" />
            <span className="text-xs md:text-sm">Recherche, tri et pagination</span>
        </div>
    );
}

// Hook pour la confirmation de suppression
function useConfirmDelete() {
    const [sale, setSale] = useState<SaleRow | null>(null);

    const confirmDelete = (s: SaleRow) => setSale(s);
    const cancel = () => setSale(null);
    const proceed = () => {
        if (!sale) return;
        router.delete(
            route('shops.sales.destroy', { shop: sale.shop_id, sale: sale.id }),
            { onFinish: cancel }
        );
    };

    return { sale, confirmDelete, cancel, proceed };
}

function SalesDataTable({ rows, onEdit, onView }: { rows: SaleRow[]; onEdit?: (row: SaleRow) => void; onView?: (row: SaleRow) => void }) {
    const { props } = usePage<{ auth?: { user?: { roles?: string[] } } }>();
    const roles = props.auth?.user?.roles ?? [];
    const canEdit = roles.includes('Super admin') || roles.includes('admin');
    const canDelete = roles.includes('Super admin') || roles.includes('admin');
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState<SortingState>([{ id: 'sale_date', desc: true }]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const searchRef = useRef<HTMLInputElement>(null);
    const { sale: toDelete, confirmDelete, cancel, proceed } = useConfirmDelete();

    // Définition des colonnes
    const columns: ColumnDef<SaleRow>[] = useMemo(() => [
        {
            header: 'N° Ticket',
            accessorKey: 'receipt_number',
            size: 140,
            cell: ({ row }) => row.original.receipt_number ?? `#${row.original.id}`,
        },
        {
            header: 'Date',
            accessorKey: 'sale_date',
            size: 140,
            cell: ({ row }) => {
                const date = new Date(row.original.sale_date);
                return (
                    <div className="flex flex-col">
                        <span>{format(date, 'dd-MM-yyyy', { locale: fr })}</span>
                        <span className="text-[10px] text-muted-foreground">{format(date, 'HH:mm', { locale: fr })}</span>
                    </div>
                );
            },
        },
        {
            header: 'Coiffeur',
            accessorKey: 'hairdresser_name',
            size: 160,
            cell: ({ row }) => row.original.hairdresser_name ?? '—',
        },
        {
            header: 'Paiement',
            accessorKey: 'payment_method',
            size: 140,
            cell: ({ row }) => {
                const method = row.original.payment_method;
                if (method === 'orange_money') {
                    return <span className="inline-flex items-center rounded-md bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-700 dark:text-orange-400">Orange Money</span>;
                }
                if (method === 'caisse') {
                    return <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">Caisse</span>;
                }
                return <span className="text-muted-foreground">—</span>;
            },
        },
        {
            header: 'Client',
            accessorKey: 'customer_name',
            size: 160,
            cell: ({ row }) => row.original.customer_name ?? '—',
        },
        {
            header: 'Promotion',
            accessorKey: 'promotion_applied',
            size: 160,
            cell: ({ row }) =>
                row.original.promotion_applied ? (
                    <span className="inline-flex items-center gap-1 text-xs">
            <span className="inline-block rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-400">Promo</span>
            <span className="text-muted-foreground">{row.original.promotion_label ?? ''}</span>
          </span>
                ) : <span className="text-muted-foreground">—</span>
        },
        {
            header: 'Détails',
            accessorKey: 'details',
            size: 220,
            cell: ({ row }) => {
                const items = row.original.details ?? [];
                if (items.length === 0) return <span className="text-muted-foreground">—</span>;
                const hasProducts = items.some((d) => d.type === 'product');
                const hasServices = items.some((d) => d.type === 'service');
                return (
                    <HoverCard openDelay={150} closeDelay={100}>
                        <HoverCardTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 px-2">Voir</Button>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-[380px] p-4">
                            <div className="space-y-2">
                                {hasProducts && (
                                    <div>
                                        <div className="mb-1 text-xs font-medium text-muted-foreground">Produits</div>
                                        <div className="overflow-hidden rounded-md border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-muted/40">
                                                        <TableHead className="h-8 py-1">Produit</TableHead>
                                                        <TableHead className="h-8 py-1 w-[70px] text-right">Qté</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {items.filter((d) => d.type === 'product').map((p, idx) => (
                                                        <TableRow key={`p-${idx}`}>
                                                            <TableCell className="py-1 text-sm">{p.name}</TableCell>
                                                            <TableCell className="py-1 text-right text-sm">{p.quantity ?? 1}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                )}
                                {hasServices && (
                                    <div>
                                        <div className="mb-1 text-xs font-medium text-muted-foreground">Services</div>
                                        <div className="overflow-hidden rounded-md border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-muted/40">
                                                        <TableHead className="h-8 py-1">Service</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {items.filter((d) => d.type === 'service').map((srv, idx) => (
                                                        <TableRow key={`s-${idx}`}>
                                                            <TableCell className="py-1 text-sm">{srv.name}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </HoverCardContent>
                    </HoverCard>
                );
            },
        },
        {
            header: 'Total',
            accessorKey: 'total_amount',
            size: 110,
            cell: ({ row }) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(Number(row.original.total_amount ?? 0)).replace(/\u00A0/g, ' ') + ' F CFA'
        },
        {
            header: 'Actions',
            accessorKey: 'actions',
            size: 120,
            cell: ({ row }) => (
                <div className="flex items-center justify-end gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => onView?.(row.original)}
                        aria-label="Détails"
                        title="Détails"
                    >
                        <PrinterIcon className="h-4 w-4" />
                    </Button>
                    {canEdit && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => onEdit?.(row.original)}
                            aria-label="Modifier"
                            title="Modifier"
                        >
                            <EditIcon className="h-4 w-4" />
                        </Button>
                    )}
                    {canDelete && (
                        <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => confirmDelete(row.original)}
                            aria-label="Supprimer"
                            title="Supprimer"
                        >
                            <TrashIcon className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            ),
        },
    ], [onEdit, onView, confirmDelete]);

    const table = useReactTable({
        data: useMemo(() => rows, [rows]),
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        state: { sorting, globalFilter, columnFilters },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnFiltersChange: setColumnFilters,
        globalFilterFn: (row, _columnId, filter) => {
            const v = String(filter ?? '').toLowerCase();
            if (!v) return true;
            const r = row.original;
            const details = (r.details ?? []).map((it) => `${it.name}${it.quantity ? ` x${it.quantity}` : ''}`).join(' ');
            const blob = `${r.receipt_number ?? ''} ${r.customer_name ?? ''} ${r.hairdresser_name ?? ''} ${r.promotion_label ?? ''} ${r.payment_method ?? ''} ${details}`.toLowerCase();
            return blob.includes(v);
        },
    });

    return (
        <>
            <div className="space-y-2 md:space-y-3">
                {/* Toolbar */}
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2">
                        <Input
                            ref={searchRef}
                            value={globalFilter}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            placeholder="Rechercher (ticket, client, coiffeur)"
                            className="h-9 w-[260px]"
                        />
                        {globalFilter && (
                            <Button variant="ghost" size="sm" onClick={() => { setGlobalFilter(''); searchRef.current?.focus(); }}>Effacer</Button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{table.getPrePaginationRowModel().rows.length} résultat(s)</span>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-md border">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((hg) => (
                                <TableRow key={hg.id} className="bg-muted/50">
                                    {hg.headers.map((h) => (
                                        <TableHead key={h.id} style={{ width: h.getSize() }}>
                                            {h.isPlaceholder ? null : (
                                                <button
                                                    className={cn('inline-flex items-center gap-1', h.column.getCanSort() && 'cursor-pointer select-none')}
                                                    onClick={h.column.getToggleSortingHandler()}
                                                >
                                                    {flexRender(h.column.columnDef.header, h.getContext())}
                                                    {{ asc: '↑', desc: '↓' }[h.column.getIsSorted() as 'asc' | 'desc'] ?? null}
                                                </button>
                                            )}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows.map((r) => (
                                <TableRow key={r.id}>
                                    {r.getVisibleCells().map((c) => (
                                        <TableCell key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</TableCell>
                                    ))}
                                </TableRow>
                            ))}
                            {table.getRowModel().rows.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="text-center text-sm text-muted-foreground">
                                        Aucune vente pour le moment.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Modal de confirmation de suppression */}
            <AlertDialog open={!!toDelete} onOpenChange={cancel}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer la vente</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. Les stocks des produits liés seront restaurés.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={proceed} className="bg-destructive">
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </>
    );
}
