import { NextResponse } from 'next/server'
import { GoogleAuth } from 'google-auth-library'

async function listAll(folderId: string, token: string, depth = 0): Promise<{ name: string; type: string; depth: number }[]> {
  if (depth > 3) return []
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`)
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType)&pageSize=100`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  if (!res.ok) return []

  const items = data.files ?? []
  const result: { name: string; type: string; depth: number }[] = []
  for (const item of items) {
    const isFolder = item.mimeType === 'application/vnd.google-apps.folder'
    const isDoc = item.mimeType === 'application/vnd.google-apps.document'
    result.push({ name: item.name, type: isFolder ? 'folder' : isDoc ? 'doc' : 'other', depth })
    if (isFolder) {
      const sub = await listAll(item.id, token, depth + 1)
      result.push(...sub)
    }
  }
  return result
}

export async function GET() {
  const jsonKey = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!jsonKey) return NextResponse.json({ error: 'GOOGLE_SERVICE_ACCOUNT_JSON not set' })
  if (!folderId) return NextResponse.json({ error: 'GOOGLE_DRIVE_FOLDER_ID not set' })

  try {
    const credentials = JSON.parse(jsonKey)
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n')
    const auth = new GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive.readonly'] })
    const token = await auth.getAccessToken()
    if (!token) return NextResponse.json({ error: 'Failed to get access token' })

    const items = await listAll(folderId, token as string)
    const docs = items.filter(i => i.type === 'doc')
    return NextResponse.json({ ok: true, total_items: items.length, docs_found: docs.length, tree: items })
  } catch (err) {
    return NextResponse.json({ error: String(err) })
  }
}
