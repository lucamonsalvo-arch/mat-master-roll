const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const supabase = require('../supabase');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { dni, pin } = req.body;
  if (!dni || !pin) return res.status(400).json({ error: 'DNI y PIN requeridos' });

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('dni', dni.trim())
    .eq('active', true)
    .single();

  if (error || !user) return res.status(401).json({ error: 'Credenciales inválidas' });

  const valid = await bcrypt.compare(String(pin), user.pin_hash);
  if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

  // Log access
  await supabase.from('access_log').insert({
    user_id: user.id,
    action: 'login',
    details: { dni, role: user.role },
    ip_address: req.ip,
  });

  const token = jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const { pin_hash: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// POST /api/auth/me  – refresh user data
router.get('/me', async (req, res) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token' });
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const { data: user } = await supabase
      .from('users').select('*').eq('id', payload.id).single();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const { pin_hash: _, ...safeUser } = user;
    res.json(safeUser);
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
});

module.exports = router;
