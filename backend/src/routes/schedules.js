const router   = require('express').Router();
const supabase = require('../supabase');
const { requireAuth, requireProfessor } = require('../middleware/auth');

// GET /api/schedules
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('schedules')
    .select('*, class_types(name,color), users!schedules_professor_id_fkey(id,name)')
    .eq('active', true)
    .order('day_of_week')
    .order('start_time');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/schedules/:id/students – students enrolled in a class
router.get('/:id/students', requireProfessor, async (req, res) => {
  const { data, error } = await supabase
    .from('student_schedules')
    .select('*, users!student_schedules_student_id_fkey(id,name,dni,belt,stripe,photo_url)')
    .eq('schedule_id', req.params.id)
    .eq('active', true);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/schedules
router.post('/', requireProfessor, async (req, res) => {
  const { class_type_id, start_time, end_time, location } = req.body;
  const professor_id = req.body.professor_id || null;
  const days = Array.isArray(req.body.days) ? req.body.days : [req.body.day_of_week];

  if (!days.length) return res.status(400).json({ error: 'Seleccioná al menos un día' });

  const records = days.map(day_of_week => ({
    class_type_id, professor_id, day_of_week, start_time, end_time, location,
  }));

  const { data, error } = await supabase
    .from('schedules')
    .insert(records)
    .select('*, class_types(name,color)');
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/schedules/:id
router.put('/:id', requireProfessor, async (req, res) => {
  const { class_type_id, day_of_week, start_time, end_time, location, active } = req.body;
  const professor_id = req.body.professor_id || null;
  const { data, error } = await supabase
    .from('schedules')
    .update({ class_type_id, professor_id, day_of_week, start_time, end_time, location, active })
    .eq('id', req.params.id)
    .select('*, class_types(name,color)')
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// DELETE /api/schedules/:id
router.delete('/:id', requireProfessor, async (req, res) => {
  const { error } = await supabase
    .from('schedules').update({ active: false }).eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// GET /api/class-types
router.get('/class-types', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('class_types').select('*').eq('active', true);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
