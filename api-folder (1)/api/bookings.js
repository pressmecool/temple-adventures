// Stores real bookings so Revenue can show genuine numbers instead of
// hardcoded text. Needs a Vercel KV (Redis) store connected to this project:
// Vercel dashboard → Storage tab → Create Database → KV → Connect to project
// → redeploy. Once connected, env vars are added automatically.

import { kv } from '@vercel/kv'

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const bookings = (await kv.get('bookings')) || []
      res.status(200).json({ bookings })
      return
    }

    if (req.method === 'POST') {
      const { customer, package: pkg, amount, date } = req.body || {}
      if (!customer || !amount) {
        res.status(400).json({ error: 'customer and amount are required' })
        return
      }
      const bookings = (await kv.get('bookings')) || []
      const entry = {
        id: Date.now().toString(36),
        customer,
        package: pkg || '',
        amount: Number(amount),
        date: date || new Date().toISOString(),
      }
      bookings.unshift(entry)
      await kv.set('bookings', bookings)
      res.status(200).json({ bookings })
      return
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    res.status(500).json({
      error:
        'Revenue storage not connected yet. In Vercel: Storage tab → Create Database → KV → Connect to project → redeploy. (' +
        err.message +
        ')',
    })
  }
}
