const router   = require('express').Router();
const supabase = require('../supabase');
const { requireAuth, requireProfessor } = require('../middleware/auth');

// GET /api/announcements
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*, users!announcements_professor_id_fkey(name)')
      .eq('active', true)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) return res.json([]);
    res.json(data || []);
  } catch { res.json([]); }
});

// POST /api/announcements
router.post('/', requireProfessor, async (req, res) => {
  const { title, body, pinned } = req.body;
  if (!title) return res.status(400).json({ error: 'Título requerido' });
  const { data, error } = await supabase
    .from('announcements')
    .insert({ title, body: body || null, pinned: !!pinned, professor_id: req.user.id })
    .select('*, users!announcements_professor_id_fkey(name)')
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/announcements/:id
router.put('/:id', requireProfessor, async (req, res) => {
  const { title, body, pinned } = req.body;
  const { data, error } = await supabase
    .from('announcements')
    .update({ title, body: body || null, pinned: !!pinned })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// DELETE /api/announcements/:id
router.delete('/:id', requireProfessor, async (req, res) => {
  const { error } = await supabase
    .from('announcements')
    .update({ active: false })
    .eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
