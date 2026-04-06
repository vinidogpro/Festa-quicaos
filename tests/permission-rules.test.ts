import test from "node:test";
import assert from "node:assert/strict";
import { buildPermissionSnapshot } from "../lib/permission-rules.ts";

test("host global mantem acesso total", () => {
  const permissions = buildPermissionSnapshot("host", undefined, "host-user");

  assert.equal(permissions.canCreateEvents, true);
  assert.equal(permissions.canManageEvent, true);
  assert.equal(permissions.canManageSales, true);
  assert.equal(permissions.canManageFinance, true);
  assert.equal(permissions.canManageOwnSalesOnly, false);
  assert.equal(permissions.sellerUserId, undefined);
});

test("organizer gerencia a operacao da festa sem virar host global", () => {
  const permissions = buildPermissionSnapshot("seller", "organizer", "organizer-user");

  assert.equal(permissions.canCreateEvents, false);
  assert.equal(permissions.canManageEvent, false);
  assert.equal(permissions.canManageTeam, true);
  assert.equal(permissions.canManageSales, true);
  assert.equal(permissions.canManageFinance, true);
  assert.equal(permissions.canViewActivityLog, false);
});

test("seller fica restrito ao proprio escopo local", () => {
  const permissions = buildPermissionSnapshot("seller", "seller", "seller-user");

  assert.equal(permissions.canManageSales, true);
  assert.equal(permissions.canManageFinance, false);
  assert.equal(permissions.canManageTasks, false);
  assert.equal(permissions.canManageAnnouncements, false);
  assert.equal(permissions.canManageOwnSalesOnly, true);
  assert.equal(permissions.sellerUserId, "seller-user");
});
