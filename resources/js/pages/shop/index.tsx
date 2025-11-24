import AdminLayout from '@/layouts/app/admin-layout'
import { Form, Head, Link, router, usePage } from '@inertiajs/react'
import type { Shop, ShopPageProps } from '@/types/shop'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import InputError from '@/components/input-error'
import { index as productsIndex } from '@/routes/shops/products'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import { store as storeRoute, update as updateRoute, destroy as destroyRoute } from '@/routes/admin/shops'

export default function ShopIndex({ shops, filters }: ShopPageProps) {
  const { props } = usePage<{ auth?: { user?: { roles?: string[] } } }>()
  const roles = props.auth?.user?.roles ?? []
  const isSuper = roles.includes('Super admin')

  const [createOpen, setCreateOpen] = useState(false)
  const [editShop, setEditShop] = useState<Shop | null>(null)
  const [deleteShop, setDeleteShop] = useState<Shop | null>(null)

  // Search state initialised from server filters
  const [search, setSearch] = useState<string>(filters?.search ?? '')
  const [debounced, setDebounced] = useState<string>(filters?.search ?? '')

  // Debounce input changes
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(id)
  }, [search])

  // When debounced value changes, refresh list with query param
  useEffect(() => {
    // Build target URL preserving existing query but overriding search and resetting page
    router.get(
      '/admin/shops' + (debounced ? `?search=${encodeURIComponent(debounced)}` : ''),
      {},
      { preserveScroll: true, preserveState: true, replace: true },
    )
  // We intentionally want to run on every debounced change
  }, [debounced])

  return (
    <AdminLayout
      title=""
      breadcrumbs={[{ title: 'Admin', href: '/admin' }, { title: 'Boutiques' }]}
      menu={[
        { key: 'users', label: 'Gestion des utilisateurs', href: '/admin/users' },
        { key: 'shops', label: 'Gestion des boutiques', href: '/admin/shops' },
      ]}
    >
      <Head title="Boutiques" />
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-xl font-semibold">Liste des boutiques</h1>
          <div className="flex items-center gap-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une boutique..."
              aria-label="Rechercher une boutique"
              className="w-64 max-w-full"
            />
            {isSuper && (
              <Button onClick={() => setCreateOpen(true)}>Ajouter une boutique</Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {shops.data.map((s: Shop) => (
            <Card key={s.id} className="border">
              <CardHeader>
                <CardTitle className="text-base">{s.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <div className="space-y-1.5">
                  <div><span className="font-medium text-foreground">Adresse:</span> {s.address ?? '—'}</div>
                  <div><span className="font-medium text-foreground">Téléphone:</span> {s.phone ?? '—'}</div>
                  <div>
                    <span className="font-medium text-foreground">Email:</span>{' '}
                    {s.email ? (
                      <Link href={`mailto:${s.email}`} className="text-primary hover:underline">{s.email}</Link>
                    ) : (
                      '—'
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <div className="flex w-full items-center justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={() => router.visit(productsIndex.url({ shop: s.id }))}>Détails</Button>
                  <Button variant="outline" size="sm" onClick={() => setEditShop(s)}>Modifier</Button>
                  {isSuper && (
                    <Button variant="destructive" size="sm" onClick={() => setDeleteShop(s)}>Supprimer</Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* Create Modal */}
      <ShopFormModal mode="create" open={createOpen} onOpenChange={setCreateOpen} />

      {/* Edit Modal */}
      <ShopFormModal mode="edit" open={!!editShop} onOpenChange={(o) => { if (!o) setEditShop(null) }} shop={editShop} />

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteShop} onOpenChange={(o) => !o && setDeleteShop(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">Êtes-vous sûr de vouloir supprimer « {deleteShop?.name} » ? Cette action est irréversible.</p>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteShop(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteShop) return
                router.delete(
                  destroyRoute.url({ shop: deleteShop.id }),
                  {
                    preserveScroll: true,
                    onSuccess: () => {
                      setDeleteShop(null)
                      toast.success('Suppression réussie', { description: 'Boutique supprimée.' })
                    },
                    onError: () => {
                      toast.error('Erreur', { description: 'Impossible de supprimer la boutique.' })
                    },
                  },
                )
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  )
}

function ShopFormModal({ mode, open, onOpenChange, shop }: { mode: 'create' | 'edit'; open: boolean; onOpenChange: (open: boolean) => void; shop?: Shop | null }) {
  const isEdit = mode === 'edit' && !!shop
  const action = isEdit ? updateRoute.url({ shop: (shop as Shop).id }) : storeRoute.url()
  const method = isEdit ? 'put' : 'post'
  const title = isEdit ? 'Modifier la boutique' : 'Ajouter une boutique'
  const submitLabel = isEdit ? 'Enregistrer' : 'Créer'

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
            onOpenChange(false)
            toast.success(isEdit ? 'Modification réussie' : 'Création réussie', { description: isEdit ? 'Boutique mise à jour.' : 'Boutique créée avec succès.' })
          }}
          onError={() => {
            toast.error('Erreur', { description: isEdit ? 'Impossible de mettre à jour la boutique.' : 'Impossible de créer la boutique.' })
          }}
          className="flex flex-col gap-4"
          defaults={isEdit ? {
            name: (shop as Shop).name,
            address: (shop as Shop).address ?? '',
            phone: (shop as Shop).phone ?? '',
            email: (shop as Shop).email ?? '',
          } : undefined}
        >
          {({ errors, processing }) => (
            <>
              <div className="grid gap-2">
                <Label htmlFor={isEdit ? 'edit-name' : 'name'}>Nom</Label>
                <Input id={isEdit ? 'edit-name' : 'name'} name="name" required autoFocus={!isEdit} defaultValue={isEdit ? (shop as Shop).name : undefined} />
                <InputError message={errors.name} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={isEdit ? 'edit-address' : 'address'}>Adresse</Label>
                <Input id={isEdit ? 'edit-address' : 'address'} name="address" defaultValue={isEdit ? (shop as Shop).address ?? '' : undefined} />
                <InputError message={errors.address} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={isEdit ? 'edit-phone' : 'phone'}>Téléphone</Label>
                <Input id={isEdit ? 'edit-phone' : 'phone'} name="phone" defaultValue={isEdit ? (shop as Shop).phone ?? '' : undefined} />
                <InputError message={errors.phone} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={isEdit ? 'edit-email' : 'email'}>Email</Label>
                <Input id={isEdit ? 'edit-email' : 'email'} name="email" type="email" defaultValue={isEdit ? (shop as Shop).email ?? '' : undefined} />
                <InputError message={errors.email} />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                <Button type="submit" disabled={processing}>{submitLabel}</Button>
              </DialogFooter>
            </>
          )}
        </Form>
      </DialogContent>
    </Dialog>
  )
}
