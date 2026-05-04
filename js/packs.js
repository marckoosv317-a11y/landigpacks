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
  async function add({ category, type, name, description, downloadUrl }) {
    const { data, error } = await _db
      .from('packs')
      .insert([{
        category,
        type,
        name,
        description,
        download_url: downloadUrl,
      }])
      .select()
      .single();
    if (error) { console.error('PacksDB.add:', error.message); throw error; }
    return data;
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

  /* ── Expose globally ────────────────────────────────────────── */
  window.PacksDB = {
    getAll,
    getByCategory,
    getTypes,
    add,
    delete: deletePack,
    deleteAll,
    formatDate,
  };
})();
