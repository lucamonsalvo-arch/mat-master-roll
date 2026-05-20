const router   = require('express').Router();
const supabase = require('../supabase');
const { requireProfessor } = require('../middleware/auth');

// GET /api/access?limit=50&user_id=
router.get('/', requireProfessor, async (req, res) => {
  const limit   = Math.min(Number(req.query.limit) || 50, 200);
  const user_id = req.query.user_id;

  let query = supabase
    .from('access_log')
    .select('*, users!access_log_user_id_fkey(id,name,dni,role)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (user_id) query = query.eq('user_id', user_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
