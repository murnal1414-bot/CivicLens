import { createClient } from '@supabase/supabase-js'
import { ENV } from '../config/env'

export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY)

// The whitelist of emails authorized to access the officer/government portals.
// You can expand this array with your custom admin/officer Gmail accounts.
export const GOV_EMAIL_WHITELIST = [
  'devanshkumarpatidar@gmail.com',
  'murnal1414@gmail.com',
  'mradul.mahajan0801@gmail.com',
]
