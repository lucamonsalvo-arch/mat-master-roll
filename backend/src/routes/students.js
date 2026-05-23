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

// GET /api/students/class-enrollments – active enrollments with class type (profesor only)
router.get('/class-enrollments', requireProfessor, async (req, res) => {
  const { data, error } = await supabase
    .from('student_schedules')
    .select('student_id, schedules(class_type_id, class_types(name))')
    .eq('active', true);
  if (error) return res.status(500).json({ error: error.message });
  const result = (data || [])
    .map(e => ({
      student_id:      e.student_id,
      class_type_id:   e.schedules?.class_type_id,
      class_type_name: e.schedules?.class_types?.name,
    }))
    .filter(e => e.class_type_id);
  res.json(result);
});

// GET /api/students/absences-alert – students with 3+ consecutive absences (profesor only)
router.get('/absences-alert', requireProfessor, async (req, res) => {
  const { data: enrollments } = await supabase
    .from('student_schedules')
    .select('student_id, schedule_id, schedules(day_of_week)')
    .eq('active', true);

  if (!enrollments?.length) return res.json([]);

  // Group by student
  const byStudent = {};
  for (const e of enrollments) {
    if (!byStudent[e.student_id]) byStudent[e.student_id] = [];
    byStudent[e.student_id].push(e);
  }

  // Last N occurrences of a weekday (before today)
  function lastNDates(dow, n) {
    const dates = [];
    const d = new Date();
    d.setDate(d.getDate() - 1); // start yesterday
    d.setHours(0, 0, 0, 0);
    while (dates.length < n) {
      if (d.getDay() === dow) dates.push(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() - 1);
    }
    return dates;
  }

  // Recent attendance (last 45 days)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 45);
  const { data: att } = await supabase
    .from('attendance')
    .select('student_id, schedule_id, class_date')
    .gte('class_date', cutoff.toISOString().slice(0, 10));

  const attSet = new Set((att || []).map(a => `${a.student_id}_${a.schedule_id}_${a.class_date}`));

  const alerts = [];
  for (const [studentId, enrolls] of Object.entries(byStudent)) {
    const expected = [];
    for (const e of enrolls) {
      const dow = e.schedules?.day_of_week;
      if (dow === undefined || dow === null) continue;
      lastNDates(dow, 10).forEach(date => expected.push({ date, schedule_id: e.schedule_id }));
    }
    expected.sort((a, b) => b.date.localeCompare(a.date));

    let consecutive = 0;
    for (const ex of expected) {
      if (attSet.has(`${studentId}_${ex.schedule_id}_${ex.date}`)) break;
      consecutive++;
    }
    if (consecutive >= 3) alerts.push({ student_id: studentId, consecutive_absences: consecutive });
  }

  res.json(alerts);
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
    .insert({ dni, pin_hash, name, role: 'alumno', belt, stripe, phone, email, photo_url, birth_date: birth_date || null })
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
  if (updates.birth_date === '') updates.birth_date = null;
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

// GET /api/students/:id/belt-history
router.get('/:id/belt-history', requireAuth, async (req, res) => {
  if (req.user.role !== 'profesor' && req.user.id !== req.params.id) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  try {
    const { data } = await supabase
      .from('belt_history')
      .select('*')
      .eq('student_id', req.params.id)
      .order('promoted_at', { ascending: false });
    res.json(data || []);
  } catch { res.json([]); }
});

// POST /api/students/:id/promote
router.post('/:id/promote', requireProfessor, async (req, res) => {
  const { belt, stripe, notes, promoted_at } = req.body;
  if (!belt) return res.status(400).json({ error: 'Faixa requerida' });

  const [userRes, histRes] = await Promise.all([
    supabase.from('users')
      .update({ belt, stripe: stripe || 0 })
      .eq('id', req.params.id)
      .select('id,name,belt,stripe')
      .single(),
    supabase.from('belt_history')
      .insert({ student_id: req.params.id, belt, stripe: stripe || 0, notes: notes || null, promoted_at: promoted_at || new Date().toISOString().slice(0, 10) })
      .select()
      .single(),
  ]);

  if (userRes.error) return res.status(400).json({ error: userRes.error.message });
  res.status(201).json({ student: userRes.data, history: histRes.data });
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
