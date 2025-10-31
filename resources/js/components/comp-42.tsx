import { CalendarIcon } from 'lucide-react'
import { Button, DateRangePicker, Dialog, Group, Label, Popover } from 'react-aria-components'
import type { DateValue } from '@internationalized/date'
import { getLocalTimeZone, parseDate } from '@internationalized/date'
import { format as formatDate } from 'date-fns'

import { cn } from '@/lib/utils'
import { RangeCalendar } from '@/components/ui/calendar-rac'
import { DateInput, dateInputStyle } from '@/components/ui/datefield-rac'

export type JsDateRange = { from?: Date; to?: Date }

function toDateValue(d?: Date) {
  if (!d) return undefined
  // Use a date-only value (no time) for the calendar
  return parseDate(formatDate(d, 'yyyy-MM-dd'))
}

function toJsDate(v?: DateValue | null): Date | undefined {
  if (!v) return undefined
  return (v as DateValue).toDate(getLocalTimeZone())
}

export default function Component({
  label = 'Période',
  value,
  onChange,
  className,
}: {
  label?: string
  value?: JsDateRange
  onChange?: (range: JsDateRange | undefined) => void
  className?: string
}) {
    // Map JS Dates to React Aria DateValue range when controlled
  const start = toDateValue(value?.from)
  const end = toDateValue(value?.to)
  const racValue = start || end ? { start, end } : undefined

  return (
    <DateRangePicker
      className={cn('*:not-first:mt-2', className)}
      locale="fr-FR"
      value={racValue as { start?: DateValue; end?: DateValue } | undefined}
      onChange={(range: { start?: DateValue | null; end?: DateValue | null } | null) => {
        if (!onChange) return
        if (!range) {
          onChange(undefined)
          return
        }
        onChange({ from: toJsDate(range.start ?? undefined), to: toJsDate(range.end ?? undefined) })
      }}
    >
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <div className="flex">
        <Group className={cn(dateInputStyle, 'pe-9')}>
          <DateInput slot="start" unstyled />
          <span aria-hidden="true" className="px-2 text-muted-foreground/70">
            -
          </span>
          <DateInput slot="end" unstyled />
        </Group>
        <Button className="z-10 -ms-9 -me-px flex w-9 items-center justify-center rounded-e-md text-muted-foreground/80 transition-[color,box-shadow] outline-none hover:text-foreground data-focus-visible:border-ring data-focus-visible:ring-[3px] data-focus-visible:ring-ring/50">
          <CalendarIcon size={16} />
        </Button>
      </div>
      <Popover
        className="z-50 rounded-md border bg-background text-popover-foreground shadow-lg outline-hidden data-entering:animate-in data-exiting:animate-out data-[entering]:fade-in-0 data-[entering]:zoom-in-95 data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95 data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2"
        offset={4}
      >
        <Dialog className="max-h-[inherit] overflow-auto p-2">
          <RangeCalendar locale="fr-FR" />
        </Dialog>
      </Popover>
    </DateRangePicker>
  )
}
