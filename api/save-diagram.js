// Vercel serverless function: saves the Architecture Diagram back to GitHub
// Requires GITHUB_TOKEN env var set in Vercel project settings (repo write access)

const OWNER = 'ignizia-code'
const REPO = 'mcp-excalidraw'
const FILE_PATH = 'Working projects/Architecture Diagram.excalidraw'

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const token = process.env.GITHUB_TOKEN
    if (!token) {
      return res.status(500).json({ error: 'GITHUB_TOKEN not configured on the server' })
    }

    // Vercel parses JSON bodies automatically when Content-Type is application/json
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const content = body && body.content
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Missing content in request body' })
    }

    // Encode path segments (handles spaces), preserve slashes
    const encodedPath = FILE_PATH.split('/').map(encodeURIComponent).join('/')
    const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodedPath}`

    const ghHeaders = {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'mcp-excalidraw-vercel'
    }

    // Step 1: get current file SHA (required for GitHub update)
    const getRes = await fetch(apiUrl, { headers: ghHeaders })
    if (!getRes.ok) {
      const errBody = await getRes.text()
      return res.status(502).json({ error: `GitHub GET failed (${getRes.status}): ${errBody}` })
    }
    const fileData = await getRes.json()
    const sha = fileData.sha
    if (!sha) {
      return res.status(502).json({ error: 'Could not retrieve file SHA from GitHub' })
    }

    // Step 2: push updated content (base64-encoded)
    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: ghHeaders,
      body: JSON.stringify({
        message: 'Update Architecture Diagram via Vercel canvas',
        content: Buffer.from(content, 'utf8').toString('base64'),
        sha
      })
    })

    if (!putRes.ok) {
      const errBody = await putRes.text()
      return res.status(502).json({ error: `GitHub PUT failed (${putRes.status}): ${errBody}` })
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
