import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { CLIENT_CONFIG } from '@/client.config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Singleton instance for admin client
let supabaseAdminInstance: SupabaseClient<Database, string> | null = null

/**
 * Get Supabase Admin Client (Server-side only!)
 * This client bypasses RLS policies - use with caution
 * Only use in API routes with proper authorization checks
 */
export const getSupabaseAdmin = (): SupabaseClient<Database, string> => {
  if (!supabaseAdminInstance) {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase admin environment variables')
    }

    supabaseAdminInstance = createClient<Database, string>(supabaseUrl, supabaseServiceRoleKey, {
      db: {
        schema: CLIENT_CONFIG.schema
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        fetch: (url: any, options: any = {}) => fetch(url, { ...options, cache: 'no-store' })
      }
    })
  }
  return supabaseAdminInstance
}

// Export singleton instance
export const supabaseAdmin = getSupabaseAdmin()
