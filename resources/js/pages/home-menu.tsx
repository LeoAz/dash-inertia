import AppHeaderLayout from '@/layouts/app/app-header-layout'
import { Head, Link, usePage } from '@inertiajs/react'
import { Users, Store } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

type PageProps = {
  auth?: { user?: { roles?: string[]; name?: string } }
}

export default function HomeMenu() {
  const { props } = usePage<PageProps>()
  const roles = props.auth?.user?.roles ?? []
  const isSuper = roles.includes('Super admin')
  const name = props.auth?.user?.name ?? ''

  return (
    <AppHeaderLayout contentFullWidth contentClassName="px-18 sm:px-20 md:px-24 lg:px-28 mt-5">
      <Head title="Accueil" />

      <section className="mx-auto max-w-7xl">
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{name ? `Bienvenue, ${name} 👋` : 'Bienvenue 👋'}</h1>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">Sélectionnez une section pour continuer.</p>
        </div>

        {!isSuper ? (
          <p className="text-muted-foreground">Vous n’avez pas accès à ce menu.</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6">
            <MenuCard href="/admin/users" title="Accès utilisateurs" description="Gérer les utilisateurs et leurs rôles" icon={<Users className="h-10 w-10" />} bg="bg-blue-500/10" iconBg="bg-blue-500/20" />
            <MenuCard href="/admin/shops" title="Gestion des boutiques" description="Créer et administrer les boutiques" icon={<Store className="h-10 w-10" />} bg="bg-emerald-500/10" iconBg="bg-emerald-500/20" />
          </div>
        )}
      </section>
    </AppHeaderLayout>
  )
}

function MenuCard({ href, title, description, icon, bg, iconBg }: { href: string; title: string; description?: string; icon: React.ReactNode; bg?: string; iconBg?: string }) {
  return (
    <Link href={href} className="block">
      <Card className={`transition-colors hover:border-foreground/30 ${bg ?? ''}`}>
        <CardContent className="flex items-start gap-5 p-6 min-h-[120px] md:min-h-[140px]">
          <div className={`rounded-md p-3 ${iconBg ?? 'bg-muted/50'}`}>{icon}</div>
          <div>
            <div className="text-lg font-semibold leading-tight md:text-xl">{title}</div>
            {description && <div className="mt-0.5 text-sm text-muted-foreground md:text-base">{description}</div>}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
