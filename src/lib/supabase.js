import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if URL is a valid HTTP/HTTPS URL
const isValidUrl = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (_e) {
    return false;
  }
};

if (!supabaseUrl || !isValidUrl(supabaseUrl) || !supabaseAnonKey) {
  console.error('Supabase Error: Invalid or missing credentials in .env file.');
  console.info('Make sure VITE_SUPABASE_URL starts with https://');
}

export const supabase = (supabaseUrl && isValidUrl(supabaseUrl) && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

