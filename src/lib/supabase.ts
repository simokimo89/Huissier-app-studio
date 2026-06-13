/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Supabase client for authentication and database operations.
 * Replace the Express backend entirely.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://rylfwshibjufhfcxjacn.supabase.co';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5bGZ3c2hpYmp1ZmhmY3hqYWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyODkwOTksImV4cCI6MjA5Njg2NTA5OX0.4dlfMvLt4m6pWs8TOUHazjJC0SUdkCdIvCkG-gAvDjI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Exported for direct fetch auth (workaround for supabase-js fetch header issue)
export { supabaseUrl, supabaseAnonKey };
