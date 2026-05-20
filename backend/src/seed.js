require('dotenv').config();
const bcrypt   = require('bcryptjs');
const supabase = require('./supabase');

async function seed() {
  console.log('Seeding database...');

  const pin_hash = await bcrypt.hash('1234', 10);

  const { data: prof, error: e1 } = await supabase
    .from('users')
    .upsert({ dni: '00000001', pin_hash, name: 'Profesor Admin', role: 'profesor', belt: 'negro', stripe: 4 }, { onConflict: 'dni' })
    .select()
    .single();
  if (e1) { console.error('Professor:', e1.message); process.exit(1); }
  console.log('Professor created:', prof.name);

  const students = [
    { dni: '12345678', name: 'Juan Pérez',     belt: 'azul',   stripe: 2 },
    { dni: '87654321', name: 'María González', belt: 'blanco', stripe: 0 },
    { dni: '11223344', name: 'Carlos López',   belt: 'morado', stripe: 1 },
  ];

  for (const s of students) {
    const ph = await bcrypt.hash('1234', 10);
    const { error } = await supabase
      .from('users')
      .upsert({ ...s, pin_hash: ph, role: 'alumno' }, { onConflict: 'dni' });
    if (error) console.error(`Student ${s.name}:`, error.message);
    else console.log('Student created:', s.name);
  }

  // Add sample schedule
  const { data: bjj } = await supabase.from('class_types').select('id').eq('name','BJJ').single();
  if (bjj) {
    await supabase.from('schedules').insert([
      { class_type_id: bjj.id, professor_id: prof.id, day_of_week: 1, start_time: '19:00', end_time: '20:30', location: 'Mat Principal' },
      { class_type_id: bjj.id, professor_id: prof.id, day_of_week: 3, start_time: '19:00', end_time: '20:30', location: 'Mat Principal' },
      { class_type_id: bjj.id, professor_id: prof.id, day_of_week: 5, start_time: '10:00', end_time: '11:30', location: 'Mat Principal' },
    ]);
    console.log('Schedules created');
  }

  console.log('\nSeed complete! Default PIN for all users: 1234');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
