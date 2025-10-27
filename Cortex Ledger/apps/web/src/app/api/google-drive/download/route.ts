import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

// NOTA: Para produção, configure as credenciais do Google OAuth2

export async function POST(request: NextRequest) {
  try {
    const { fileId } = await request.json()

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID é obrigatório' },
        { status: 400 }
      )
    }

    // TODO: Implementar autenticação OAuth2 do Google Drive
    // const auth = new google.auth.GoogleAuth({
    //   keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
    //   scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    // })

    // const drive = google.drive({ version: 'v3', auth })

    // const response = await drive.files.get(
    //   { fileId, alt: 'media' },
    //   { responseType: 'arraybuffer' }
    // )

    // const buffer = Buffer.from(response.data as ArrayBuffer)

    console.log('📥 Baixando arquivo:', fileId)

    // POR ENQUANTO: Retornar arquivo CSV simulado
    const mockCSV = `Data,Descricao,Valor
2025-10-01,Supermercado,-150.00
2025-10-05,Salário,5000.00
2025-10-10,Conta de luz,-120.00`

    const buffer = Buffer.from(mockCSV, 'utf-8')

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="arquivo-${fileId}.csv"`,
      },
    })

  } catch (error: any) {
    console.error('Error downloading file from Google Drive:', error)
    return NextResponse.json(
      {
        error: 'Erro ao baixar arquivo do Google Drive',
        details: error.message,
        note: 'Configure as credenciais do Google Cloud para usar esta funcionalidade'
      },
      { status: 500 }
    )
  }
}
