import ShopConfigLayout from '@/layouts/app/shop-config-layout';
import { Form, Head, router } from '@inertiajs/react';
import type { Hairdresser, HairdresserPageProps } from '@/types/hairdresser';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { store as storeRoute, update as updateRoute, destroy as destroyRoute } from '@/routes/shops/hairdressers';
import { Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function HairdressersIndex({ hairdressers, shop }: HairdresserPageProps) {
  const currentShopId = Number(shop.id);

  const [createOpen, setCreateOpen] = useState(false);
  const [editHairdresser, setEditHairdresser] = useState<Hairdresser | null>(null);
  const [deleteHairdresser, setDeleteHairdresser] = useState<Hairdresser | null>(null);

  return (
    <ShopConfigLayout breadcrumbs={[{ title: 'Boutiques', href: '#' }, { title: 'Liste des coiffeurs' }]} title="" shopId={currentShopId}>
      <Head title="Liste des coiffeurs" />
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Liste des coiffeurs</h1>
          <Button onClick={() => setCreateOpen(true)}>Ajouter un coiffeur</Button>
        </div>

        <div className="overflow-hidden rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="h-9 py-2">Nom</TableHead>
                <TableHead className="h-9 py-2">Téléphone</TableHead>
                <TableHead className="h-9 py-2">Date d'embauche</TableHead>
                <TableHead className="h-9 py-2 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hairdressers.data.map((h: Hairdresser) => (
                <TableRow key={h.id}>
                  <TableCell className="py-2 font-medium">{h.name}</TableCell>
                  <TableCell className="py-2">{h.phone ?? '—'}</TableCell>
                  <TableCell className="py-2">{h.hire_date ?? '—'}</TableCell>
                  <TableCell className="py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditHairdresser(h)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeleteHairdresser(h)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create/Edit Modal (Create instance) */}
      <HairdresserFormModal
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        shopId={currentShopId}
      />

      {/* Create/Edit Modal (Edit instance) */}
      <HairdresserFormModal
        mode="edit"
        open={!!editHairdresser}
        onOpenChange={(o) => { if (!o) setEditHairdresser(null); }}
        shopId={currentShopId}
        hairdresser={editHairdresser}
      />

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteHairdresser} onOpenChange={(o) => !o && setDeleteHairdresser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">
            Êtes-vous sûr de vouloir supprimer « {deleteHairdresser?.name} » ? Cette action est irréversible.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteHairdresser(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteHairdresser) return;
                router.delete(
                  destroyRoute.url({ shop: currentShopId, hairdresser: deleteHairdresser.id }),
                  {
                    preserveScroll: true,
                    onSuccess: () => {
                      setDeleteHairdresser(null);
                      toast.success('Suppression réussie', { description: 'Coiffeur supprimé.' });
                    },
                    onError: () => {
                      toast.error('Erreur', { description: 'Impossible de supprimer le coiffeur.' });
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


// Reusable modal for both create and edit hairdresser forms
function HairdresserFormModal({
  mode,
  open,
  onOpenChange,
  shopId,
  hairdresser,
}: {
  mode: 'create' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopId: number;
  hairdresser?: Hairdresser | null;
}) {
  const isEdit = mode === 'edit' && !!hairdresser;
  const action = isEdit
    ? updateRoute.url({ shop: shopId, hairdresser: (hairdresser as Hairdresser).id })
    : storeRoute.url({ shop: shopId });
  const method = isEdit ? 'put' : 'post';
  const title = isEdit ? 'Modifier le coiffeur' : 'Ajouter un coiffeur';
  const submitLabel = isEdit ? 'Enregistrer' : 'Créer';

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
            description: isEdit ? 'Coiffeur mis à jour.' : 'Coiffeur créé avec succès.',
            });
          }}
          onError={() => {
            toast.error('Erreur', {
            description: isEdit ? 'Impossible de mettre à jour le coiffeur.' : 'Impossible de créer le coiffeur.',
            });
          }}
          className="flex flex-col gap-4"
          defaults={isEdit ? {
            name: (hairdresser as Hairdresser).name,
            phone: (hairdresser as Hairdresser).phone ?? '',
            hire_date: (hairdresser as Hairdresser).hire_date ?? '',
          } : undefined}
        >
          {({ errors, processing }) => (
            <>
              <div className="grid gap-2">
                <Label htmlFor={isEdit ? 'edit-name' : 'name'}>Nom</Label>
                <Input id={isEdit ? 'edit-name' : 'name'} name="name" required autoFocus={!isEdit} defaultValue={isEdit ? (hairdresser as Hairdresser).name : undefined} />
                <InputError message={errors.name} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={isEdit ? 'edit-phone' : 'phone'}>Téléphone</Label>
                <Input id={isEdit ? 'edit-phone' : 'phone'} name="phone" type="tel" defaultValue={isEdit ? (hairdresser as Hairdresser).phone ?? '' : undefined} />
                <InputError message={errors.phone} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={isEdit ? 'edit-hire-date' : 'hire_date'}>Date d'embauche</Label>
                <Input id={isEdit ? 'edit-hire-date' : 'hire_date'} name="hire_date" type="date" defaultValue={isEdit ? (hairdresser as Hairdresser).hire_date ?? '' : undefined} />
                <InputError message={errors.hire_date} />
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
