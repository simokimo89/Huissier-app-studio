/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Supabase client for authentication and database operations.
 * Replace the Express backend entirely.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://rylfwshibjufhfcxjacn.supabase.co';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'sb_publishable_N3G9_cOH_9Xapi8Eu4EwlA_iUhSPrub';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('[Supabase] Client initialized with URL:', supabaseUrl);
