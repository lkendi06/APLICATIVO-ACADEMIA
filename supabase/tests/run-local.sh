#!/usr/bin/env bash
# Aplica as migrations + seed em um banco PostgreSQL limpo e roda os testes de RLS.
# Uso: DATABASE_URL=postgres://postgres@localhost:5432/postgres bash supabase/tests/run-local.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
DB_URL="${DATABASE_URL:-postgres://postgres@localhost:5432/postgres}"
DB_NAME="fittrack_test"
ADMIN_URL="$DB_URL"
TEST_URL="${DB_URL%/*}/$DB_NAME"

psql "$ADMIN_URL" -q -v ON_ERROR_STOP=1 -c "drop database if exists $DB_NAME" -c "create database $DB_NAME"
psql "$TEST_URL" -q -v ON_ERROR_STOP=1 -f supabase/tests/stubs.sql
for f in supabase/migrations/*.sql; do
  echo "→ $f"
  psql "$TEST_URL" -q -v ON_ERROR_STOP=1 -f "$f"
done
echo "→ supabase/seed.sql"
psql "$TEST_URL" -q -v ON_ERROR_STOP=1 -f supabase/seed.sql
psql "$TEST_URL" -q -t -A -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql 2>&1 | sed -e "s/^psql:[^:]*:[0-9]*: NOTICE:  /  /" -e "/^$/d"
