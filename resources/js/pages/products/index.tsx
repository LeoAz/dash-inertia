import ShopConfigLayout from '@/layouts/app/shop-config-layout';
import { Form, Head, router } from '@inertiajs/react';
import type { Product, ProductPageProps } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { store as storeRoute, update as updateRoute, destroy as destroyRoute } from '@/routes/shops/products';
import { Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ProductsIndex({ products, shop }: ProductPageProps) {
  const currentShopId = Number(shop.id);

  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

  return (
    <ShopConfigLayout breadcrumbs={[{ title: 'Boutiques', href: '#' }, { title: 'Liste des produits' }]} title="" shopId={currentShopId}>
      <Head title="Liste des produits" />
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Liste des produits</h1>
          <Button onClick={() => setCreateOpen(true)}>Ajouter un produit</Button>
        </div>

        <div className="overflow-hidden rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="h-9 py-2">Nom</TableHead>
                <TableHead className="h-9 py-2">Quantité</TableHead>
                <TableHead className="h-9 py-2">Prix</TableHead>
                <TableHead className="h-9 py-2">Description</TableHead>
                <TableHead className="h-9 py-2 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.data.map((p: Product) => (
                <TableRow key={p.id}>
                  <TableCell className="py-2 font-medium">{p.name}</TableCell>
                  <TableCell className="py-2">{p.quantity}</TableCell>
                  <TableCell className="py-2">{Number(p.price).toFixed(2)}</TableCell>
                  <TableCell className="py-2">{p.description ?? '—'}</TableCell>
                  <TableCell className="py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditProduct(p)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeleteProduct(p)}>
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
      <ProductFormModal
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        shopId={currentShopId}
      />

      {/* Create/Edit Modal (Edit instance) */}
      <ProductFormModal
        mode="edit"
        open={!!editProduct}
        onOpenChange={(o) => { if (!o) setEditProduct(null); }}
        shopId={currentShopId}
        product={editProduct}
      />

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteProduct} onOpenChange={(o) => !o && setDeleteProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">
            Êtes-vous sûr de vouloir supprimer « {deleteProduct?.name} » ? Cette action est irréversible.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteProduct(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteProduct) return;
                router.delete(
                  destroyRoute.url({ shop: currentShopId, product: deleteProduct.id }),
                  {
                    preserveScroll: true,
                    onSuccess: () => {
                      setDeleteProduct(null);
                      toast.success('Suppression réussie', { description: 'Produit supprimé.' });
                    },
                    onError: () => {
                      toast.error('Erreur', { description: 'Impossible de supprimer le produit.' });
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


// Reusable modal for both create and edit product forms
function ProductFormModal({
  mode,
  open,
  onOpenChange,
  shopId,
  product,
}: {
  mode: 'create' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopId: number;
  product?: Product | null;
}) {
  const isEdit = mode === 'edit' && !!product;
  const action = isEdit
    ? updateRoute.url({ shop: shopId, product: (product as Product).id })
    : storeRoute.url({ shop: shopId });
  const method = isEdit ? 'put' : 'post';
  const title = isEdit ? 'Modifier le produit' : 'Ajouter un produit';
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
            description: isEdit ? 'Produit mis à jour.' : 'Produit créé avec succès.',
          });
          }}
          onError={() => {
            toast.error('Erreur', {
            description: isEdit ? 'Impossible de mettre à jour le produit.' : 'Impossible de créer le produit.',
          });
          }}
          className="flex flex-col gap-4"
          defaults={isEdit ? {
            name: (product as Product).name,
            quantity: (product as Product).quantity,
            price: (product as Product).price,
            description: (product as Product).description ?? '',
          } : undefined}
        >
          {({ errors, processing }) => (
            <>
              <div className="grid gap-2">
                <Label htmlFor={isEdit ? 'edit-name' : 'name'}>Nom</Label>
                <Input id={isEdit ? 'edit-name' : 'name'} name="name" required autoFocus={!isEdit} defaultValue={isEdit ? (product as Product).name : undefined} />
                <InputError message={errors.name} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={isEdit ? 'edit-quantity' : 'quantity'}>Quantité</Label>
                <Input id={isEdit ? 'edit-quantity' : 'quantity'} name="quantity" type="number" required min={0} defaultValue={isEdit ? (product as Product).quantity : undefined} />
                <InputError message={errors.quantity} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={isEdit ? 'edit-price' : 'price'}>Prix</Label>
                <Input id={isEdit ? 'edit-price' : 'price'} name="price" type="number" step="0.01" min={0} required defaultValue={isEdit ? (product as Product).price : undefined} />
                <InputError message={errors.price} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={isEdit ? 'edit-description' : 'description'}>Description</Label>
                <textarea
                  id={isEdit ? 'edit-description' : 'description'}
                  name="description"
                  defaultValue={isEdit ? (product as Product).description ?? '' : undefined}
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
