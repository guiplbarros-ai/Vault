"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast: 'bg-card text-card-foreground border-border shadow-lg',
          title: 'text-foreground font-medium',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground hover:bg-primary/90',
          cancelButton: 'bg-muted text-muted-foreground hover:bg-muted/90',
          closeButton: 'bg-card border-border hover:bg-muted',
          success: 'bg-card text-foreground border-[#2d9b9b] [&>div>svg]:text-[#2d9b9b]',
          error: 'bg-card text-foreground border-destructive [&>div>svg]:text-destructive',
          warning: 'bg-card text-foreground border-[#e67e22] [&>div>svg]:text-[#e67e22]',
          info: 'bg-card text-foreground border-[#3498db] [&>div>svg]:text-[#3498db]',
        },
      }}
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--card-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
