const router   = require('express').Router();
const supabase = require('../supabase');
const { requireProfessor } = require('../middleware/auth');

// GET /api/finances/summary?month=&year=
router.get('/summary', requireProfessor, async (req, res) => {
  const now   = new Date();
  const month = Number(req.query.month) || (now.getMonth() + 1);
  const year  = Number(req.query.year)  || now.getFullYear();

  const { data: payments, error } = await supabase
    .from('payments')
    .select('amount,status,concept,created_at,paid_at, users!payments_student_id_fkey(name)')
    .eq('month', month)
    .eq('year', year);

  if (error) return res.status(500).json({ error: error.message });

  const approved = payments.filter(p => p.status === 'approved');
  const pending  = payments.filter(p => p.status === 'pending');

  const totalCollected = approved.reduce((s, p) => s + Number(p.amount), 0);
  const totalPending   = pending.reduce((s, p) => s + Number(p.amount), 0);

  res.json({ month, year, totalCollected, totalPending, approved, pending, all: payments });
});

// GET /api/finances/debtors
router.get('/debtors', requireProfessor, async (req, res) => {
  const now   = new Date();
  const month = Number(req.query.month) || (now.getMonth() + 1);
  const year  = Number(req.query.year)  || now.getFullYear();

  const { data: allStudents } = await supabase
    .from('users')
    .select('id,name,dni,phone,email,belt,stripe')
    .eq('role', 'alumno')
    .eq('active', true);

  const { data: paidThisMonth } = await supabase
    .from('payments')
    .select('student_id')
    .eq('status', 'approved')
    .eq('month', month)
    .eq('year', year);

  const paidIds = new Set((paidThisMonth || []).map(p => p.student_id));
  const debtors = (allStudents || []).filter(s => !paidIds.has(s.id));

  res.json({ month, year, count: debtors.length, debtors });
});

// GET /api/finances/settings – monthly fee (all authenticated users)
router.get('/settings', async (req, res) => {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'monthly_fee')
      .maybeSingle();
    res.json({ monthly_fee: data?.value ? Number(data.value) : null });
  } catch {
    res.json({ monthly_fee: null });
  }
});

// PUT /api/finances/settings – set monthly fee (professor only)
router.put('/settings', requireProfessor, async (req, res) => {
  const { monthly_fee } = req.body;
  if (!monthly_fee || Number(monthly_fee) <= 0) {
    return res.status(400).json({ error: 'Monto inválido' });
  }
  const { error } = await supabase
    .from('settings')
    .upsert({ key: 'monthly_fee', value: String(monthly_fee) }, { onConflict: 'key' });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ monthly_fee: Number(monthly_fee) });
});

module.exports = router;
