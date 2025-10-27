import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import Logo from '@/components/navbar-components/logo';
import NotificationMenu from '@/components/navbar-components/notification-menu';
import UserMenu from '@/components/navbar-components/user-menu';
import SecondaryNav from '@/components/secondary-nav';
import {
    Breadcrumb,
    BreadcrumbEllipsis,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectValue,
} from '@/components/ui/select';
import { ChevronsUpDown } from 'lucide-react';
import { Select as SelectPrimitive } from 'radix-ui';
import type { BreadcrumbItem as TBreadcrumbItem } from '@/types';
import type { PropsWithChildren } from 'react';

export default function AppHeaderLayout(
    props: PropsWithChildren<{ breadcrumbs?: TBreadcrumbItem[] }>,
) {
    const { children } = props;
    return (
        <AppShell>
            <header className="border-b px-26 md:px-28">
                <div className="flex h-16 items-center justify-between gap-4">
                    {/* Left side */}
                    <div className="flex items-center gap-2">
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="#" className="text-foreground">
                                        <Logo />
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator> / </BreadcrumbSeparator>
                                <BreadcrumbItem className="md:hidden">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger className="hover:text-foreground">
                                            <BreadcrumbEllipsis />
                                            <span className="sr-only">Toggle menu</span>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start">
                                            <DropdownMenuItem asChild>
                                                <a href="#">Liste des boutiques</a>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </BreadcrumbItem>
                                <BreadcrumbItem className="max-md:hidden">
                                    <BreadcrumbLink href="#">Liste des boutiques</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator> / </BreadcrumbSeparator>
                                <BreadcrumbItem>
                                    {/* The dropdown values will be defined later */}
                                    <Select defaultValue="1">
                                        <SelectPrimitive.SelectTrigger aria-label="Select project" asChild>
                                            <Button
                                                variant="ghost"
                                                className="h-8 px-1.5 text-foreground focus-visible:bg-accent focus-visible:ring-0"
                                            >
                                                <SelectValue placeholder="Select project" />
                                                <ChevronsUpDown size={14} className="text-muted-foreground/80" />
                                            </Button>
                                        </SelectPrimitive.SelectTrigger>
                                        <SelectContent className="[&_*[role=option]]:ps-2 [&_*[role=option]]:pe-8 [&_*[role=option]>span]:start-auto [&_*[role=option]>span]:end-2">
                                            <SelectItem value="1">Main project</SelectItem>
                                            <SelectItem value="2">Origin project</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                    {/* Right side */}
                    <div className="flex items-center gap-4">
                        {/* Notification */}
                        <NotificationMenu />
                        {/* User menu */}
                        <UserMenu />
                    </div>
                </div>
            </header>
            <SecondaryNav />
            <AppContent>{children}</AppContent>
        </AppShell>
    );
}
