import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let _admin: SupabaseClient | null = null;

/** Sadece sunucu tarafında kullan (API route). İlk kullanımda env kontrolü yapar. */
export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin env (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) tanımlı olmalı.');
  }
  if (!_admin) {
    _admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _admin;
}
