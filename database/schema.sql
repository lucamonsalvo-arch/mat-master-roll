-- Mat Master Roll - Supabase Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS ───────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dni         VARCHAR(20) UNIQUE NOT NULL,
  pin_hash    TEXT NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('alumno', 'profesor')),
  belt        TEXT DEFAULT 'blanco' CHECK (belt IN ('blanco','azul','morado','marron','negro')),
  stripe      INTEGER DEFAULT 0 CHECK (stripe BETWEEN 0 AND 4),
  phone       TEXT,
  email       TEXT,
  photo_url   TEXT,
  birth_date  DATE,
  join_date   DATE DEFAULT CURRENT_DATE,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CLASS TYPES ─────────────────────────────────────────────────────────────
CREATE TABLE class_types (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT UNIQUE NOT NULL,
  color       TEXT DEFAULT '#3B82F6',
  active      BOOLEAN DEFAULT TRUE
);

INSERT INTO class_types (name, color) VALUES
  ('BJJ',                    '#1D4ED8'),
  ('NoGi',                   '#7C3AED'),
  ('BJJ Adolescentes',       '#059669'),
  ('BJJ Femenino',           '#DB2777'),
  ('BJJ Mixto',              '#D97706'),
  ('BJJ Infantil A',         '#DC2626'),
  ('BJJ Infantil B',         '#EA580C'),
  ('Entrenamiento Personalizado', '#0891B2');

-- ─── SCHEDULES ───────────────────────────────────────────────────────────────
CREATE TABLE schedules (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_type_id   UUID NOT NULL REFERENCES class_types(id),
  professor_id    UUID REFERENCES users(id),
  day_of_week     INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun,1=Mon,...
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  location        TEXT DEFAULT 'Mat Principal',
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── STUDENT SCHEDULES (enrollment) ──────────────────────────────────────────
CREATE TABLE student_schedules (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  active      BOOLEAN DEFAULT TRUE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, schedule_id)
);

-- ─── ATTENDANCE ───────────────────────────────────────────────────────────────
CREATE TABLE attendance (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  class_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  marked_by   UUID REFERENCES users(id),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, schedule_id, class_date)
);

-- ─── PAYMENTS ─────────────────────────────────────────────────────────────────
CREATE TABLE payments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount            NUMERIC(10,2) NOT NULL,
  concept           TEXT NOT NULL,
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  mp_preference_id  TEXT,
  mp_payment_id     TEXT,
  mp_external_ref   TEXT UNIQUE DEFAULT uuid_generate_v4()::TEXT,
  due_date          DATE,
  paid_at           TIMESTAMPTZ,
  month             INTEGER,
  year              INTEGER,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ACCESS LOG ───────────────────────────────────────────────────────────────
CREATE TABLE access_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id),
  action      TEXT NOT NULL,
  details     JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
CREATE INDEX idx_attendance_student   ON attendance(student_id);
CREATE INDEX idx_attendance_date      ON attendance(class_date);
CREATE INDEX idx_attendance_schedule  ON attendance(schedule_id);
CREATE INDEX idx_payments_student     ON payments(student_id);
CREATE INDEX idx_payments_status      ON payments(status);
CREATE INDEX idx_student_schedules    ON student_schedules(student_id);
CREATE INDEX idx_access_log_user      ON access_log(user_id);
CREATE INDEX idx_access_log_created   ON access_log(created_at);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
-- Disable RLS for server-side access (backend uses service role key)
ALTER TABLE users             DISABLE ROW LEVEL SECURITY;
ALTER TABLE class_types       DISABLE ROW LEVEL SECURITY;
ALTER TABLE schedules         DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance        DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments          DISABLE ROW LEVEL SECURITY;
ALTER TABLE access_log        DISABLE ROW LEVEL SECURITY;

-- ─── SEED: Default professor ──────────────────────────────────────────────────
-- PIN: 1234 → bcrypt hash (regenerate in production)
-- INSERT INTO users (dni, pin_hash, name, role, belt)
-- VALUES ('00000000', '$2b$10$...', 'Profesor Admin', 'profesor', 'negro');
