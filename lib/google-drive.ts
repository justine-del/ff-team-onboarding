import { GoogleAuth } from 'google-auth-library'

let cachedContent: string | null = null
let cacheTime = 0
const CACHE_TTL = 1000 * 60 * 30 // 30 minutes

export async function getDriveContext(): Promise<string | null> {
  const jsonKey = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID

  if (!jsonKey || !folderId) {
    console.log('[drive] env vars missing — GOOGLE_SERVICE_ACCOUNT_JSON:', !!jsonKey, 'GOOGLE_DRIVE_FOLDER_ID:', !!folderId)
    return null
  }

  if (cachedContent && Date.now() - cacheTime < CACHE_TTL) {
    console.log('[drive] returning cached content')
    return cachedContent
  }

  try {
    const credentials = JSON.parse(jsonKey)

    const auth = new GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/documents.readonly',
      ],
    })

    const token = await auth.getAccessToken()
    if (!token) {
      console.error('[drive] failed to get access token')
      return null
    }

    // List Google Docs in the folder
    const query = encodeURIComponent(
      `'${folderId}' in parents and mimeType='application/vnd.google-apps.document' and trashed=false`
    )
    const listRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&pageSize=30`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const listData = await listRes.json()

    if (!listRes.ok) {
      console.error('[drive] list error:', JSON.stringify(listData))
      return null
    }

    const files: { id: string; name: string }[] = listData.files ?? []
    console.log(`[drive] found ${files.length} docs:`, files.map(f => f.name))

    if (!files.length) return null

    const contents: string[] = []
    for (const file of files.slice(0, 20)) {
      const docRes = await fetch(
        `https://docs.googleapis.com/v1/documents/${file.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const doc = await docRes.json()

      if (!docRes.ok) {
        console.error(`[drive] failed to fetch doc "${file.name}":`, doc.error?.message)
        continue
      }

      // Extract plain text
      let text = ''
      for (const element of doc.body?.content ?? []) {
        if (element.paragraph) {
          for (const el of element.paragraph.elements ?? []) {
            if (el.textRun?.content) text += el.textRun.content
          }
        }
        if (element.table) {
          for (const row of element.table.tableRows ?? []) {
            for (const cell of row.tableCells ?? []) {
              for (const cellEl of cell.content ?? []) {
                if (cellEl.paragraph) {
                  for (const el of cellEl.paragraph.elements ?? []) {
                    if (el.textRun?.content) text += el.textRun.content + ' '
                  }
                }
              }
            }
          }
        }
      }

      const trimmed = text.trim()
      if (trimmed) {
        contents.push(`## ${file.name}\n\n${trimmed.slice(0, 4000)}`)
        console.log(`[drive] loaded "${file.name}" (${trimmed.length} chars)`)
      }
    }

    cachedContent = contents.join('\n\n---\n\n')
    cacheTime = Date.now()
    return cachedContent || null
  } catch (err) {
    console.error('[drive] unexpected error:', err)
    return null
  }
}
