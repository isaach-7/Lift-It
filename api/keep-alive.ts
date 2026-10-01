import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET

  if (
    !cronSecret ||
    request.headers.get('authorization') !== `Bearer ${cronSecret}`
  ) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return new Response('Missing Supabase configuration', { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  for (let requestNumber = 0; requestNumber < 3; requestNumber += 1) {
    const { error } = await supabase.rpc('keep_alive')

    if (error) {
      console.error('Supabase keep-alive failed:', error)
      return new Response('Keep-alive failed', { status: 500 })
    }
  }

  return Response.json({ ok: true })
}
