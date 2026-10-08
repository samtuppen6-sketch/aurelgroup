// Copy to config.js during deployment. The publishable/anon key is browser-safe ONLY because RLS protects the database.
// NEVER put service-role keys, Companies House credentials or Gmail OAuth tokens here.
window.AUREL_CONFIG = {
  supabaseUrl: 'https://YOUR-NEW-AUREL-PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR_SUPABASE_PUBLISHABLE_KEY'
};
