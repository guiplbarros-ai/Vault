import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono, Press_Start_2P } from "next/font/google"
import "./globals.css"
import { DBProvider } from "./providers/db-provider"
import { SettingsProvider } from "./providers/settings-provider"
import { ThemeInitializer } from "@/components/theme-initializer"

const inter = Inter({ subsets: ["latin"] })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"] })
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
      <body className={`${inter.className} ${pressStart2P.variable}`}>
        <SettingsProvider>
          <ThemeInitializer />
          <DBProvider>
            {children}
          </DBProvider>
        </SettingsProvider>
      </body>
    </html>
  )
}
