const router   = require('express').Router();
const supabase = require('../supabase');
const { requireProfessor } = require('../middleware/auth');

// GET /api/reports/summary?month=&year=
router.get('/summary', requireProfessor, async (req, res) => {
  const now      = new Date();
  const month    = Number(req.query.month) || (now.getMonth() + 1);
  const year     = Number(req.query.year)  || now.getFullYear();
  const prevDate = new Date(year, month - 2, 1);
  const prevMonth = prevDate.getMonth() + 1;
  const prevYear  = prevDate.getFullYear();

  const [
    { data: students },
    { data: payments },
    { data: prevPayments },
    { data: attCurr },
    { data: attPrev },
    { data: enrollments },
  ] = await Promise.all([
    supabase.from('users').select('id').eq('role', 'alumno').eq('active', true),
    supabase.from('payments').select('amount,status').eq('month', month).eq('year', year),
    supabase.from('payments').select('amount,status').eq('month', prevMonth).eq('year', prevYear),
    supabase.from('attendance').select('id').gte('class_date', `${year}-${String(month).padStart(2,'0')}-01`).lte('class_date', `${year}-${String(month).padStart(2,'0')}-31`),
    supabase.from('attendance').select('id').gte('class_date', `${prevYear}-${String(prevMonth).padStart(2,'0')}-01`).lte('class_date', `${prevYear}-${String(prevMonth).padStart(2,'0')}-31`),
    supabase.from('student_schedules').select('student_id').eq('active', true),
  ]);

  const calc = (pmts) => ({
    collected: (pmts || []).filter(p => p.status === 'approved').reduce((s, p) => s + Number(p.amount), 0),
    pending:   (pmts || []).filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0),
  });

  const curr = calc(payments);
  const prev = calc(prevPayments);

  const activeStudents = (students || []).length;
  const enrolledCount  = new Set((enrollments || []).map(e => e.student_id)).size;
  const currAttendance = (attCurr || []).length;
  const prevAttendance = (attPrev || []).length;

  res.json({
    month, year,
    collected: curr.collected,
    pending:   curr.pending,
    activeStudents,
    attendance: currAttendance,
    prev: {
      collected: prev.collected,
      pending:   prev.pending,
      attendance: prevAttendance,
    },
  });
});

