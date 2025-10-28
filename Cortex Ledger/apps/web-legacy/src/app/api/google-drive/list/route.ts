import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

// NOTA: Para produção, configure as credenciais do Google OAuth2
// Por enquanto, vamos simular a resposta para desenvolvimento

export async function POST(request: NextRequest) {
  try {
    const { folderId } = await request.json()

    if (!folderId) {
      return NextResponse.json(
        { error: 'Folder ID é obrigatório' },
        { status: 400 }
      )
    }

    // TODO: Implementar autenticação OAuth2 do Google Drive
    // const auth = new google.auth.GoogleAuth({
    //   keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
    //   scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    // })

    // const drive = google.drive({ version: 'v3', auth })

    // const response = await drive.files.list({
    //   q: `'${folderId}' in parents and trashed=false`,
    //   fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink)',
    //   orderBy: 'modifiedTime desc',
    // })

    // POR ENQUANTO: Retornar dados simulados para desenvolvimento
    // O usuário precisará configurar as credenciais do Google Cloud

    console.log('🔍 Listando arquivos da pasta:', folderId)

    // Dados simulados
    const mockFiles = [
      {
        id: 'file-1',
        name: 'extrato-bradesco-outubro.csv',
        mimeType: 'text/csv',
        size: 15420,
        modifiedTime: new Date().toISOString(),
        webViewLink: `https://drive.google.com/file/file-1/view`,
      },
      {
        id: 'file-2',
        name: 'fatura-nubank-setembro.csv',
        mimeType: 'text/csv',
        size: 8920,
        modifiedTime: new Date(Date.now() - 86400000).toISOString(),
        webViewLink: `https://drive.google.com/file/file-2/view`,
      },
    ]

    return NextResponse.json({
      files: mockFiles,
      message: 'Modo de desenvolvimento: retornando dados simulados',
    })

    // IMPORTANTE: Descomentar abaixo para usar a API real do Google Drive
    // return NextResponse.json({ files: response.data.files || [] })

  } catch (error: any) {
    console.error('Error listing Google Drive files:', error)
    return NextResponse.json(
      {
        error: 'Erro ao listar arquivos do Google Drive',
        details: error.message,
        note: 'Configure as credenciais do Google Cloud para usar esta funcionalidade'
      },
      { status: 500 }
    )
  }
}
