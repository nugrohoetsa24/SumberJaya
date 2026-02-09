import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠️ service role
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const chunks: Buffer[] = []

    for await (const chunk of req) {
      chunks.push(chunk)
    }

    const buffer = Buffer.concat(chunks)
    const fileName = `products/product-${Date.now()}.png`

    const { error } = await supabase.storage
      .from('product-images')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        upsert: true,
      })

    if (error) {
      console.error(error)
      return res.status(500).json({ error: error.message })
    }

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName)

    return res.status(200).json({ url: data.publicUrl })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Upload gagal' })
  }
}