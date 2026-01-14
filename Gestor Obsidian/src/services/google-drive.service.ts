import { getGoogleAuthService } from './google-auth.service.js';

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';

export type DriveFile = {
  id: string;
  name: string;
  mimeType?: string;
  parents?: string[];
  trashed?: boolean;
  webViewLink?: string;
  webContentLink?: string;
};

export type DriveListResult = {
  files: DriveFile[];
  nextPageToken?: string;
};

type DriveListOptions = {
  q?: string;
  pageSize?: number;
  pageToken?: string;
  orderBy?: string;
  fields?: string;
  includeItemsFromAllDrives?: boolean;
  supportsAllDrives?: boolean;
};

class GoogleDriveService {
  constructor(
    private workspaceId?: string,
    private accountEmail?: string | null,
    private forcedAccessToken?: string
  ) {}

  private async resolveAccessToken(): Promise<string> {
    if (this.forcedAccessToken) return this.forcedAccessToken;
    const auth = getGoogleAuthService(this.workspaceId, this.accountEmail || null);
    return await auth.getValidAccessToken();
  }

  private async requestJson<T>(
    endpoint: string,
    options: RequestInit = {},
    query?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const accessToken = await this.resolveAccessToken();
    const qs = new URLSearchParams();
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined) continue;
        qs.set(k, String(v));
      }
    }
    const url = `${DRIVE_API_URL}${endpoint}${qs.toString() ? `?${qs.toString()}` : ''}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Drive API error: ${response.status} - ${error}`);
    }

    const text = await response.text();
    return text ? (JSON.parse(text) as T) : (null as T);
  }

  private async requestText(
    endpoint: string,
    query?: Record<string, string | number | boolean | undefined>
  ): Promise<string> {
    const accessToken = await this.resolveAccessToken();
    const qs = new URLSearchParams();
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined) continue;
        qs.set(k, String(v));
      }
    }
    const url = `${DRIVE_API_URL}${endpoint}${qs.toString() ? `?${qs.toString()}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Drive API error: ${response.status} - ${error}`);
    }

    return await response.text();
  }

  async listFiles(opts: DriveListOptions = {}): Promise<DriveListResult> {
    const {
      q,
      pageSize = 50,
      pageToken,
      orderBy,
      fields = 'nextPageToken,files(id,name,mimeType,parents,trashed,webViewLink,webContentLink)',
      includeItemsFromAllDrives = true,
      supportsAllDrives = true,
    } = opts;

    return await this.requestJson<DriveListResult>('/files', {}, {
      q,
      pageSize,
      pageToken,
      orderBy,
      fields,
      includeItemsFromAllDrives,
      supportsAllDrives,
    });
  }

  async getFile(fileId: string, fields = 'id,name,mimeType,parents,trashed,webViewLink,webContentLink'): Promise<DriveFile> {
    return await this.requestJson<DriveFile>(`/files/${encodeURIComponent(fileId)}`, {}, {
      fields,
      supportsAllDrives: true,
    });
  }

  async createFolder(input: { name: string; parentId?: string | null }): Promise<DriveFile> {
    const body = {
      name: input.name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: input.parentId ? [input.parentId] : undefined,
    };
    return await this.requestJson<DriveFile>('/files', {
      method: 'POST',
      body: JSON.stringify(body),
    }, { supportsAllDrives: true });
  }

  async rename(fileId: string, newName: string): Promise<DriveFile> {
    return await this.requestJson<DriveFile>(`/files/${encodeURIComponent(fileId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: newName }),
    }, { supportsAllDrives: true });
  }

  /**
   * Move um arquivo/pasta entre pastas.
   * Você precisa informar addParents e (opcionalmente) removeParents.
   */
  async move(fileId: string, input: { addParents: string; removeParents?: string }): Promise<DriveFile> {
    return await this.requestJson<DriveFile>(`/files/${encodeURIComponent(fileId)}`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    }, {
      addParents: input.addParents,
      removeParents: input.removeParents,
      fields: 'id,name,mimeType,parents,trashed,webViewLink',
      supportsAllDrives: true,
    });
  }

  /**
   * Exporta um Google Doc/Sheet/Slide para texto.
   * Para Docs funciona bem com text/plain. Para Sheets/Slides pode ser limitado.
   */
  async exportAsText(fileId: string): Promise<string> {
    return await this.requestText(`/files/${encodeURIComponent(fileId)}/export`, {
      mimeType: 'text/plain',
      supportsAllDrives: true,
    });
  }

  /**
   * Lista filhos diretos de uma pasta (não-recursivo).
   */
  async listChildren(folderId: string, pageSize = 200, pageToken?: string): Promise<DriveListResult> {
    const q = `'${folderId.replace(/'/g, "\\'")}' in parents and trashed=false`;
    return await this.listFiles({ q, pageSize, pageToken });
  }

  /**
   * Seta "trashed=true" para uma PASTA específica.
   * Segurança: o chamador deve garantir que é pasta e que está vazia.
   */
  async trashFolder(folderId: string): Promise<DriveFile> {
    return await this.requestJson<DriveFile>(`/files/${encodeURIComponent(folderId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ trashed: true }),
    }, { supportsAllDrives: true });
  }
}

export function getGoogleDriveService(
  workspaceId?: string,
  accountEmail?: string | null,
  forcedAccessToken?: string
): GoogleDriveService {
  return new GoogleDriveService(workspaceId, accountEmail || null, forcedAccessToken);
}

export { GoogleDriveService };

