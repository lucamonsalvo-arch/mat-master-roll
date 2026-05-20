const router   = require('express').Router();
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const fetch    = require('node-fetch');
const supabase = require('../supabase');
const { requireAuth, requireProfessor } = require('../middleware/auth');

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

// GET /api/payments
router.get('/', requireAuth, async (req, res) => {
  let query = supabase
    .from('payments')
    .select('*, users!payments_student_id_fkey(id,name,dni,phone)')
    .order('created_at', { ascending: false });

  if (req.user.role === 'alumno') query = query.eq('student_id', req.user.id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/payments/create-preference  – create MP checkout
router.post('/create-preference', requireAuth, async (req, res) => {
  const { amount, concept, month, year } = req.body;
  const studentId = req.user.role === 'alumno' ? req.user.id : req.body.student_id;

  if (!amount || !concept || !studentId) {
    return res.status(400).json({ error: 'amount, concept y student_id requeridos' });
  }

  // Get student info
  const { data: student } = await supabase
    .from('users').select('id,name,email,phone').eq('id', studentId).single();
  if (!student) return res.status(404).json({ error: 'Alumno no encontrado' });

  // Create payment record
  const { data: payment, error: dbErr } = await supabase
    .from('payments')
    .insert({ student_id: studentId, amount, concept, status: 'pending', month, year })
    .select()
    .single();
  if (dbErr) return res.status(500).json({ error: dbErr.message });

  // Create MP preference
  const preference = new Preference(mp);
  const prefData = await preference.create({
    body: {
      items: [{ title: concept, quantity: 1, unit_price: Number(amount), currency_id: 'ARS' }],
      payer: { name: student.name, email: student.email || 'pago@matmasterroll.com' },
      external_reference: payment.id,
      notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
      back_urls: {
        success: `${process.env.FRONTEND_URL}/pago/exito`,
        failure: `${process.env.FRONTEND_URL}/pago/error`,
        pending: `${process.env.FRONTEND_URL}/pago/pendiente`,
      },
      auto_return: 'approved',
    },
  });

  // Save preference id
  await supabase.from('payments')
    .update({ mp_preference_id: prefData.id, mp_external_ref: payment.id })
    .eq('id', payment.id);

  res.json({ preference_id: prefData.id, init_point: prefData.init_point, payment_id: payment.id });
});

// POST /api/payments/webhook  – MercadoPago IPN/webhook
router.post('/webhook', async (req, res) => {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { type, data } = body;

    if (type === 'payment' && data?.id) {
      const paymentClient = new Payment(mp);
      const mpPayment = await paymentClient.get({ id: data.id });

      const externalRef = mpPayment.external_reference;
      const status      = mpPayment.status; // approved | pending | rejected

      // Update DB
      const updates = {
        mp_payment_id: String(mpPayment.id),
        status: status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending',
        paid_at: status === 'approved' ? new Date().toISOString() : null,
      };

      const { data: payment } = await supabase
        .from('payments')
        .update(updates)
        .eq('id', externalRef)
        .select('*, users!payments_student_id_fkey(name,phone)')
        .single();

      if (payment && status === 'approved') {
        // Notify via n8n → WhatsApp
        await notifyN8n({
          event: 'payment_approved',
          student_name: payment.users?.name,
          student_phone: payment.users?.phone,
          amount: payment.amount,
          concept: payment.concept,
          paid_at: payment.paid_at,
        });
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(200).send('OK'); // Always 200 to avoid MP retries
  }
});

// POST /api/payments/notify-debtors  – send WhatsApp reminders to debtors (profesor)
router.post('/notify-debtors', requireProfessor, async (req, res) => {
  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  // Find students with no approved payment this month
  const { data: allStudents } = await supabase
    .from('users').select('id,name,phone').eq('role', 'alumno').eq('active', true);

  const { data: paidThisMonth } = await supabase
    .from('payments')
    .select('student_id')
    .eq('status', 'approved')
    .eq('month', month)
    .eq('year', year);

  const paidIds = new Set((paidThisMonth || []).map(p => p.student_id));
  const debtors = (allStudents || []).filter(s => !paidIds.has(s.id) && s.phone);

  let notified = 0;
  for (const debtor of debtors) {
    await notifyN8n({
      event: 'payment_reminder',
      student_name: debtor.name,
      student_phone: debtor.phone,
      month,
      year,
    });
    notified++;
  }

  res.json({ notified, debtors: debtors.map(d => d.name) });
});

// Manual payment registration by professor
router.post('/manual', requireProfessor, async (req, res) => {
  const { student_id, amount, concept, month, year } = req.body;
  const { data, error } = await supabase
    .from('payments')
    .insert({
      student_id, amount, concept, month, year,
      status: 'approved',
      paid_at: new Date().toISOString(),
    })
    .select('*, users!payments_student_id_fkey(name,phone)')
    .single();

  if (error) return res.status(400).json({ error: error.message });

  await notifyN8n({
    event: 'payment_approved',
    student_name: data.users?.name,
    student_phone: data.users?.phone,
    amount: data.amount,
    concept: data.concept,
    paid_at: data.paid_at,
  });

  res.status(201).json(data);
});

async function notifyN8n(payload) {
  if (!process.env.N8N_WEBHOOK_URL) return;
  try {
    await fetch(process.env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('n8n notification error:', err.message);
  }
}

module.exports = router;
