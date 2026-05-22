require('dotenv').config();
const bcrypt   = require('bcryptjs');
const supabase = require('./supabase');

async function seed() {
  console.log('🥋 Mat Master Roll — Seed completo\n');
  const pin_hash = await bcrypt.hash('1234', 10);

  // ── 1. Profesor ──────────────────────────────────────────────────────────
  const { data: prof, error: e0 } = await supabase
    .from('users')
    .upsert({ dni:'00000001', pin_hash, name:'Profesor Admin', role:'profesor', belt:'negro', stripe:4 }, { onConflict:'dni' })
    .select().single();
  if (e0) { console.error('Profesor:', e0.message); process.exit(1); }
  console.log('✅ Profesor:', prof.name);

  // ── 2. Class types ────────────────────────────────────────────────────────
  const CT_DEFS = [
    { name:'BJJ',      color:'#ef4444' },
    { name:'NoGi',     color:'#3b82f6' },
    { name:'Femenino', color:'#ec4899' },
    { name:'Fitness',  color:'#22c55e' },
  ];
  const ctMap = {}; // name -> id
  for (const ct of CT_DEFS) {
    const { data } = await supabase
      .from('class_types')
      .upsert({ name:ct.name, color:ct.color, active:true }, { onConflict:'name' })
      .select('id,name').single();
    ctMap[ct.name] = data.id;
  }
  console.log('✅ Class types:', Object.keys(ctMap).join(', '));

  // ── 3. Schedules ──────────────────────────────────────────────────────────
  const SC_DEFS = [
    { type:'BJJ',      dow:1, start:'19:00', end:'20:30', loc:'Mat Principal' },
    { type:'BJJ',      dow:3, start:'19:00', end:'20:30', loc:'Mat Principal' },
    { type:'BJJ',      dow:5, start:'10:00', end:'11:30', loc:'Mat Principal' },
    { type:'NoGi',     dow:2, start:'20:00', end:'21:00', loc:'Mat Principal' },
    { type:'NoGi',     dow:4, start:'20:00', end:'21:00', loc:'Mat Principal' },
    { type:'Femenino', dow:1, start:'18:00', end:'19:00', loc:'Mat Femenino'  },
    { type:'Femenino', dow:3, start:'18:00', end:'19:00', loc:'Mat Femenino'  },
    { type:'Fitness',  dow:6, start:'10:00', end:'11:00', loc:'Sala de pesas' },
  ];
  const scheduleMap = {};   // type -> [id, ...]
  const schedIdToDow = {};  // id   -> dow

  for (const def of SC_DEFS) {
    const { data: existing } = await supabase
      .from('schedules').select('id')
      .eq('class_type_id', ctMap[def.type])
      .eq('day_of_week', def.dow)
      .eq('start_time', def.start)
      .maybeSingle();

    let sid;
    if (existing) {
      sid = existing.id;
    } else {
      const { data: created } = await supabase
        .from('schedules')
        .insert({ class_type_id:ctMap[def.type], professor_id:prof.id, day_of_week:def.dow,
                  start_time:def.start, end_time:def.end, location:def.loc, active:true })
        .select('id').single();
      sid = created.id;
    }
    if (!scheduleMap[def.type]) scheduleMap[def.type] = [];
    scheduleMap[def.type].push(sid);
    schedIdToDow[sid] = def.dow;
  }
  console.log('✅ Horarios:', Object.entries(scheduleMap).map(([k,v])=>`${k}(${v.length})`).join(', '));

  // ── 4. Student definitions ────────────────────────────────────────────────
  // pattern: regular ~82%, irregular ~48%, rare ~18%
  // paid: pagó la cuota del mes corriente
  const DEFS = [
    // ── BLANCOS ──
    { dni:'30000001', name:'Santiago Pérez',     belt:'blanco', stripe:0, phone:'+54 9 351 456 7890', birth:'1999-03-15', join:'2025-01-10', pattern:'regular',   paid:true,  classes:['BJJ','NoGi']               },
    { dni:'30000002', name:'Valentina García',   belt:'blanco', stripe:1, phone:'+54 9 11 4523 7801', birth:'1997-07-22', join:'2024-08-05', pattern:'irregular', paid:false, classes:['BJJ','Femenino']           },
    { dni:'30000003', name:'Facundo Rodríguez',  belt:'blanco', stripe:0, phone:'+54 9 351 234 5678', birth:'2003-11-08', join:'2025-03-20', pattern:'rare',      paid:false, classes:['BJJ']                      },
    { dni:'30000004', name:'Camila López',       belt:'blanco', stripe:2, phone:'+54 9 11 5500 1234', birth:'2001-04-30', join:'2024-06-15', pattern:'regular',   paid:true,  classes:['BJJ','Femenino','Fitness']  },
    { dni:'30000005', name:'Tomás Martínez',     belt:'blanco', stripe:0, phone:'+54 9 351 789 0123', birth:'2004-01-17', join:'2025-02-01', pattern:'rare',      paid:false, classes:['BJJ']                      },
    { dni:'30000006', name:'Lucía Fernández',    belt:'blanco', stripe:1, phone:'+54 9 11 3367 8901', birth:'1999-09-05', join:'2024-09-10', pattern:'regular',   paid:true,  classes:['Femenino','BJJ']           },
    { dni:'30000007', name:'Ignacio Romero',     belt:'blanco', stripe:0, phone:'+54 9 351 901 2345', birth:'2005-06-20', join:'2025-04-03', pattern:'rare',      paid:false, classes:['BJJ']                      },
    { dni:'30000008', name:'Sofía Sánchez',      belt:'blanco', stripe:3, phone:'+54 9 11 2211 5678', birth:'2000-12-01', join:'2024-03-22', pattern:'irregular', paid:false, classes:['Femenino']                  },
    { dni:'30000009', name:'Agustín Torres',     belt:'blanco', stripe:0, phone:'+54 9 351 123 4567', birth:'2006-02-14', join:'2025-01-28', pattern:'regular',   paid:true,  classes:['BJJ','NoGi']               },
    { dni:'30000010', name:'Natalia Ruiz',       belt:'blanco', stripe:1, phone:'+54 9 11 7890 2345', birth:'1997-08-25', join:'2024-07-08', pattern:'rare',      paid:false, classes:['Femenino','BJJ']           },
    { dni:'30000011', name:'Ramiro Flores',      belt:'blanco', stripe:2, phone:'+54 9 351 567 8901', birth:'2002-05-10', join:'2024-11-15', pattern:'regular',   paid:true,  classes:['BJJ']                      },
    { dni:'30000012', name:'Florencia Díaz',     belt:'blanco', stripe:0, phone:'+54 9 11 6601 3456', birth:'2000-10-03', join:'2025-02-14', pattern:'irregular', paid:false, classes:['Femenino','Fitness']        },
    { dni:'30000013', name:'Joaquín Morales',    belt:'blanco', stripe:1, phone:'+54 9 351 345 6789', birth:'2003-07-18', join:'2024-12-01', pattern:'rare',      paid:false, classes:['BJJ']                      },
    { dni:'30000014', name:'Daniela Gómez',      belt:'blanco', stripe:0, phone:'+54 9 11 4412 7890', birth:'1996-03-27', join:'2024-10-20', pattern:'irregular', paid:true,  classes:['Femenino','BJJ']           },
    // ── AZULES ──
    { dni:'30000015', name:'Diego Suárez',       belt:'azul',   stripe:0, phone:'+54 9 351 678 9012', birth:'1994-11-14', join:'2022-03-10', pattern:'regular',   paid:true,  classes:['BJJ','NoGi']               },
    { dni:'30000016', name:'Romina Medina',      belt:'azul',   stripe:1, phone:'+54 9 11 5523 4567', birth:'1993-04-08', join:'2021-08-20', pattern:'irregular', paid:false, classes:['BJJ','Femenino']           },
    { dni:'30000017', name:'Nicolás Herrera',    belt:'azul',   stripe:2, phone:'+54 9 351 012 3456', birth:'1995-09-21', join:'2022-01-05', pattern:'regular',   paid:true,  classes:['BJJ','NoGi','Fitness']     },
    { dni:'30000018', name:'Carolina Castro',    belt:'azul',   stripe:0, phone:'+54 9 11 3345 6789', birth:'1991-01-30', join:'2023-06-15', pattern:'rare',      paid:false, classes:['Femenino']                  },
    { dni:'30000019', name:'Matías Ortega',      belt:'azul',   stripe:3, phone:'+54 9 351 456 7891', birth:'1992-07-15', join:'2020-11-01', pattern:'regular',   paid:true,  classes:['BJJ','NoGi']               },
    { dni:'30000020', name:'Paola Vargas',       belt:'azul',   stripe:1, phone:'+54 9 11 2201 2345', birth:'1990-05-22', join:'2022-09-08', pattern:'irregular', paid:true,  classes:['BJJ','Femenino']           },
    { dni:'30000021', name:'Sebastián Silva',    belt:'azul',   stripe:2, phone:'+54 9 351 789 0124', birth:'1988-12-07', join:'2021-04-18', pattern:'regular',   paid:true,  classes:['BJJ']                      },
    { dni:'30000022', name:'Verónica Aguirre',   belt:'azul',   stripe:0, phone:'+54 9 11 7712 3456', birth:'1993-08-19', join:'2023-02-27', pattern:'irregular', paid:false, classes:['Femenino','BJJ']           },
    { dni:'30000023', name:'Federico Cabrera',   belt:'azul',   stripe:4, phone:'+54 9 351 234 5679', birth:'1989-02-28', join:'2019-07-12', pattern:'regular',   paid:true,  classes:['BJJ','NoGi']               },
    { dni:'30000024', name:'Jimena Vázquez',     belt:'azul',   stripe:1, phone:'+54 9 11 4489 0123', birth:'1995-06-11', join:'2023-04-03', pattern:'rare',      paid:false, classes:['Femenino']                  },
    // ── MORADOS ──
    { dni:'30000025', name:'Gonzalo Álvarez',    belt:'morado', stripe:1, phone:'+54 9 351 901 2346', birth:'1987-04-03', join:'2016-09-01', pattern:'regular',   paid:true,  classes:['BJJ','NoGi','Fitness']     },
    { dni:'30000026', name:'Gabriela Rojas',     belt:'morado', stripe:0, phone:'+54 9 11 6634 5678', birth:'1986-10-16', join:'2017-02-14', pattern:'regular',   paid:true,  classes:['BJJ','Femenino']           },
    { dni:'30000027', name:'Luciano Delgado',    belt:'morado', stripe:2, phone:'+54 9 351 123 4568', birth:'1984-07-29', join:'2015-11-20', pattern:'irregular', paid:false, classes:['BJJ','NoGi']               },
    // ── MARRONES ──
    { dni:'30000028', name:'Alejandro Reyes',    belt:'marron', stripe:1, phone:'+54 9 11 5501 2345', birth:'1982-01-12', join:'2012-03-05', pattern:'regular',   paid:true,  classes:['BJJ','NoGi','Fitness']     },
    { dni:'30000029', name:'Cecilia Benítez',    belt:'marron', stripe:3, phone:'+54 9 351 567 8902', birth:'1980-09-05', join:'2011-07-18', pattern:'regular',   paid:true,  classes:['BJJ','Femenino']           },
    // ── NEGRO ──
    { dni:'30000030', name:'Carlos Gutiérrez',   belt:'negro',  stripe:2, phone:'+54 9 11 3378 9012', birth:'1978-03-20', join:'2007-05-10', pattern:'regular',   paid:true,  classes:['BJJ','NoGi']               },
  ];

  // ── 5. Upsert students ────────────────────────────────────────────────────
  const students = [];
  for (const def of DEFS) {
    const ph = await bcrypt.hash('1234', 10);
    const { data, error } = await supabase
      .from('users')
      .upsert({
        dni:def.dni, pin_hash:ph, name:def.name, role:'alumno',
        belt:def.belt, stripe:def.stripe, phone:def.phone,
        birth_date:def.birth, join_date:def.join, active:true,
      }, { onConflict:'dni' })
      .select('id').single();
    if (error) { console.error(`  ❌ ${def.name}:`, error.message); continue; }
    students.push({ id:data.id, ...def });
    process.stdout.write('.');
  }
  console.log(`\n✅ ${students.length} atletas`);

  // ── 6. Enrollments ────────────────────────────────────────────────────────
  const allIds = students.map(s => s.id);
  await supabase.from('student_schedules').delete().in('student_id', allIds);

  const enrollRows = [];
  for (const s of students) {
    for (const className of s.classes) {
      for (const sid of (scheduleMap[className] || [])) {
        enrollRows.push({ student_id:s.id, schedule_id:sid, active:true });
      }
    }
  }
  if (enrollRows.length) await supabase.from('student_schedules').insert(enrollRows);
  console.log(`✅ ${enrollRows.length} inscripciones`);

  // ── 7. Attendance (last 90 days) ──────────────────────────────────────────
  function pastDates(dow, daysBack = 90) {
    const out = [];
    const d = new Date();
    d.setDate(d.getDate() - 1);
    for (let i = 0; i < daysBack; i++) {
      if (d.getDay() === dow) out.push(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() - 1);
    }
    return out;
  }

  const RATES = { regular:0.82, irregular:0.48, rare:0.18 };
  await supabase.from('attendance').delete().in('student_id', allIds);

  const attRows = [];
  for (const s of students) {
    const rate = RATES[s.pattern];
    for (const className of s.classes) {
      for (const sid of (scheduleMap[className] || [])) {
        const dow = schedIdToDow[sid];
        for (const date of pastDates(dow, 90)) {
          if (Math.random() < rate) {
            attRows.push({ student_id:s.id, schedule_id:sid, class_date:date, marked_by:prof.id });
          }
        }
      }
    }
  }

  const BATCH = 200;
  for (let i = 0; i < attRows.length; i += BATCH) {
    await supabase.from('attendance')
      .upsert(attRows.slice(i, i + BATCH), { onConflict:'student_id,schedule_id,class_date' });
    process.stdout.write('.');
  }
  console.log(`\n✅ ${attRows.length} registros de asistencia`);

  // ── 8. Payments (current month) ───────────────────────────────────────────
  await supabase.from('payments').delete().in('student_id', allIds);

  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  const payRows = students.filter(s => s.paid).map(s => ({
    student_id : s.id,
    amount     : 15000,
    concept    : 'Mensualidad',
    month, year,
    method     : Math.random() > 0.5 ? 'efectivo' : 'transferencia',
    status     : 'approved',
    paid_at    : new Date(year, month - 1, Math.floor(Math.random() * 18) + 1).toISOString(),
  }));

  if (payRows.length) await supabase.from('payments').insert(payRows);
  const debtors = students.filter(s => !s.paid).length;
  console.log(`✅ ${payRows.length} pagos aprobados | ${debtors} deudores`);

  console.log('\n🥋 Seed completo. PIN universal: 1234');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
