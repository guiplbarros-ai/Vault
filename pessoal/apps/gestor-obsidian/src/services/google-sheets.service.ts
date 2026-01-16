import { loadEnv } from '../utils/env.js'
import { logger } from '../utils/logger.js'
import { getGoogleAuthService } from './google-auth.service.js'

loadEnv()

const SHEETS_API_URL = 'https://sheets.googleapis.com/v4'

export type GoogleSheetsValuesResponse = {
  range: string
  majorDimension?: 'ROWS' | 'COLUMNS'
  values?: Array<Array<string>>
}

class GoogleSheetsService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const authService = getGoogleAuthService()
    const accessToken = await authService.getValidAccessToken()

    const url = `${SHEETS_API_URL}${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Google Sheets API error: ${response.status} - ${error}`)
    }

    const text = await response.text()
    return text ? (JSON.parse(text) as T) : (null as T)
  }

  async getValues(spreadsheetId: string, rangeA1: string): Promise<GoogleSheetsValuesResponse> {
    const params = new URLSearchParams({
      majorDimension: 'ROWS',
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING',
    })

    const res = await this.request<GoogleSheetsValuesResponse>(
      `/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(rangeA1)}?${params.toString()}`
    )

    logger.info(
      `Sheets: values carregados (${spreadsheetId} / ${rangeA1}) -> ${res.values?.length ?? 0} linhas`
    )
    return res
  }
}

let sheetsInstance: GoogleSheetsService | null = null

export function getGoogleSheetsService(): GoogleSheetsService {
  if (!sheetsInstance) sheetsInstance = new GoogleSheetsService()
  return sheetsInstance
}

export { GoogleSheetsService }
