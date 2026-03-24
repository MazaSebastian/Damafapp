-- ============================================================
-- 🔍 DIAGNÓSTICO DE BASE DE DATOS — SOLO LECTURA
-- Este script NO modifica nada. Solo reporta el estado actual.
-- Correr en Supabase SQL Editor para investigar.
-- ============================================================

-- 1. ¿Qué tablas existen en el schema public?
SELECT 
    table_name,
    (SELECT count(*) FROM information_schema.columns c 
     WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
