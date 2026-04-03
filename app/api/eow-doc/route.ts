import { NextRequest, NextResponse } from 'next/server'
import { GoogleAuth } from 'google-auth-library'

function reportToHtml(reportText: string, memberName: string, weekOf: string): string {
  const lines = reportText.split('\n')
  let html = `
    <html><head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 820px; margin: 40px auto; color: #111; line-height: 1.6;">
  `
  let inList = false
  let inTable = false
  let tableRowCount = 0

  const closeList = () => { if (inList) { html += '</ul>'; inList = false } }
  const closeTable = () => { if (inTable) { html += '</tbody></table>'; inTable = false; tableRowCount = 0 } }

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      closeList(); closeTable()
      html += '<br>'
      continue
    }

    // Markdown table row: | col | col | ...
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      // Skip separator rows like |---|---|
      if (/^\|[\s\-|]+\|$/.test(trimmed)) continue
      closeList()
      const cells = trimmed.slice(1, -1).split('|').map(c => c.trim())
      if (!inTable) {
        html += `<table style="border-collapse:collapse; width:100%; margin: 12px 0;">
          <thead><tr style="background:#1a1a2e; color:#fff;">`
        cells.forEach(c => { html += `<th style="padding:8px 12px; text-align:left; font-size:13px;">${c}</th>` })
        html += `</tr></thead><tbody>`
        inTable = true
        tableRowCount = 0
      } else {
        const bg = tableRowCount % 2 === 0 ? '#f9f9f9' : '#ffffff'
        html += `<tr style="background:${bg};">`
        cells.forEach(c => { html += `<td style="padding:7px 12px; border-bottom:1px solid #e0e0e0; font-size:13px;">${c}</td>` })
        html += `</tr>`
        tableRowCount++
      }
      continue
    }

    closeTable()

    // Standalone **text** = header
    const headerMatch = trimmed.match(/^\*\*(.*?)\*\*$/)
    if (headerMatch) {
      closeList()
      const text = headerMatch[1]
      if (text.toLowerCase().includes('eow performance report')) {
        html += `<h1 style="font-size:22px; color:#1a1a2e; border-bottom:3px solid #1a1a2e; padding-bottom:8px; margin-bottom:20px;">${text}</h1>`
      } else {
        html += `<h2 style="font-size:15px; color:#1a1a2e; margin-top:28px; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;">${text}</h2>`
      }
      continue
    }

    // List items
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      if (!inList) { html += '<ul style="margin:6px 0; padding-left:22px;">'; inList = true }
      const content = trimmed.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      html += `<li style="margin:4px 0; font-size:13px;">${content}</li>`
      continue
    }

    // Indented list items (for nested)
    if (trimmed.startsWith('  - ') || line.startsWith('  - ')) {
      if (!inList) { html += '<ul style="margin:4px 0; padding-left:22px;">'; inList = true }
      const content = trimmed.replace(/^\s*-\s*/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      html += `<li style="margin:3px 0; font-size:13px; color:#444;">${content}</li>`
      continue
    }

    closeList()
    const content = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    html += `<p style="margin:5px 0; font-size:13px;">${content}</p>`
  }

  closeList(); closeTable()
  html += `
    <br><hr style="border:none; border-top:1px solid #ddd; margin-top:32px;">
    <p style="font-size:11px; color:#aaa;">Generated via Cyborg VA Portal · ${memberName} · ${weekOf}</p>
    </body></html>
  `
  return html
}

async function getToken(): Promise<string | null> {
  const jsonKey = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!jsonKey) return null
  try {
    const credentials = JSON.parse(jsonKey)
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n')
    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    })
    return (await auth.getAccessToken()) ?? null
  } catch {
    return null
  }
}

async function purgeAllOwnedFiles(token: string) {
  try {
    // List ALL files owned by the service account
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("'me' in owners and trashed=false")}&fields=files(id)&pageSize=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await res.json()
    await Promise.all((data.files ?? []).map((f: { id: string }) =>
      fetch(`https://www.googleapis.com/drive/v3/files/${f.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    ))
  } catch {
    // non-fatal
  }
}

export async function POST(req: NextRequest) {
  try {
    const { reportText, memberName, weekOf } = await req.json()

    const token = await getToken()
    if (!token) {
      return NextResponse.json({ error: 'Google Drive not configured' }, { status: 500 })
    }

    const html = reportToHtml(reportText, memberName, weekOf)
    const fileName = `EOW Report — ${memberName} — ${weekOf}`
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID

    // Purge all files owned by service account to free storage quota
    await purgeAllOwnedFiles(token)

    const boundary = `boundary_${Date.now()}`
    const metadata = JSON.stringify({
      name: fileName,
      mimeType: 'application/vnd.google-apps.document',
      ...(folderId ? { parents: [folderId] } : {}),
    })

    const body = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      metadata,
      `--${boundary}`,
      'Content-Type: text/html',
      '',
      html,
      `--${boundary}--`,
    ].join('\r\n')

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    )

    const uploadData = await uploadRes.json()
    if (!uploadRes.ok) {
      console.error('[eow-doc] upload error:', uploadData)
      return NextResponse.json({ error: uploadData.error?.message ?? 'Upload failed' }, { status: 500 })
    }

    const fileId = uploadData.id

    // Make it accessible to anyone with the link
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'writer', type: 'anyone' }),
    })

    const docUrl = `https://docs.google.com/document/d/${fileId}/edit`
    return NextResponse.json({ docUrl, fileName })
  } catch (err) {
    console.error('[eow-doc] error:', err)
    return NextResponse.json({ error: 'Failed to create Google Doc' }, { status: 500 })
  }
}
