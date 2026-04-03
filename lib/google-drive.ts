import { GoogleAuth } from 'google-auth-library'

let cachedContent: string | null = null
let cacheTime = 0
const CACHE_TTL = 1000 * 60 * 30

async function getAllDocs(
  folderId: string,
  token: string,
  depth = 0
): Promise<{ id: string; name: string; path: string }[]> {
  if (depth > 3) return [] // max 3 levels deep

  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`)
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType)&pageSize=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const data = await res.json()
  if (!res.ok) {
    console.error('[drive] list error:', data?.error?.message)
    return []
  }

  const items: { id: string; name: string; mimeType: string }[] = data.files ?? []
  const docs: { id: string; name: string; path: string }[] = []

  for (const item of items) {
    if (item.mimeType === 'application/vnd.google-apps.folder') {
      // Recurse into subfolder
      const subDocs = await getAllDocs(item.id, token, depth + 1)
      docs.push(...subDocs.map(d => ({ ...d, path: `${item.name} / ${d.path}` })))
    } else if (item.mimeType === 'application/vnd.google-apps.document') {
      docs.push({ id: item.id, name: item.name, path: item.name })
    }
  }

  return docs
}

export async function getDriveContext(): Promise<string | null> {
  const jsonKey = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID

  if (!jsonKey || !folderId) {
    console.log('[drive] missing env vars')
    return null
  }

  if (cachedContent && Date.now() - cacheTime < CACHE_TTL) return cachedContent

  try {
    const credentials = JSON.parse(jsonKey)
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n')

    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    })

    const token = await auth.getAccessToken()
    if (!token) { console.error('[drive] no token'); return null }

    const allDocs = await getAllDocs(folderId, token as string)
    console.log(`[drive] found ${allDocs.length} total docs across all subfolders`)

    if (!allDocs.length) return null

    const parts: string[] = []
    for (const doc of allDocs.slice(0, 40)) {
      const exportRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${doc.id}/export?mimeType=text/plain`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!exportRes.ok) {
        console.error(`[drive] export failed "${doc.name}": ${exportRes.status}`)
        continue
      }
      const text = (await exportRes.text()).trim()
      if (text) {
        parts.push(`## ${doc.path}\n\n${text.slice(0, 4000)}`)
        console.log(`[drive] loaded "${doc.name}" (${text.length} chars)`)
      }
    }

    cachedContent = parts.join('\n\n---\n\n') || null
    cacheTime = Date.now()
    return cachedContent
  } catch (err) {
    console.error('[drive] error:', err)
    return null
  }
}
