export const projectId =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? 'qhdxtwargzpjljytqlvm';

export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? `https://${projectId}.supabase.co`;

export const publicAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoZHh0d2FyZ3pwamxqeXRxbHZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyOTg4MzQsImV4cCI6MjA5NDg3NDgzNH0.po-WXMM1hmWZHU7RpfOFfGyOomRsPlgB4UeoWM7W-rQ';
