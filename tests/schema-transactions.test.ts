import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schema = readFileSync("supabase/schema.sql", "utf8");
const rpcSync = readFileSync("supabase/rpc-sync.sql", "utf8");
const eventActions = readFileSync("lib/actions/event-management.ts", "utf8");
const queries = readFileSync("lib/supabase/queries.ts", "utf8");
const backupExportRoute = readFileSync("app/festas/[id]/backup/export/route.ts", "utf8");

test("schema expoe RPCs transacionais para venda com attendees", () => {
  assert.match(schema, /create or replace function public\.create_sale_with_attendees/);
  assert.match(schema, /create or replace function public\.update_sale_with_attendees/);
  assert.match(schema, /insert into public\.sales/);
  assert.match(schema, /insert into public\.sale_attendees/);
  assert.match(schema, /inserted_attendee_count <> p_quantity/);
  assert.match(schema, /raise exception 'A venda foi recusada/);
});

test("arquivo de sincronizacao RPC recria funcoes, grants e recarrega cache", () => {
  assert.match(rpcSync, /create or replace function public\.create_event_with_config/);
  assert.match(rpcSync, /create or replace function public\.create_sale_with_attendees/);
  assert.match(rpcSync, /create or replace function public\.update_sale_with_attendees/);
  assert.match(rpcSync, /grant execute on function public\.create_sale_with_attendees/);
  assert.match(rpcSync, /grant execute on function public\.update_sale_with_attendees/);
  assert.match(rpcSync, /notify pgrst, 'reload schema'/);
});

test("actions usam RPC transacional em vez de rollback manual para venda", () => {
  assert.match(eventActions, /rpc\("create_sale_with_attendees"/);
  assert.match(eventActions, /rpc\("update_sale_with_attendees"/);
  assert.doesNotMatch(eventActions, /replaceSaleAttendees/);
  assert.doesNotMatch(eventActions, /restoreSaleAttendees/);
});

test("schema expoe RPC transacional para criar festa com host e lotes", () => {
  assert.match(schema, /create or replace function public\.create_event_with_config/);
  assert.match(schema, /insert into public\.events/);
  assert.match(schema, /insert into public\.event_memberships/);
  assert.match(schema, /insert into public\.event_batches/);
  assert.match(eventActions, /rpc\("create_event_with_config"/);
});

test("queries principais checam erros de Supabase antes de montar relatorios", () => {
  assert.match(queries, /salesError \|\| expensesError \|\| additionalRevenuesError \|\| membershipsError/);
  assert.match(queries, /eventBatchesError \|\| salesError \|\| expensesError \|\| additionalRevenuesError/);
  assert.match(queries, /throw new Error\(/);
});

test("schema e actions suportam fechamento operacional da festa", () => {
  assert.match(schema, /closed_at timestamptz/);
  assert.match(schema, /closed_by uuid references public\.profiles/);
  assert.match(eventActions, /updateEventClosureAction/);
  assert.match(eventActions, /assertCanMutateClosedEvent/);
  assert.match(eventActions, /Apenas host ou organizador podem fazer correcoes pos-evento/);
});

test("exportacao de backup completo inclui dados operacionais e financeiros", () => {
  assert.match(backupExportRoute, /backupVersion/);
  assert.match(backupExportRoute, /event_memberships/);
  assert.match(backupExportRoute, /event_batches/);
  assert.match(backupExportRoute, /sales/);
  assert.match(backupExportRoute, /sale_attendees/);
  assert.match(backupExportRoute, /manual_guest_entries/);
  assert.match(backupExportRoute, /expenses/);
  assert.match(backupExportRoute, /additional_revenues/);
  assert.match(backupExportRoute, /activity_logs/);
});
