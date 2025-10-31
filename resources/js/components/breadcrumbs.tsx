import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import type { PropsWithChildren } from 'react'

export type Crumb = {
  title: string
  href?: string
}

interface BreadcrumbsProps {
  items?: Crumb[]
}

export default function Breadcrumbs({ items }: PropsWithChildren<BreadcrumbsProps>) {
  if (!items || items.length === 0) {
    return null
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, idx) => (
          <FragmentWithSeparator key={`${item.title}-${idx}`} showSeparator={idx > 0}>
            <BreadcrumbItem>
              {item.href ? (
                <BreadcrumbLink href={item.href}>{item.title}</BreadcrumbLink>
              ) : (
                <span className="text-muted-foreground">{item.title}</span>
              )}
            </BreadcrumbItem>
          </FragmentWithSeparator>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function FragmentWithSeparator({ children, showSeparator }: PropsWithChildren<{ showSeparator?: boolean }>) {
  return (
    <>
      {showSeparator && <BreadcrumbSeparator> / </BreadcrumbSeparator>}
      {children}
    </>
  )
}
