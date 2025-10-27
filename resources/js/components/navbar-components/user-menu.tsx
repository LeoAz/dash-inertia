import { LogOutIcon, UserPenIcon } from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Link, usePage } from "@inertiajs/react"
import { type SharedData } from "@/types"
import { edit } from "@/routes/profile"
import { logout } from "@/routes"

export default function UserMenu() {
  const { auth } = usePage<SharedData>().props
  const user = auth?.user

  const name = user?.name ?? "Utilisateur"
  const email = user?.email ?? ""
  const initials = name
    .split(" ")
    .map((n) => n.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 px-2 hover:bg-transparent data-[state=open]:bg-accent"
        >
          <div className="flex items-center gap-2">
            <Avatar>
              <AvatarImage src={user?.avatar ?? "/origin/avatar.jpg"} alt="Profile image" />
              <AvatarFallback>{initials || "US"}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium md:inline-block">
              {name}
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-w-64" align="end">
        <DropdownMenuLabel className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-foreground">
            {name}
          </span>
          {email && (
            <span className="truncate text-xs font-normal text-muted-foreground">
              {email}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={edit()} prefetch className="flex items-center gap-2">
              <UserPenIcon size={16} className="opacity-60" aria-hidden="true" />
              <span>Paramètres</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={logout()} method="post" as="button" className="flex items-center gap-2">
            <LogOutIcon size={16} className="opacity-60" aria-hidden="true" />
            <span>Se déconnecter</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
