import { redirect } from 'next/navigation'

export default function RootPage() {
  // A rota raiz sempre redireciona
  // Se não logado, ProtectedRoute no layout do dashboard vai redirecionar para /login
  redirect('/home')
}
