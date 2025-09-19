"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X as XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** Utility: devuelve un nuevo objeto sin keys cuyo valor es undefined */
function removeUndefinedProps<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Partial<T> = {}
  for (const key of Object.keys(obj)) {
    const val = (obj as any)[key]
    if (val !== undefined) {
      ;(out as any)[key] = val
    }
  }
  return out
}

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...removeUndefinedProps(props)} />
}

function DialogTrigger(
  props: React.ComponentProps<typeof DialogPrimitive.Trigger>
) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...removeUndefinedProps(props)} />
}

function DialogPortal(props: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...removeUndefinedProps(props)} />
}

function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...removeUndefinedProps(props)} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...removeUndefinedProps(props)}
    />
  )
}

/**
 * DialogContent personalizado (NO usa DialogPrimitive.Content)
 * - Evita la validación interna de Radix que lanza la warning cuando
 *   'aria-describedby' es undefined.
 * - Provee role="dialog" y aria-modal para accesibilidad.
 */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  title,
  description,
  ...props
}: {
  className?: string
  children?: React.ReactNode
  showCloseButton?: boolean
  title?: string
  description?: string
} & Record<string, any>) {
  // id para title (si se usa)
  const titleId = React.useId()

  // limpiamos props para no propagar undefined
  const safeProps = removeUndefinedProps(props)

  return (
    <DialogPortal>
      <DialogOverlay />

      {/* Contenedor simple del diálogo: no usamos DialogPrimitive.Content */}
      <div
        data-slot="dialog-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cn(
          "bg-background fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
          className
        )}
        {...(safeProps as any)}
      >
        {title && (
          <h2 id={titleId} className="text-lg leading-none font-semibold">
            {title}
          </h2>
        )}

        {description && (
          <div className="text-muted-foreground text-sm">{description}</div>
        )}

        <div>{children}</div>

        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
            aria-label="Cerrar diálogo"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </div>
    </DialogPortal>
  )
}

/* Los helpers de header/footer/title/description los dejo simples por compatibilidad */
function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...removeUndefinedProps(props as any)}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...removeUndefinedProps(props as any)}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <div
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...removeUndefinedProps(props as any)}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <div
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...removeUndefinedProps(props as any)}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
