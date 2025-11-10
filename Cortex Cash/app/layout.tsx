import type React from "react"
import type { Metadata } from "next"
import { Inter, Press_Start_2P } from "next/font/google"
import "./globals.css"
import { DBProvider } from "./providers/db-provider"
import { SettingsProvider } from "./providers/settings-provider"
import { AuthProvider } from "./providers/auth-provider"
import { ThemeInitializer } from "@/components/theme-initializer"
import { OnboardingCheck } from "@/components/onboarding-check"
import { ServiceWorkerUpdatePrompt } from "@/components/service-worker-update-prompt"

const inter = Inter({ subsets: ["latin"] })
const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ["latin"],
  variable: '--font-pixel'
})

export const metadata: Metadata = {
  title: "Cortex Cash - Gestão de Finanças Pessoais",
  description: "Aplicativo de finanças pessoais local-first com classificação inteligente e orçamentos",
  generator: 'v0.app',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Cortex Cash',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0A1915',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.className} ${pressStart2P.variable} text-foreground`}>
        <SettingsProvider>
          <ThemeInitializer />
          <DBProvider>
            <AuthProvider>
              <OnboardingCheck>
                {children}
              </OnboardingCheck>
              <ServiceWorkerUpdatePrompt />
            </AuthProvider>
          </DBProvider>
        </SettingsProvider>
      </body>
    </html>
  )
}
