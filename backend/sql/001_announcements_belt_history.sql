-- Run this in Supabase SQL Editor

create table if not exists announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text,
  professor_id uuid references users(id) on delete set null,
  pinned     boolean default false,
  active     boolean default true,
  created_at timestamptz default now()
);

create table if not exists belt_history (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid references users(id) on delete cascade,
  belt        text not null,
  stripe      integer default 0,
  notes       text,
  promoted_at date default current_date,
  created_at  timestamptz default now()
);
