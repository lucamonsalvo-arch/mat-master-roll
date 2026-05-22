const router   = require('express').Router();
const supabase = require('../supabase');
const { requireAuth, requireProfessor } = require('../middleware/auth');

// GET /api/attendance?schedule_id=&date=YYYY-MM-DD
router.get('/', requireAuth, async (req, res) => {
  const { schedule_id, date, student_id, month, year } = req.query;

  let query = supabase
    .from('attendance')
    .select('*, users!attendance_student_id_fkey(id,name,dni,belt,stripe,photo_url), schedules(*, class_types(name,color))');

  if (schedule_id) query = query.eq('schedule_id', schedule_id);
  if (date)        query = query.eq('class_date', date);
  if (student_id)  query = query.eq('student_id', student_id);
  if (month && year) {
    const from = `${year}-${String(month).padStart(2,'0')}-01`;
    const to   = `${year}-${String(month).padStart(2,'0')}-31`;
    query = query.gte('class_date', from).lte('class_date', to);
  }

  // Alumnos only see own attendance
  if (req.user.role === 'alumno') query = query.eq('student_id', req.user.id);

  query = query.order('class_date', { ascending: false });

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/attendance  – mark attendance (profesor only)
router.post('/', requireProfessor, async (req, res) => {
  const { student_id, schedule_id, class_date, notes } = req.body;
  if (!student_id || !schedule_id) {
    return res.status(400).json({ error: 'student_id y schedule_id son requeridos' });
  }

  const { data, error } = await supabase
    .from('attendance')
    .upsert({
      student_id,
      schedule_id,
      class_date: class_date || new Date().toISOString().slice(0,10),
      marked_by: req.user.id,
      notes,
    }, { onConflict: 'student_id,schedule_id,class_date' })
    .select('*, users!attendance_student_id_fkey(id,name)')
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// POST /api/attendance/bulk  – mark multiple at once
router.post('/bulk', requireProfessor, async (req, res) => {
  const { student_ids, schedule_id, class_date } = req.body;
  if (!Array.isArray(student_ids) || !schedule_id) {
    return res.status(400).json({ error: 'student_ids[] y schedule_id requeridos' });
  }

  const date = class_date || new Date().toISOString().slice(0,10);
  const records = student_ids.map(sid => ({
    student_id: sid, schedule_id, class_date: date, marked_by: req.user.id,
  }));

  const { data, error } = await supabase
    .from('attendance')
    .upsert(records, { onConflict: 'student_id,schedule_id,class_date' })
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// PUT /api/attendance/:id  – edit date or notes (profesor only)
router.put('/:id', requireProfessor, async (req, res) => {
  const { class_date, schedule_id, notes } = req.body;
  const updates = {};
  if (class_date  !== undefined) updates.class_date  = class_date;
  if (schedule_id !== undefined) updates.schedule_id = schedule_id;
  if (notes       !== undefined) updates.notes       = notes;
  const { data, error } = await supabase
    .from('attendance').update(updates).eq('id', req.params.id).select('*').single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// DELETE /api/attendance/:id  – remove attendance mark
router.delete('/:id', requireProfessor, async (req, res) => {
  const { error } = await supabase.from('attendance').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// GET /api/attendance/stats/:studentId  – attendance stats for a student
router.get('/stats/:studentId', requireAuth, async (req, res) => {
  if (req.user.role === 'alumno' && req.user.id !== req.params.studentId) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  const now  = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const from = `${year}-${String(month).padStart(2,'0')}-01`;
  const to   = now.toISOString().slice(0,10);

  const { data, error } = await supabase
    .from('attendance')
    .select('class_date, schedules(class_types(name))')
    .eq('student_id', req.params.studentId)
    .gte('class_date', from)
    .lte('class_date', to);

  if (error) return res.status(500).json({ error: error.message });

  const total = data.length;
  const byClass = data.reduce((acc, a) => {
    const name = a.schedules?.class_types?.name || 'Clase';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  res.json({ total, month, year, byClass, records: data });
});

module.exports = router;
