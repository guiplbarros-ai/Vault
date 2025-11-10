'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getDB } from '@/lib/db/client'
import type { Instituicao } from '@/lib/types'

export default function CheckInstitutionsPage() {
  const [institutions, setInstitutions] = useState<Instituicao[]>([])

  useEffect(() => {
    loadInstitutions()
  }, [])

  const loadInstitutions = async () => {
    const db = getDB()
    const data = await db.instituicoes.toArray()
    setInstitutions(data)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Debug - Instituições no Banco</h1>

      <Card>
        <CardHeader>
          <CardTitle>Total: {institutions.length} instituições</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {institutions.map((inst) => (
              <div key={inst.id} className="border p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold">Nome:</p>
                    <p>{inst.nome}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Código:</p>
                    <p>{inst.codigo}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Logo URL:</p>
                    <p className="font-mono text-xs break-all">{inst.logo_url}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Preview:</p>
                    <img
                      src={inst.logo_url}
                      alt={inst.nome}
                      className="w-12 h-12 object-contain bg-white rounded"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><text x="24" y="24" text-anchor="middle" fill="red">X</text></svg>'
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
