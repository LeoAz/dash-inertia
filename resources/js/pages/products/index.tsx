import ShopConfigLayout from '@/layouts/app/shop-config-layout';
import { Head, router, useForm } from '@inertiajs/react';
import type { Product, ProductPageProps } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEffect, useState } from 'react';
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
                <TableHead className="h-9 py-2 w-[50px]"></TableHead>
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
                  <TableCell className="py-2">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="h-8 w-8 rounded-md object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                        <span className="text-[10px] text-muted-foreground uppercase">{p.name.substring(0, 2)}</span>
                      </div>
                    )}
                  </TableCell>
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

  const { data, setData, post, errors, processing, reset, clearErrors } = useForm({
    _method: isEdit ? 'put' : 'post',
    name: '',
    quantity: 0,
    price: '',
    description: '',
    image: null as File | null,
  });

  useEffect(() => {
    if (open) {
      if (isEdit && product) {
        setData({
          _method: 'put',
          name: product.name,
          quantity: product.quantity,
          price: product.price,
          description: product.description ?? '',
          image: null,
        });
      } else {
        reset();
      }
      clearErrors();
    }
  }, [open, isEdit, product]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const action = isEdit
      ? updateRoute.url({ shop: shopId, product: (product as Product).id })
      : storeRoute.url({ shop: shopId });

    post(action, {
      preserveScroll: true,
      onSuccess: () => {
        onOpenChange(false);
        toast.success(isEdit ? 'Modification réussie' : 'Création réussie', {
          description: isEdit ? 'Produit mis à jour.' : 'Produit créé avec succès.',
        });
      },
      onError: () => {
        toast.error('Erreur', {
          description: isEdit ? 'Impossible de mettre à jour le produit.' : 'Impossible de créer le produit.',
        });
      },
    });
  };

  const title = isEdit ? 'Modifier le produit' : 'Ajouter un produit';
  const submitLabel = isEdit ? 'Enregistrer' : 'Créer';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor={isEdit ? 'edit-image' : 'image'}>Photo du produit</Label>
            <div className="flex items-center gap-4">
              {(data.image || (isEdit && product?.image_url)) && (
                <img
                  src={data.image ? URL.createObjectURL(data.image) : (product?.image_url ?? '')}
                  alt="Preview"
                  className="h-16 w-16 rounded-md object-cover border"
                />
              )}
              <Input
                id={isEdit ? 'edit-image' : 'image'}
                name="image"
                type="file"
                accept="image/*"
                onChange={(e) => setData('image', e.target.files?.[0] || null)}
              />
            </div>
            <InputError message={errors.image} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={isEdit ? 'edit-name' : 'name'}>Nom</Label>
            <Input
              id={isEdit ? 'edit-name' : 'name'}
              name="name"
              required
              autoFocus={!isEdit}
              value={data.name}
              onChange={(e) => setData('name', e.target.value)}
            />
            <InputError message={errors.name} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={isEdit ? 'edit-quantity' : 'quantity'}>Quantité</Label>
            <Input
              id={isEdit ? 'edit-quantity' : 'quantity'}
              name="quantity"
              type="number"
              required
              min={0}
              value={data.quantity}
              onChange={(e) => setData('quantity', parseInt(e.target.value) || 0)}
            />
            <InputError message={errors.quantity} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={isEdit ? 'edit-price' : 'price'}>Prix</Label>
            <Input
              id={isEdit ? 'edit-price' : 'price'}
              name="price"
              type="number"
              step="0.01"
              min={0}
              required
              value={data.price}
              onChange={(e) => setData('price', e.target.value)}
            />
            <InputError message={errors.price} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={isEdit ? 'edit-description' : 'description'}>Description</Label>
            <textarea
              id={isEdit ? 'edit-description' : 'description'}
              name="description"
              value={data.description}
              onChange={(e) => setData('description', e.target.value)}
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
        </form>
      </DialogContent>
    </Dialog>
  );
}
