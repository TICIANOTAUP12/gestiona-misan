import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, publicAnonKey } from '../../../utils/supabase/info';

export const supabase = createClient(supabaseUrl, publicAnonKey);

export const DEFAULT_ADMIN_EMAIL = 'gestiona@misan.com';

/** Acepta "gestiona" o el email completo */
export function resolveLoginEmail(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.includes('@')) return trimmed;
  return DEFAULT_ADMIN_EMAIL;
}
