-- ════════════════════════════════════════════════════════════════
-- NETHAJI BOYS MANDRAM — Clean up all demo accounts and demo data
-- ════════════════════════════════════════════════════════════════

delete from auth.users where email like '%@nbm.demo';
delete from public.users where email like '%@nbm.demo';
