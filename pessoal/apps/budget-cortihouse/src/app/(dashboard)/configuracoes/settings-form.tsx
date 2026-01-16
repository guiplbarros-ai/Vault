'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Save, Loader2 } from 'lucide-react'
import { updateCompanyInfo, updateSettings } from './actions'
import type { Company, Settings } from '@/lib/db/schema'

interface SettingsFormProps {
  company: Company | null
  settings: Settings | null
}

export function SettingsForm({ company, settings }: SettingsFormProps) {
  const [isPendingCompany, startTransitionCompany] = useTransition()
  const [isPendingSettings, startTransitionSettings] = useTransition()

  // Company form state
  const [companyForm, setCompanyForm] = useState({
    name: company?.name || '',
    tradeName: company?.tradeName || '',
    cnpj: company?.cnpj || '',
    ie: company?.ie || '',
    address: company?.address || '',
    phone: company?.phone || '',
    phone2: company?.phone2 || '',
    email: company?.email || '',
    website: company?.website || '',
  })

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    defaultValidityDays: settings?.defaultValidityDays ?? 15,
    defaultDeliveryDays: settings?.defaultDeliveryDays ?? 15,
    defaultDiscountCash: Number(settings?.defaultDiscountCash ?? 3),
    hospitalCurvePrice: Number(settings?.hospitalCurvePrice ?? 30),
  })

  function handleSaveCompany() {
    if (!companyForm.name) {
      toast.error('Nome da empresa é obrigatório')
      return
    }

    startTransitionCompany(async () => {
      const result = await updateCompanyInfo({
        name: companyForm.name,
        tradeName: companyForm.tradeName || null,
        cnpj: companyForm.cnpj || null,
        ie: companyForm.ie || null,
        address: companyForm.address || null,
        phone: companyForm.phone || null,
        phone2: companyForm.phone2 || null,
        email: companyForm.email || null,
        website: companyForm.website || null,
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Dados da empresa atualizados!')
      }
    })
  }

  function handleSaveSettings() {
    startTransitionSettings(async () => {
      const result = await updateSettings({
        defaultValidityDays: settingsForm.defaultValidityDays,
        defaultDeliveryDays: settingsForm.defaultDeliveryDays,
        defaultDiscountCash: settingsForm.defaultDiscountCash,
        hospitalCurvePrice: settingsForm.hospitalCurvePrice,
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Configurações atualizadas!')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle>Dados da Empresa</CardTitle>
          <CardDescription>Informações que aparecem nos orçamentos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Razão Social *</Label>
              <Input
                id="companyName"
                value={companyForm.name}
                onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tradeName">Nome Fantasia</Label>
              <Input
                id="tradeName"
                value={companyForm.tradeName}
                onChange={(e) => setCompanyForm({ ...companyForm, tradeName: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={companyForm.cnpj}
                onChange={(e) => setCompanyForm({ ...companyForm, cnpj: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ie">Inscrição Estadual</Label>
              <Input
                id="ie"
                value={companyForm.ie}
                onChange={(e) => setCompanyForm({ ...companyForm, ie: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              value={companyForm.address}
              onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={companyForm.phone}
                onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone2">Celular</Label>
              <Input
                id="phone2"
                value={companyForm.phone2}
                onChange={(e) => setCompanyForm({ ...companyForm, phone2: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={companyForm.email}
                onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={companyForm.website}
                onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
              />
            </div>
          </div>

          <Button onClick={handleSaveCompany} disabled={isPendingCompany}>
            {isPendingCompany ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Default Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações Padrão</CardTitle>
          <CardDescription>Valores padrão para novos orçamentos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="validityDays">Validade (dias)</Label>
              <Input
                id="validityDays"
                type="number"
                min="1"
                value={settingsForm.defaultValidityDays}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    defaultValidityDays: Number.parseInt(e.target.value, 10) || 15,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliveryDays">Prazo de Entrega (dias úteis)</Label>
              <Input
                id="deliveryDays"
                type="number"
                min="1"
                value={settingsForm.defaultDeliveryDays}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    defaultDeliveryDays: Number.parseInt(e.target.value, 10) || 15,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cashDiscount">Desconto à Vista (%)</Label>
              <Input
                id="cashDiscount"
                type="number"
                step="0.1"
                min="0"
                value={settingsForm.defaultDiscountCash}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    defaultDiscountCash: Number.parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="curvePrice">Preço da Curva (R$)</Label>
              <Input
                id="curvePrice"
                type="number"
                step="0.01"
                min="0"
                value={settingsForm.hospitalCurvePrice}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    hospitalCurvePrice: Number.parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          <Button onClick={handleSaveSettings} disabled={isPendingSettings}>
            {isPendingSettings ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Configurações
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
