import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { AuthProvider } from "@/contexts/auth-context";
import { ToastProvider } from "@/components/ui/toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cortex Ledger - Controle Financeiro Inteligente",
  description: "Sistema local-first para controle financeiro pessoal com IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ToastProvider>
          <Providers>
            <AuthProvider>
              {children}
            </AuthProvider>
          </Providers>
        </ToastProvider>
      </body>
    </html>
  );
}
