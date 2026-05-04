/**
 * packs.js — Supabase data layer
 * Requires: Supabase CDN + js/config.js loaded before this file
 */

(function () {
  // Init Supabase client
  const { createClient } = supabase;
  const _db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  /* ── Helpers ───────────────────────────────────────────────── */
  function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR');
  }

  /* ── READ ───────────────────────────────────────────────────── */
  async function getAll() {
    const { data, error } = await _db
      .from('packs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('PacksDB.getAll:', error.message); return []; }
    return data || [];
  }

  async function getByCategory(category) {
    const { data, error } = await _db
      .from('packs')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });
    if (error) { console.error('PacksDB.getByCategory:', error.message); return []; }
    return data || [];
  }

  async function getTypes(category) {
    const packs = await getByCategory(category);
    return [...new Set(packs.map(p => p.type))];
  }

  /* ── CREATE ─────────────────────────────────────────────────── */
  async function add({ category, type, name, description, downloadUrl, coverUrl }) {
    const { data, error } = await _db
      .from('packs')
      .insert([{
        category,
        type,
        name,
        description,
        download_url: downloadUrl,
        cover_url: coverUrl,
        clicks: 0
      }])
      .select()
      .single();
    if (error) { console.error('PacksDB.add:', error.message); throw error; }
    return data;
  }

  /* ── STORAGE (Upload) ───────────────────────────────────────── */
  async function uploadPreview(file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await _db.storage
      .from('previews')
      .upload(filePath, file);

    if (error) { console.error('Upload error:', error.message); throw error; }

    const { data: { publicUrl } } = _db.storage
      .from('previews')
      .getPublicUrl(filePath);

    return publicUrl;
  }

  /* ── INTERACTIONS ───────────────────────────────────────────── */
  async function trackClick(id) {
    // Increment clicks using a simple RPC or just fetching + updating
    // For simplicity with vanilla RLS, we'll use a standard update
    const { data: current } = await _db.from('packs').select('clicks').eq('id', id).single();
    const newCount = (current?.clicks || 0) + 1;
    
    await _db.from('packs')
      .update({ clicks: newCount })
      .eq('id', id);
  }

  /* ── DELETE ─────────────────────────────────────────────────── */
  async function deletePack(id) {
    const { error } = await _db
      .from('packs')
      .delete()
      .eq('id', id);
    if (error) { console.error('PacksDB.delete:', error.message); throw error; }
  }

  async function deleteAll() {
    const { error } = await _db
      .from('packs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all rows
    if (error) { console.error('PacksDB.deleteAll:', error.message); throw error; }
  }

  /* ── SETTINGS ───────────────────────────────────────────────── */
  async function getSetting(id) {
    const { data, error } = await _db
      .from('settings')
      .select('value')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Settings.get:', error.message);
      return null;
    }
    return data ? data.value : null;
  }

  async function updateSetting(id, value) {
    const { error } = await _db
      .from('settings')
      .upsert({ id, value });
    if (error) { console.error('Settings.update:', error.message); throw error; }
  }

  /* ── Expose globally ────────────────────────────────────────── */
  window.PacksDB = {
    getAll,
    getByCategory,
    getTypes,
    add,
    delete: deletePack,
    deleteAll,
    formatDate,
    getSetting,
    updateSetting,
    uploadPreview,
    trackClick
  };
})();
