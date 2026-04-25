import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schema = readFileSync("supabase/schema.sql", "utf8");
const eventActions = readFileSync("lib/actions/event-management.ts", "utf8");
const queries = readFileSync("lib/supabase/queries.ts", "utf8");

test("schema expoe RPCs transacionais para venda com attendees", () => {
  assert.match(schema, /create or replace function public\.create_sale_with_attendees/);
  assert.match(schema, /create or replace function public\.update_sale_with_attendees/);
  assert.match(schema, /insert into public\.sales/);
  assert.match(schema, /insert into public\.sale_attendees/);
  assert.match(schema, /inserted_attendee_count <> p_quantity/);
  assert.match(schema, /raise exception 'A venda foi recusada/);
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