// GET /api/reports/attendance-by-class?month=&year=&week=  (week = ISO week number)
router.get('/attendance-by-class', requireProfessor, async (req, res) => {
  const now   = new Date();
  const month = Number(req.query.month) || (now.getMonth() + 1);
  const year  = Number(req.query.year)  || now.getFullYear();
  const week  = req.query.week ? Number(req.query.week) : null;

  let from = `${year}-${String(month).padStart(2,'0')}-01`;
  let to   = `${year}-${String(month).padStart(2,'0')}-31`;

  if (week) {
    // Calculate date range for ISO week
    const jan4 = new Date(year, 0, 4);
    const startOfWeek1 = new Date(jan4);
    startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
    const weekStart = new Date(startOfWeek1);
    weekStart.setDate(startOfWeek1.getDate() + (week - 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    from = weekStart.toISOString().slice(0, 10);
    to   = weekEnd.toISOString().slice(0, 10);
  }

  const { data: att } = await supabase
    .from('attendance')
    .select('schedule_id, schedules(class_type_id, class_types(name,color))')
    .gte('class_date', from)
    .lte('class_date', to);

  const { data: schedules } = await supabase
    .from('schedules')
    .select('id, class_type_id, day_of_week, class_types(name,color)')
    .eq('active', true);

  // Count attendance per class type
  const countByType = {};
  const colorByType = {};
  for (const a of (att || [])) {
    const name  = a.schedules?.class_types?.name  || 'Otra';
    const color = a.schedules?.class_types?.color || '#6b7280';
    countByType[name] = (countByType[name] || 0) + 1;
    colorByType[name] = color;
  }

  // Count scheduled sessions per class type in range (to compute %)
  const daysInRange = [];
  const cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    daysInRange.push(cur.getDay()); // 0=Sun
    cur.setDate(cur.getDate() + 1);
  }

  const sessionsByType = {};
  for (const s of (schedules || [])) {
    const name     = s.class_types?.name || 'Otra';
    const dow      = s.day_of_week; // 0=Sun
    const sessions = daysInRange.filter(d => d === dow).length;
    sessionsByType[name] = (sessionsByType[name] || 0) + sessions;
  }

  // Enrolled students per class type (to estimate expected attendance)
  const { data: enrolled } = await supabase
    .from('student_schedules')
    .select('schedule_id, schedules(class_type_id, class_types(name))')
    .eq('active', true);

  const enrolledByType = {};
  for (const e of (enrolled || [])) {
    const name = e.schedules?.class_types?.name || 'Otra';
    enrolledByType[name] = (enrolledByType[name] || 0) + 1;
  }

  const data = Object.keys(countByType).map(name => {
    const expected = (enrolledByType[name] || 1) * (sessionsByType[name] || 1);
    const pct      = Math.min(100, Math.round((countByType[name] / expected) * 100));
    return { name, count: countByType[name], pct, color: colorByType[name] };
  });

  res.json({ from, to, data });
});

// GET /api/reports/student-ranking?month=&year=
router.get('/student-ranking', requireProfessor, async (req, res) => {
  const now   = new Date();
  const month = Number(req.query.month) || (now.getMonth() + 1);
  const year  = Number(req.query.year)  || now.getFullYear();
  const from  = `${year}-${String(month).padStart(2,'0')}-01`;
  const to    = `${year}-${String(month).padStart(2,'0')}-31`;

  const [{ data: students }, { data: att }, { data: enrollments }] = await Promise.all([
    supabase.from('users').select('id,name,belt,stripe').eq('role', 'alumno').eq('active', true),
    supabase.from('attendance').select('student_id').gte('class_date', from).lte('class_date', to),
    supabase.from('student_schedules').select('student_id, schedules(day_of_week)').eq('active', true),
  ]);

  const countByStudent = {};
  for (const a of (att || [])) {
    countByStudent[a.student_id] = (countByStudent[a.student_id] || 0) + 1;
  }

  // Expected classes per student (scheduled days in the month)
  const daysInMonth = [];
  const cur = new Date(from);
  const end = new Date(Math.min(new Date(to), now));
  while (cur <= end) {
    daysInMonth.push(cur.getDay());
    cur.setDate(cur.getDate() + 1);
  }

  const expectedByStudent = {};
  for (const e of (enrollments || [])) {
    const dow = e.schedules?.day_of_week;
    if (dow === undefined || dow === null) continue;
    expectedByStudent[e.student_id] = (expectedByStudent[e.student_id] || 0)
      + daysInMonth.filter(d => d === dow).length;
  }

  const ranked = (students || []).map(s => {
    const attended = countByStudent[s.id] || 0;
    const expected = expectedByStudent[s.id] || 0;
    const pct      = expected > 0 ? Math.round((attended / expected) * 100) : 0;
    return { ...s, attended, expected, pct };
  }).filter(s => s.expected > 0)
    .sort((a, b) => b.pct - a.pct);

  res.json({
    month, year,
    top5:    ranked.slice(0, 5),
    bottom5: [...ranked].reverse().slice(0, 5),
  });
});

// GET /api/reports/payment-status?month=&year=
router.get('/payment-status', requireProfessor, async (req, res) => {
  const now   = new Date();
  const month = Number(req.query.month) || (now.getMonth() + 1);
  const year  = Number(req.query.year)  || now.getFullYear();
  const isPast = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);

  const [{ data: students }, { data: payments }] = await Promise.all([
    supabase.from('users').select('id').eq('role', 'alumno').eq('active', true),
    supabase.from('payments').select('student_id,status').eq('month', month).eq('year', year),
  ]);

  const paidIds    = new Set(payments?.filter(p => p.status === 'approved').map(p => p.student_id));
  const pendingIds = new Set(payments?.filter(p => p.status === 'pending').map(p => p.student_id));
  const totalActive = (students || []).length;

  let paid    = 0;
  let pending = 0;
  let overdue = 0;
  let noData  = 0;

  for (const s of (students || [])) {
    if (paidIds.has(s.id))         { paid++;    }
    else if (pendingIds.has(s.id)) { isPast ? overdue++ : pending++; }
    else                           { isPast ? overdue++ : noData++;  }
  }

  res.json({ month, year, total: totalActive, paid, pending, overdue, noData });
});

// GET /api/reports/income-history?months=6
router.get('/income-history', requireProfessor, async (req, res) => {
  const n    = Math.min(Number(req.query.months) || 6, 24);
  const now  = new Date();

  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ month: d.getMonth() + 1, year: d.getFullYear() });
  }

  const results = await Promise.all(months.map(({ month, year }) =>
    supabase.from('payments')
      .select('amount')
      .eq('status', 'approved')
      .eq('month', month)
      .eq('year', year)
      .then(({ data }) => ({
        month, year,
        total: (data || []).reduce((s, p) => s + Number(p.amount), 0),
        label: `${String(month).padStart(2,'0')}/${String(year).slice(-2)}`,
      }))
  ));

  res.json(results);
});

module.exports = router;
