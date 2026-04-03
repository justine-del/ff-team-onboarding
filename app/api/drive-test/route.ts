import { NextResponse } from 'next/server'
import { GoogleAuth } from 'google-auth-library'

export async function GET() {
  const jsonKey = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID

  if (!jsonKey) return NextResponse.json({ error: 'GOOGLE_SERVICE_ACCOUNT_JSON not set' })
  if (!folderId) return NextResponse.json({ error: 'GOOGLE_DRIVE_FOLDER_ID not set' })

  try {
    const credentials = JSON.parse(jsonKey)
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n')

    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    })

    const token = await auth.getAccessToken()
    if (!token) return NextResponse.json({ error: 'Failed to get access token — check service account credentials' })

    const q = encodeURIComponent(`'${folderId}' in parents and mimeType='application/vnd.google-apps.document' and trashed=false`)
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=30`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()

    if (!res.ok) return NextResponse.json({ error: 'Drive API error', detail: data?.error?.message, status: res.status })

    return NextResponse.json({
      ok: true,
      folder_id: folderId,
      service_account: credentials.client_email,
      docs_found: data.files?.length ?? 0,
      docs: data.files?.map((f: { id: string; name: string }) => f.name) ?? [],
    })
  } catch (err) {
    return NextResponse.json({ error: 'Exception', detail: String(err) })
  }
}
