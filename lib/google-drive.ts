/**
 * Google Drive integration for the VA Assistant chatbot.
 *
 * SETUP STEPS:
 * 1. Go to https://console.cloud.google.com
 * 2. Create a new project (e.g. "Cyborg VA Portal")
 * 3. Enable APIs: "Google Drive API" and "Google Docs API"
 * 4. Go to IAM & Admin → Service Accounts → Create Service Account
 * 5. Name it (e.g. "cyborg-va-assistant"), click Done
 * 6. Click the service account → Keys tab → Add Key → JSON
 * 7. Download the JSON file — that's your GOOGLE_SERVICE_ACCOUNT_JSON
 * 8. The service account email looks like: name@project-id.iam.gserviceaccount.com
 * 9. Share your Google Drive folder with that email (Viewer access)
 * 10. Copy the folder ID from the Drive URL and add as GOOGLE_DRIVE_FOLDER_ID
 * 11. Add both to Vercel environment variables
 *
 * VERCEL ENV VARS NEEDED:
 *   GOOGLE_SERVICE_ACCOUNT_JSON  — the full JSON key content (paste the whole JSON)
 *   GOOGLE_DRIVE_FOLDER_ID       — the folder ID from the Drive URL
 */

type ServiceAccountCredentials = {
  client_email: string
  private_key: string
}

type DriveFile = {
  id: string
  name: string
  mimeType: string
}

async function getAccessToken(creds: ServiceAccountCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url')

  const signingInput = `${encode(header)}.${encode(payload)}`

  // Use Web Crypto API (available in Next.js Edge/Node environments)
  const privateKeyPem = creds.private_key.replace(/\\n/g, '\n')
  const keyData = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '')

  const binaryKey = Buffer.from(keyData, 'base64')
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    Buffer.from(signingInput)
  )

  const jwt = `${signingInput}.${Buffer.from(signature).toString('base64url')}`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  const tokenData = await tokenRes.json()
  return tokenData.access_token
}

async function listGoogleDocs(folderId: string, token: string): Promise<DriveFile[]> {
  const query = encodeURIComponent(`'${folderId}' in parents and mimeType='application/vnd.google-apps.document' and trashed=false`)
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType)&pageSize=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const data = await res.json()
  return data.files ?? []
}

async function fetchDocContent(fileId: string, token: string): Promise<string> {
  const res = await fetch(
    `https://docs.googleapis.com/v1/documents/${fileId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const doc = await res.json()

  // Extract plain text from document body
  let text = ''
  const content = doc.body?.content ?? []
  for (const element of content) {
    if (element.paragraph) {
      for (const el of element.paragraph.elements ?? []) {
        if (el.textRun?.content) text += el.textRun.content
      }
    }
  }
  return text.trim()
}

let cachedContent: string | null = null
let cacheTime = 0
const CACHE_TTL = 1000 * 60 * 30 // 30 minutes

export async function getDriveContext(): Promise<string | null> {
  const jsonKey = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID

  if (!jsonKey || !folderId) return null

  // Return cached content if fresh
  if (cachedContent && Date.now() - cacheTime < CACHE_TTL) return cachedContent

  try {
    const creds: ServiceAccountCredentials = JSON.parse(jsonKey)
    const token = await getAccessToken(creds)
    const files = await listGoogleDocs(folderId, token)

    const contents: string[] = []
    for (const file of files.slice(0, 20)) { // max 20 docs
      const text = await fetchDocContent(file.id, token)
      if (text) contents.push(`## ${file.name}\n\n${text.slice(0, 3000)}`) // cap per doc
    }

    cachedContent = contents.join('\n\n---\n\n')
    cacheTime = Date.now()
    return cachedContent
  } catch (err) {
    console.error('Google Drive fetch error:', err)
    return null
  }
}
