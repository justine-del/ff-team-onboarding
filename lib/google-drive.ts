import { GoogleAuth } from 'google-auth-library'

let cachedContent: string | null = null
let cacheTime = 0
const CACHE_TTL = 1000 * 60 * 30

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
    // Fix: Vercel stores \n as literal \\n in private keys
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n')

    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    })

    const token = await auth.getAccessToken()
    if (!token) { console.error('[drive] no token'); return null }

    // List Google Docs in folder
    const q = encodeURIComponent(`'${folderId}' in parents and mimeType='application/vnd.google-apps.document' and trashed=false`)
    const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=30`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const listData = await listRes.json()

    if (!listRes.ok) {
      console.error('[drive] list error:', listData?.error?.message)
      return null
    }

    const files: { id: string; name: string }[] = listData.files ?? []
    console.log(`[drive] found ${files.length} docs`)

    if (!files.length) return null

    const parts: string[] = []
    for (const file of files.slice(0, 20)) {
      // Use Drive export (plain text) — only needs Drive API, not Docs API
      const exportRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!exportRes.ok) {
        console.error(`[drive] export failed for "${file.name}": ${exportRes.status}`)
        continue
      }
      const text = (await exportRes.text()).trim()
      if (text) {
        parts.push(`## ${file.name}\n\n${text.slice(0, 4000)}`)
        console.log(`[drive] loaded "${file.name}" (${text.length} chars)`)
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
