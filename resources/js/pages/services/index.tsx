import ShopConfigLayout from '@/layouts/app/shop-config-layout';
import { Form, Head, router } from '@inertiajs/react';
import type { Service, ServicePageProps } from '@/types/service';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { store as storeRoute, update as updateRoute, destroy as destroyRoute } from '@/routes/shops/services';
import { Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ServicesIndex({ services, shop }: ServicePageProps) {
  const currentShopId = Number(shop.id);

  const [createOpen, setCreateOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [deleteService, setDeleteService] = useState<Service | null>(null);

  return (
    <ShopConfigLayout breadcrumbs={[{ title: 'Boutiques', href: '#' }, { title: 'Liste des services' }]} title="" shopId={currentShopId}>
      <Head title="Liste des services" />
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Liste des services</h1>
          <Button onClick={() => setCreateOpen(true)}>Ajouter un service</Button>
        </div>

        <div className="overflow-hidden rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="h-9 py-2">Nom</TableHead>
                <TableHead className="h-9 py-2">Prix</TableHead>
                <TableHead className="h-9 py-2">Quantité</TableHead>
                <TableHead className="h-9 py-2">Description</TableHead>
                <TableHead className="h-9 py-2 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.data.map((s: Service) => (
                <TableRow key={s.id}>
                  <TableCell className="py-2 font-medium">{s.name}</TableCell>
                  <TableCell className="py-2">{Number(s.price).toFixed(2)}</TableCell>
                  <TableCell className="py-2">{s.quantity}</TableCell>
                  <TableCell className="py-2">{s.description ?? '—'}</TableCell>
                  <TableCell className="py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditService(s)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeleteService(s)}>
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
      <ServiceFormModal
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        shopId={currentShopId}
      />

      {/* Create/Edit Modal (Edit instance) */}
      <ServiceFormModal
        mode="edit"
        open={!!editService}
        onOpenChange={(o) => { if (!o) setEditService(null); }}
        shopId={currentShopId}
        service={editService}
      />

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteService} onOpenChange={(o) => !o && setDeleteService(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">
            Êtes-vous sûr de vouloir supprimer « {deleteService?.name} » ? Cette action est irréversible.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteService(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteService) return;
                router.delete(
                  destroyRoute.url({ shop: currentShopId, service: deleteService.id }),
                  {
                    preserveScroll: true,
                    onSuccess: () => {
                      setDeleteService(null);
                      toast.success('Suppression réussie', { description: 'Service supprimé.' });
                    },
                    onError: () => {
                      toast.error('Erreur', { description: 'Impossible de supprimer le service.' });
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


// Reusable modal for both create and edit service forms
function ServiceFormModal({
  mode,
  open,
  onOpenChange,
  shopId,
  service,
}: {
  mode: 'create' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopId: number;
  service?: Service | null;
}) {
  const isEdit = mode === 'edit' && !!service;
  const action = isEdit
    ? updateRoute.url({ shop: shopId, service: (service as Service).id })
    : storeRoute.url({ shop: shopId });
  const method = isEdit ? 'put' : 'post';
  const title = isEdit ? 'Modifier le service' : 'Ajouter un service';
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
            description: isEdit ? 'Service mis à jour.' : 'Service créé avec succès.',
            });
          }}
          onError={() => {
            toast.error('Erreur', {
            description: isEdit ? 'Impossible de mettre à jour le service.' : 'Impossible de créer le service.',
            });
          }}
          className="flex flex-col gap-4"
          defaults={isEdit ? {
            name: (service as Service).name,
            price: (service as Service).price,
            quantity: (service as Service).quantity,
            description: (service as Service).description ?? '',
          } : {
            name: '',
            price: '',
            quantity: 1,
            description: '',
          }}
        >
          {({ errors, processing }) => (
            <>
              <div className="grid gap-2">
                <Label htmlFor={isEdit ? 'edit-name' : 'name'}>Nom</Label>
                <Input id={isEdit ? 'edit-name' : 'name'} name="name" required autoFocus={!isEdit} defaultValue={isEdit ? (service as Service).name : undefined} />
                <InputError message={errors.name} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={isEdit ? 'edit-price' : 'price'}>Prix</Label>
                <Input id={isEdit ? 'edit-price' : 'price'} name="price" type="number" step="0.01" min={0} required defaultValue={isEdit ? (service as Service).price : undefined} />
                <InputError message={errors.price} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={isEdit ? 'edit-quantity' : 'quantity'}>Quantité</Label>
                <Input id={isEdit ? 'edit-quantity' : 'quantity'} name="quantity" type="number" min={0} required defaultValue={isEdit ? (service as Service).quantity : 1} />
                <InputError message={errors.quantity} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={isEdit ? 'edit-description' : 'description'}>Description</Label>
                <textarea
                  id={isEdit ? 'edit-description' : 'description'}
                  name="description"
                  defaultValue={isEdit ? (service as Service).description ?? '' : undefined}
                  className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-hidden ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <InputError message={errors.description} />
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
