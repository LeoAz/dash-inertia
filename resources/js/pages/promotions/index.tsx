import ShopConfigLayout from '@/layouts/app/shop-config-layout';
import { Form, Head, router } from '@inertiajs/react';
import type { Promotion, PromotionPageProps } from '@/types/promotion';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { store as storeRoute, update as updateRoute, destroy as destroyRoute } from '@/routes/shops/promotions';
import { Edit, Trash2, CheckCircle2, XCircle, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function PromotionsIndex({ promotions, shop }: PromotionPageProps) {
  const currentShopId = Number(shop.id);

  const [createOpen, setCreateOpen] = useState(false);
  const [editPromotion, setEditPromotion] = useState<Promotion | null>(null);
  const [deletePromotion, setDeletePromotion] = useState<Promotion | null>(null);

  return (
    <ShopConfigLayout breadcrumbs={[{ title: 'Boutiques', href: '#' }, { title: 'Liste des promotions' }]} title="" shopId={currentShopId}>
      <Head title="Liste des promotions" />
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Liste des promotions</h1>
          <Button onClick={() => setCreateOpen(true)}>Ajouter une promotion</Button>
        </div>

        <div className="overflow-hidden rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="h-9 py-2">Nom</TableHead>
                <TableHead className="h-9 py-2">Type</TableHead>
                <TableHead className="h-9 py-2">Valeur</TableHead>
                <TableHead className="h-9 py-2">Période</TableHead>
                <TableHead className="h-9 py-2">Actif</TableHead>
                <TableHead className="h-9 py-2">Cible</TableHead>
                <TableHead className="h-9 py-2 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promotions.data.map((p: Promotion) => {
                const type = Number(p.percentage) > 0 ? 'Pourcentage' : 'Montant fixe';
                const value = Number(p.percentage) > 0 ? `${Number(p.percentage).toFixed(2)}%` : `${Number(p.amount).toFixed(2)}`;
                const period = [p.starts_at ?? '—', p.ends_at ?? '—'].join(' → ');
                return (
                  <TableRow key={p.id}>
                    <TableCell className="py-2 font-medium">{p.name}</TableCell>
                    <TableCell className="py-2">{type}</TableCell>
                    <TableCell className="py-2">{value}</TableCell>
                    <TableCell className="py-2">{period}</TableCell>
                    <TableCell className="py-2">
                      {p.active ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">Actif</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600">
                          <XCircle className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">Inactif</span>
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      {p.applicable_to_products && 'Produits'}
                      {p.applicable_to_products && p.applicable_to_services ? ' & ' : ''}
                      {p.applicable_to_services && 'Services'}
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditPromotion(p)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setDeletePromotion(p)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create/Edit Modal (Create instance) */}
      <PromotionFormModal
        key="create"
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        shopId={currentShopId}
      />

      {/* Create/Edit Modal (Edit instance) */}
      <PromotionFormModal
        key={editPromotion ? `edit-${editPromotion.id}` : 'edit-none'}
        mode="edit"
        open={!!editPromotion}
        onOpenChange={(o) => { if (!o) setEditPromotion(null); }}
        shopId={currentShopId}
        promotion={editPromotion}
      />

      {/* Delete Confirm */}
      <AlertDialog open={!!deletePromotion} onOpenChange={(o) => !o && setDeletePromotion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">
            Êtes-vous sûr de vouloir supprimer « {deletePromotion?.name} » ? Cette action est irréversible.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletePromotion(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deletePromotion) return;
                router.delete(
                  destroyRoute.url({ shop: currentShopId, promotion: deletePromotion.id }),
                  {
                    preserveScroll: true,
                    onSuccess: () => {
                      setDeletePromotion(null);
                      toast.success('Suppression réussie', { description: 'Promotion supprimée.' });
                    },
                    onError: () => {
                      toast.error('Erreur', { description: 'Impossible de supprimer la promotion.' });
                    },
                  }
                );
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ShopConfigLayout>
  );
}

// Reusable modal for both create and edit promotion forms
function PromotionFormModal({
  mode,
  open,
  onOpenChange,
  shopId,
  promotion,
}: {
  mode: 'create' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopId: number;
  promotion?: Promotion | null;
}) {
  const isEdit = mode === 'edit' && !!promotion;
  const action = isEdit
    ? updateRoute.url({ shop: shopId, promotion: (promotion as Promotion).id })
    : storeRoute.url({ shop: shopId });
  const method = isEdit ? 'put' : 'post';
  const title = isEdit ? 'Modifier la promotion' : 'Ajouter une promotion';
  const submitLabel = isEdit ? 'Enregistrer' : 'Créer';

  const defaults = useMemo(() => (isEdit ? {
    name: (promotion as Promotion).name,
    percentage: Number((promotion as Promotion).percentage) > 0 ? (promotion as Promotion).percentage : '',
    amount: Number((promotion as Promotion).amount) > 0 ? (promotion as Promotion).amount : '',
    active: (promotion as Promotion).active,
    applicable_to_products: (promotion as Promotion).applicable_to_products,
    applicable_to_services: (promotion as Promotion).applicable_to_services,
    starts_at: (promotion as Promotion).starts_at ?? '',
    ends_at: (promotion as Promotion).ends_at ?? '',
  } : undefined), [isEdit, promotion]);

  // Local UI states for both create and edit modes (datepicker + styled checkboxes)
  const [startsAtDate, setStartsAtDate] = useState<Date | undefined>(() => (isEdit && defaults?.starts_at ? new Date(defaults.starts_at as string) : undefined));
  const [endsAtDate, setEndsAtDate] = useState<Date | undefined>(() => (isEdit && defaults?.ends_at ? new Date(defaults.ends_at as string) : undefined));
  const [active, setActive] = useState<boolean>(isEdit ? !!defaults?.active : true);
  const [apProducts, setApProducts] = useState<boolean>(isEdit ? !!defaults?.applicable_to_products : true);
  const [apServices, setApServices] = useState<boolean>(isEdit ? !!defaults?.applicable_to_services : true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form
          action={action}
          method={method as 'post' | 'put'}
          preserveScroll
          onSuccess={() => {
            onOpenChange(false);
            toast.success(isEdit ? 'Modification réussie' : 'Création réussie', {
              description: isEdit ? 'Promotion mise à jour.' : 'Promotion créée avec succès.',
            });
          }}
          onError={() => {
            toast.error('Erreur', {
              description: isEdit ? 'Impossible de mettre à jour la promotion.' : 'Impossible de créer la promotion.',
            });
          }}
          className="flex flex-col gap-4"
          defaults={defaults}
        >
          {({ errors, processing }) => (
            <>
              <div className="grid gap-2">
                <Label htmlFor={isEdit ? 'edit-name' : 'name'}>Nom</Label>
                <Input id={isEdit ? 'edit-name' : 'name'} name="name" required autoFocus={!isEdit} defaultValue={isEdit ? (promotion as Promotion).name : undefined} />
                <InputError message={errors.name} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor={isEdit ? 'edit-percentage' : 'percentage'}>Pourcentage (%)</Label>
                <Input id={isEdit ? 'edit-percentage' : 'percentage'} name="percentage" type="number" step="0.01" min={0} max={100} placeholder="Ex: 10" defaultValue={defaults?.percentage as string | undefined} />
                <InputError message={errors.percentage} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor={isEdit ? 'edit-amount' : 'amount'}>Montant fixe</Label>
                <Input id={isEdit ? 'edit-amount' : 'amount'} name="amount" type="number" step="0.01" min={0} placeholder="Ex: 1000" defaultValue={defaults?.amount as string | undefined} />
                <InputError message={errors.amount} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Date de début</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="group w-full justify-between border-input bg-background px-3 font-normal outline-offset-0 outline-none hover:bg-background focus-visible:outline-[3px]"
                        type="button"
                      >
                        <span className={cn('truncate', !startsAtDate && 'text-muted-foreground')}>
                          {startsAtDate ? format(startsAtDate, 'dd/MM/yyyy', { locale: fr }) : 'Choisir une date'}
                        </span>
                        <CalendarIcon size={16} className="shrink-0 text-muted-foreground/80 transition-colors group-hover:text-foreground" aria-hidden="true" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="start">
                      <Calendar mode="single" selected={startsAtDate} onSelect={setStartsAtDate} locale={fr} />
                    </PopoverContent>
                  </Popover>
                  <input type="hidden" name="starts_at" value={startsAtDate ? format(startsAtDate, 'yyyy-MM-dd') : ''} />
                  <InputError message={errors.starts_at} />
                </div>
                <div className="grid gap-2">
                  <Label>Date de fin</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="group w-full justify-between border-input bg-background px-3 font-normal outline-offset-0 outline-none hover:bg-background focus-visible:outline-[3px]"
                        type="button"
                      >
                        <span className={cn('truncate', !endsAtDate && 'text-muted-foreground')}>
                          {endsAtDate ? format(endsAtDate, 'dd/MM/yyyy', { locale: fr }) : 'Choisir une date'}
                        </span>
                        <CalendarIcon size={16} className="shrink-0 text-muted-foreground/80 transition-colors group-hover:text-foreground" aria-hidden="true" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="start">
                      <Calendar mode="single" selected={endsAtDate} onSelect={setEndsAtDate} locale={fr} />
                    </PopoverContent>
                  </Popover>
                  <input type="hidden" name="ends_at" value={endsAtDate ? format(endsAtDate, 'yyyy-MM-dd') : ''} />
                  <InputError message={errors.ends_at} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {/* Active */}
                <div className="relative flex w-full items-start gap-2 rounded-md border border-input p-4 shadow-xs outline-none has-data-[state=checked]:border-primary/50">
                  <Checkbox id="active" checked={active} onCheckedChange={(v) => setActive(!!v)} className="order-1 after:absolute after:inset-0" />
                  <div className="grid gap-1">
                    <Label htmlFor="active">Actif</Label>
                    <p className="text-xs text-muted-foreground">Afficher la promotion comme active.</p>
                  </div>
                  <input type="hidden" name="active" value={active ? '1' : '0'} />
                </div>
                {/* Products */}
                <div className="relative flex w-full items-start gap-2 rounded-md border border-input p-4 shadow-xs outline-none has-data-[state=checked]:border-primary/50">
                  <Checkbox id="ap-products" checked={apProducts} onCheckedChange={(v) => setApProducts(!!v)} className="order-1 after:absolute after:inset-0" />
                  <div className="grid gap-1">
                    <Label htmlFor="ap-products">Produits</Label>
                    <p className="text-xs text-muted-foreground">S’applique aux produits.</p>
                  </div>
                  <input type="hidden" name="applicable_to_products" value={apProducts ? '1' : '0'} />
                </div>
                {/* Services */}
                <div className="relative flex w-full items-start gap-2 rounded-md border border-input p-4 shadow-xs outline-none has-data-[state=checked]:border-primary/50">
                  <Checkbox id="ap-services" checked={apServices} onCheckedChange={(v) => setApServices(!!v)} className="order-1 after:absolute after:inset-0" />
                  <div className="grid gap-1">
                    <Label htmlFor="ap-services">Services</Label>
                    <p className="text-xs text-muted-foreground">S’applique aux services.</p>
                  </div>
                  <input type="hidden" name="applicable_to_services" value={apServices ? '1' : '0'} />
                </div>
                <InputError message={errors.applicable_to_products} />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={processing}>{submitLabel}</Button>
              </DialogFooter>
            </>
          )}
        </Form>
      </DialogContent>
    </Dialog>
  );
}
