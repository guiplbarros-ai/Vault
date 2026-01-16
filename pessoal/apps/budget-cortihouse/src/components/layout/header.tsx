'use client'

import { User } from 'lucide-react'

interface HeaderProps {
  title: string
  description?: string
}

export function Header({ title, description }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div>
        <h1 className='font-semibold text-xl'>{title}</h1>
        {description && <p className='text-muted-foreground text-sm'>{description}</p>}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className='flex h-8 w-8 items-center justify-center rounded-full bg-muted'>
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    </header>
  )
}
