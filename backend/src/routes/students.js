const router   = require('express').Router();
const bcrypt   = require('bcryptjs');
const supabase = require('../supabase');
const { requireAuth, requireProfessor } = require('../middleware/auth');

// GET /api/students  – profesor: all; alumno: only self
router.get('/', requireAuth, async (req, res) => {
  if (req.user.role === 'profesor') {
    const { data, error } = await supabase
      .from('users')
      .select('id,dni,name,role,belt,stripe,phone,email,photo_url,birth_date,join_date,active,created_at')
      .eq('role', 'alumno')
      .order('name');
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }
  // alumno: return own profile
  const { data, error } = await supabase
    .from('users')
    .select('id,dni,name,role,belt,stripe,phone,email,photo_url,birth_date,join_date,active,created_at')
    .eq('id', req.user.id)
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/students/:id
router.get('/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'profesor' && req.user.id !== req.params.id) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  const { data, error } = await supabase
    .from('users')
    .select('id,dni,name,role,belt,stripe,phone,email,photo_url,birth_date,join_date,active,created_at')
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(404).json({ error: 'Alumno no encontrado' });
  res.json(data);
});

// POST /api/students  – create (profesor only)
router.post('/', requireProfessor, async (req, res) => {
  const { dni, pin, name, belt, stripe, phone, email, photo_url, birth_date } = req.body;
  if (!dni || !pin || !name) return res.status(400).json({ error: 'dni, pin y name son requeridos' });

  const pin_hash = await bcrypt.hash(String(pin), 10);
  const { data, error } = await supabase
    .from('users')
    .insert({ dni, pin_hash, name, role: 'alumno', belt, stripe, phone, email, photo_url, birth_date })
    .select('id,dni,name,role,belt,stripe,phone,email,photo_url,birth_date,join_date,active')
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/students/:id  – update (profesor only; alumno can update own profile fields)
router.put('/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'profesor' && req.user.id !== req.params.id) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  const allowed = req.user.role === 'profesor'
    ? ['name','belt','stripe','phone','email','photo_url','birth_date','active','pin']
    : ['phone','email','photo_url'];

  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (updates.pin) {
    updates.pin_hash = await bcrypt.hash(String(updates.pin), 10);
    delete updates.pin;
  }

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', req.params.id)
    .select('id,dni,name,role,belt,stripe,phone,email,photo_url,birth_date,join_date,active')
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// GET /api/students/:id/schedules – enrolled classes
router.get('/:id/schedules', requireAuth, async (req, res) => {
  if (req.user.role !== 'profesor' && req.user.id !== req.params.id) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  const { data, error } = await supabase
    .from('student_schedules')
    .select('*, schedules(*, class_types(name,color), users!schedules_professor_id_fkey(name))')
    .eq('student_id', req.params.id)
    .eq('active', true);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/students/:id/schedules – enroll student in a class
router.post('/:id/schedules', requireProfessor, async (req, res) => {
  const { schedule_id } = req.body;
  const { data, error } = await supabase
    .from('student_schedules')
    .upsert({ student_id: req.params.id, schedule_id, active: true })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// DELETE /api/students/:id/schedules/:scheduleId – unenroll
router.delete('/:id/schedules/:scheduleId', requireProfessor, async (req, res) => {
  const { error } = await supabase
    .from('student_schedules')
    .update({ active: false })
    .eq('student_id', req.params.id)
    .eq('schedule_id', req.params.scheduleId);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
