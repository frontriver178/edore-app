import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://kfggjhvdpgxsgpnzbhia.supabase.co'
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZ2dqaHZkcGd4c2dwbnpiaGlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzgwNjUsImV4cCI6MjA2NjYxNDA2NX0.XQg6nZ77kVwEJIoarvJ9p5coKl0TQ1zxx6_07WsqoUU'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key are required')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})
