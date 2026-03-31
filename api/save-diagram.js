// Vercel serverless function: saves the Architecture Diagram back to GitHub
// Requires GITHUB_TOKEN env var set in Vercel project settings (repo write access)

const OWNER = 'ignizia-code'
const REPO = 'mcp-excalidraw'
// Path within the repo — must match exactly (spaces are encoded for the API)
const FILE_PATH = 'Working projects/Architecture Diagram.excalidraw'

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = process.env.GITHUB_TOKEN
  if (!token) {
    return res.status(500).json({ error: 'GITHUB_TOKEN not configured on the server' })
  }

  const { content } = req.body
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Missing content in request body' })
  }

  const apiBase = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH.split('/').map(encodeURIComponent).join('/')}`
  const headers = {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'mcp-excalidraw-vercel'
  }

  // Step 1: get current file SHA (required for update)
  const getRes = await fetch(apiBase, { headers })
  if (!getRes.ok) {
    const err = await getRes.json()
    return res.status(502).json({ error: `GitHub GET failed: ${err.message}` })
  }
  const fileData = await getRes.json()
  const sha = fileData.sha

  // Step 2: push updated content
  const body = JSON.stringify({
    message: 'Update Architecture Diagram via Vercel canvas',
    content: Buffer.from(content).toString('base64'),
    sha
  })

  const putRes = await fetch(apiBase, { method: 'PUT', headers, body })
  if (!putRes.ok) {
    const err = await putRes.json()
    return res.status(502).json({ error: `GitHub PUT failed: ${err.message}` })
  }

  return res.status(200).json({ success: true })
}
