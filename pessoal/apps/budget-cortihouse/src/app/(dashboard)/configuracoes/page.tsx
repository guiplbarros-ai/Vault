import { Header } from '@/components/layout/header'
import { SettingsForm } from './settings-form'
import { fetchCompanyInfo, fetchSettings } from './actions'

export default async function SettingsPage() {
  const [companyResult, settingsResult] = await Promise.all([
    fetchCompanyInfo(),
    fetchSettings(),
  ])

  return (
    <>
      <Header title="Configurações" description="Configure os dados da empresa" />

      <div className="p-6">
        <SettingsForm company={companyResult.data} settings={settingsResult.data} />
      </div>
    </>
  )
}
