"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, getDefaultClassNames } from "react-day-picker"
import { cn } from "@/lib/utils"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: "flex flex-col gap-4 sm:flex-row",
        month: "space-y-4",
        month_caption: "relative flex h-12 items-start justify-center pt-2",
        caption_label: "pointer-events-none text-[18px] font-semibold text-foreground",
        nav: "pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-2 pt-1",
        button_previous:
          "pointer-events-auto inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-input bg-secondary text-foreground transition-colors hover:bg-accent hover:text-[#c94b1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        button_next:
          "pointer-events-auto inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-input bg-secondary text-foreground transition-colors hover:bg-accent hover:text-[#c94b1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "mb-2 flex",
        weekday: "w-9 text-center text-[12px] font-medium text-muted-foreground",
        week: "mt-1 flex w-full",
        day: "size-9 p-0 text-center text-sm",
        day_button:
          "size-9 rounded-md border border-transparent text-sm font-medium text-foreground transition-colors hover:border-border hover:bg-accent hover:text-[#c94b1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        today: "text-[#221a13]",
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        outside: "text-muted-foreground/55",
        disabled: "text-muted-foreground/45 opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className, ...chevronProps }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("size-4", className)} {...chevronProps} />
          ) : (
            <ChevronRight className={cn("size-4", className)} {...chevronProps} />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
