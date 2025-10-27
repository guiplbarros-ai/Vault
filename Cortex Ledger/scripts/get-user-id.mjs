import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xborrshstfcvzrxyqyor.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhib3Jyc2hzdGZjdnpyeHlxeW9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MTc0NTksImV4cCI6MjA3Njk5MzQ1OX0.Y7R66W0bAQ7KkoO_ozeOnyIfDZeSdNzw9oKr7uVp9T4'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Get current user from session
const { data: { user }, error } = await supabase.auth.getUser()

if (error || !user) {
  console.error('Erro ao buscar usuário. Você precisa estar logado.')
  console.error('Por favor, faça login na aplicação primeiro.')
  process.exit(1)
}

console.log('User ID:', user.id)
console.log('Email:', user.email)
