import AdminLayout from '@/layouts/app/admin-layout'
import { Form, Head, Link, router } from '@inertiajs/react'
import type { AdminUser, UsersPageProps, UserRole } from '@/types/user'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import InputError from '@/components/input-error'
import { toast } from 'sonner'
import { useEffect, useMemo, useState } from 'react'
import { store as storeRoute, update as updateRoute, destroy as destroyRoute } from '@/routes/admin/users'

export default function UsersIndex({ users, filters, meta }: UsersPageProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null)

  const [search, setSearch] = useState<string>(filters?.search ?? '')
  const [debounced, setDebounced] = useState<string>(filters?.search ?? '')

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(id)
  }, [search])

  useEffect(() => {
    router.get(
      '/admin/users' + (debounced ? `?search=${encodeURIComponent(debounced)}` : ''),
      {},
      { preserveScroll: true, preserveState: true, replace: true },
    )
  }, [debounced])

  const roles = meta.roles
  const shops = meta.shops

  return (
    <AdminLayout
      title=""
      breadcrumbs={[{ title: 'Admin', href: '/admin' }, { title: 'Utilisateurs' }]}
      menu={[
        { key: 'users', label: 'Gestion des utilisateurs', href: '/admin/users' },
        { key: 'shops', label: 'Gestion des boutiques', href: '/admin/shops' },
      ]}
    >
      <Head title="Utilisateurs" />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-xl font-semibold">Liste des utilisateurs</h1>
          <div className="flex items-center gap-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou email..."
              aria-label="Rechercher un utilisateur"
              className="w-64 max-w-full"
            />
            <Button onClick={() => setCreateOpen(true)}>Ajouter un utilisateur</Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="h-9 py-2">Nom</TableHead>
                <TableHead className="h-9 py-2">Email</TableHead>
                <TableHead className="h-9 py-2">Rôle</TableHead>
                <TableHead className="h-9 py-2">Boutiques</TableHead>
                <TableHead className="h-9 py-2 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.data.map((u: AdminUser) => {
                const roleLabel = (u.roles && u.roles[0]) ? u.roles[0] : '—'
                const shopsLabel = (u.shops && u.shops.length > 0) ? u.shops.map(s => s.name).join(', ') : '—'
                return (
                  <TableRow key={u.id}>
                    <TableCell className="py-2 font-medium">{u.name}</TableCell>
                    <TableCell className="py-2">
                      <Link href={`mailto:${u.email}`} className="text-primary hover:underline">{u.email}</Link>
                    </TableCell>
                    <TableCell className="py-2">{roleLabel}</TableCell>
                    <TableCell className="py-2">{shopsLabel}</TableCell>
                    <TableCell className="py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditUser(u)}>Modifier</Button>
                        <Button variant="destructive" size="sm" onClick={() => setDeleteUser(u)}>Supprimer</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create Modal */}
      <UserFormModal mode="create" open={createOpen} onOpenChange={setCreateOpen} roles={roles} shops={shops} />

      {/* Edit Modal */}
      <UserFormModal mode="edit" open={!!editUser} onOpenChange={(o) => { if (!o) setEditUser(null) }} roles={roles} shops={shops} user={editUser} />

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">Êtes-vous sûr de vouloir supprimer « {deleteUser?.name} » ? Cette action est irréversible.</p>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteUser(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteUser) return
                router.delete(
                  destroyRoute.url({ user: deleteUser.id }),
                  {
                    preserveScroll: true,
                    onSuccess: () => {
                      setDeleteUser(null)
                      toast.success('Suppression réussie', { description: 'Utilisateur supprimé.' })
                    },
                    onError: () => {
                      toast.error('Erreur', { description: "Impossible de supprimer l'utilisateur." })
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

function RoleSelector({ value, onChange, roles }: { value: UserRole; onChange: (v: UserRole) => void; roles: UserRole[] }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="role">Rôle</Label>
      <select id="role" name="role" value={value} onChange={(e) => onChange(e.target.value as UserRole)} className="h-9 rounded-md border bg-background px-3 text-sm">
        {roles.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
    </div>
  )
}

function AdminShopMulti({ shops, defaultCheckedIds }: { shops: Array<{ id: number; name: string }>; defaultCheckedIds?: number[] }) {
  return (
    <div className="grid gap-2">
      <Label> Boutiques (plusieurs) </Label>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {shops.map((s) => (
          <label key={s.id} className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" name="shop_ids[]" value={s.id} defaultChecked={defaultCheckedIds?.includes(s.id)} />
            <span>{s.name}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function SellerShopSelect({ shops, defaultValue }: { shops: Array<{ id: number; name: string }>; defaultValue?: number | null }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="shop_id">Boutique</Label>
      <select id="shop_id" name="shop_id" defaultValue={defaultValue ?? ''} className="h-9 rounded-md border bg-background px-3 text-sm">
        <option value="">— Sélectionner —</option>
        {shops.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </div>
  )
}

function UserFormModal({ mode, open, onOpenChange, roles, shops, user }: { mode: 'create' | 'edit'; open: boolean; onOpenChange: (open: boolean) => void; roles: UserRole[]; shops: Array<{ id: number; name: string }>; user?: AdminUser | null }) {
  const isEdit = mode === 'edit' && !!user
  const action = isEdit ? updateRoute.url({ user: (user as AdminUser).id }) : storeRoute.url()
  const method = isEdit ? 'put' : 'post'
  const title = isEdit ? "Modifier l'utilisateur" : 'Ajouter un utilisateur'
  const submitLabel = isEdit ? 'Enregistrer' : 'Créer'

  // Determine initial role and shop defaults
  const initialRole: UserRole = (isEdit && (user as AdminUser).roles && (user as AdminUser).roles!.length > 0 ? (user as AdminUser).roles![0] as UserRole : 'vendeur')
  const [role, setRole] = useState<UserRole>(initialRole)

  const adminCheckedIds = useMemo(() => (isEdit && user?.shops ? user.shops.map(s => s.id) : []), [isEdit, user])
  const sellerDefault = useMemo(() => (isEdit && user?.shops && user.shops[0] ? user.shops[0].id : null), [isEdit, user])

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
            toast.success(isEdit ? 'Modification réussie' : 'Création réussie', { description: isEdit ? 'Utilisateur mis à jour.' : 'Utilisateur créé avec succès.' })
          }}
          onError={() => {
            toast.error('Erreur', { description: isEdit ? 'Impossible de mettre à jour l\'utilisateur.' : 'Impossible de créer l\'utilisateur.' })
          }}
          className="flex flex-col gap-4"
          defaults={isEdit ? {
            name: (user as AdminUser).name,
            email: (user as AdminUser).email,
            role: initialRole,
          } : undefined}
        >
          {({ errors, processing }) => (
            <>
              <div className="grid gap-2">
                <Label htmlFor={isEdit ? 'edit-name' : 'name'}>Nom</Label>
                <Input id={isEdit ? 'edit-name' : 'name'} name="name" required autoFocus={!isEdit} defaultValue={isEdit ? (user as AdminUser).name : undefined} />
                <InputError message={errors.name} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={isEdit ? 'edit-email' : 'email'}>Email</Label>
                <Input id={isEdit ? 'edit-email' : 'email'} name="email" type="email" required defaultValue={isEdit ? (user as AdminUser).email : undefined} />
                <InputError message={errors.email} />
              </div>

              <RoleSelector value={role} onChange={setRole} roles={roles} />
              <InputError message={errors.role} />

              {role === 'admin' && (
                <AdminShopMulti shops={shops} defaultCheckedIds={adminCheckedIds} />
              )}

              {role === 'vendeur' && (
                <SellerShopSelect shops={shops} defaultValue={sellerDefault} />
              )}

              {/* Password fields */}
              <div className="grid gap-2">
                <Label htmlFor={isEdit ? 'edit-password' : 'password'}>Mot de passe{isEdit ? ' (laisser vide pour ne pas changer)' : ''}</Label>
                <Input id={isEdit ? 'edit-password' : 'password'} name="password" type="password" minLength={6} />
                <InputError message={errors.password} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={isEdit ? 'edit-password_confirmation' : 'password_confirmation'}>Confirmer le mot de passe</Label>
                <Input id={isEdit ? 'edit-password_confirmation' : 'password_confirmation'} name="password_confirmation" type="password" minLength={6} />
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
