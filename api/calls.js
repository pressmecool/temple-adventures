// Vercel serverless function — runs on Vercel's servers, never in the
// browser, so it's the safe place to use your real Exotel credentials.
// Set these in Vercel → Project Settings → Environment Variables.

export default async function handler(req, res) {
  const { EXOTEL_API_KEY, EXOTEL_API_TOKEN, EXOTEL_ACCOUNT_SID, EXOTEL_SUBDOMAIN } = process.env

  if (!EXOTEL_API_KEY || !EXOTEL_API_TOKEN || !EXOTEL_ACCOUNT_SID) {
    res.status(500).json({
      error:
        'Missing Exotel credentials. Set EXOTEL_API_KEY, EXOTEL_API_TOKEN and EXOTEL_ACCOUNT_SID as environment variables in Vercel, then redeploy.',
    })
    return
  }

  // Most India-based Exotel accounts use api.in.exotel.com — if your
  // dashboard URL is my.exotel.com (not my.in.exotel.com), set
  // EXOTEL_SUBDOMAIN to api.exotel.com instead.
  const subdomain = EXOTEL_SUBDOMAIN || 'api.in.exotel.com'
  const auth = Buffer.from(`${EXOTEL_API_KEY}:${EXOTEL_API_TOKEN}`).toString('base64')

  try {
    const response = await fetch(
      `https://${subdomain}/v1/Accounts/${EXOTEL_ACCOUNT_SID}/Calls.json?PageSize=20`,
      { headers: { Authorization: `Basic ${auth}` } }
    )

    const data = await response.json()

    if (!response.ok) {
      res.status(response.status).json({ error: 'Exotel API rejected the request.', details: data })
      return
    }

    res.status(200).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
