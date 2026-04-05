"use client";

import { useState } from "react";
import {
  Bell,
  ChartSpline,
  Crown,
  DollarSign,
  LayoutDashboard,
  ListTodo,
  Ticket,
  Users
} from "lucide-react";
import Link from "next/link";
import { EventHeader } from "@/components/event-header";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { AnnouncementPanel } from "@/components/panels/announcement-panel";
import { DashboardOverview } from "@/components/panels/dashboard-overview";
import { FinancePanel } from "@/components/panels/finance-panel";
import { InsightsPanel } from "@/components/panels/insights-panel";
import { RankingPanel } from "@/components/panels/ranking-panel";
import { SalesControlPanel } from "@/components/panels/sales-control-panel";
import { TasksPanel } from "@/components/panels/tasks-panel";
import { TeamPanel } from "@/components/panels/team-panel";
import { PartyEventDetail } from "@/lib/types";

const baseNavItems = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "ranking", label: "Ranking", icon: Crown },
  { id: "sales", label: "Vendas", icon: Ticket },
  { id: "team", label: "Equipe", icon: Users },
  { id: "finance", label: "Financeiro", icon: DollarSign },
  { id: "tasks", label: "Tarefas", icon: ListTodo },
  { id: "announcements", label: "Comunicados", icon: Bell },
  { id: "insights", label: "Insights", icon: ChartSpline }
] as const;

type TabId = (typeof baseNavItems)[number]["id"];

export function EventDashboardShell({ event }: { event: PartyEventDetail }) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [period, setPeriod] = useState<"week" | "total">("week");
  const navItems = event.permissions.canManageTeam
    ? baseNavItems
    : baseNavItems.filter((item) => item.id !== "team");

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 pb-28 pt-4 sm:px-6 lg:px-8">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-72 shrink-0 overflow-hidden rounded-[28px] border border-white/60 bg-white/75 p-4 shadow-soft backdrop-blur xl:block">
          <div className="flex h-full flex-col">
            <div className="mb-8 rounded-[24px] bg-hero p-5">
              <span className="mb-3 inline-flex rounded-full border border-brand-200 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                Gestao do evento
              </span>
              <h2 className="font-[var(--font-heading)] text-2xl font-bold tracking-tight text-slate-900">
                {event.name}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Navegue entre financeiro, operacao comercial, tarefas e historico desta festa.
              </p>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                      isActive
                        ? "bg-slate-900 text-white shadow-lg"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Atalhos</p>
              <div className="mt-4 space-y-2">
                <Link
                  href="/"
                  className="flex rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Voltar para lista de festas
                </Link>
                <Link
                  href="/historico"
                  className="flex rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Ver festas passadas
                </Link>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <EventHeader event={event} />

          <div className="mt-6 space-y-6">
            {(activeTab === "overview" || activeTab === "ranking") && (
              <RankingPanel
                ranking={event.ranking}
                period={period}
                onPeriodChange={setPeriod}
                compact={activeTab === "overview"}
              />
            )}

            {activeTab === "overview" && <DashboardOverview data={event} />}
            {activeTab === "sales" && (
              <SalesControlPanel
                eventId={event.id}
                sales={event.salesControl}
                permissions={event.permissions}
                sellerOptions={event.sellerOptions}
              />
            )}
            {activeTab === "team" && (
              <TeamPanel
                eventId={event.id}
                permissions={event.permissions}
                teamMembers={event.teamMembers}
                availableUsers={event.availableUsers}
              />
            )}
            {activeTab === "finance" && (
              <FinancePanel
                eventId={event.id}
                permissions={event.permissions}
                totalRevenue={event.totalRevenue}
                totalExpenses={event.totalExpenses}
                estimatedProfit={event.estimatedProfit}
                pendingPaymentsCount={event.pendingPaymentsCount}
                confirmedPaymentsCount={event.confirmedPaymentsCount}
                expenses={event.expenses}
                transfersPending={event.transfersPending}
              />
            )}
            {activeTab === "tasks" && (
              <TasksPanel
                eventId={event.id}
                tasks={event.tasks}
                participantOptions={event.participantOptions}
                permissions={event.permissions}
              />
            )}
            {activeTab === "announcements" && (
              <AnnouncementPanel
                eventId={event.id}
                announcements={event.announcements}
                permissions={event.permissions}
              />
            )}
            {activeTab === "insights" && (
              <InsightsPanel event={event} />
            )}

            {activeTab === "overview" && (
              <>
                <SalesControlPanel
                  eventId={event.id}
                  sales={event.salesControl.slice(0, 4)}
                  permissions={event.permissions}
                  sellerOptions={event.sellerOptions}
                  compact
                />
                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <FinancePanel
                    eventId={event.id}
                    permissions={event.permissions}
                    totalRevenue={event.totalRevenue}
                    totalExpenses={event.totalExpenses}
                    estimatedProfit={event.estimatedProfit}
                    pendingPaymentsCount={event.pendingPaymentsCount}
                    confirmedPaymentsCount={event.confirmedPaymentsCount}
                    expenses={event.expenses}
                    transfersPending={event.transfersPending}
                    compact
                  />
                  <TasksPanel
                    eventId={event.id}
                    tasks={event.tasks}
                    participantOptions={event.participantOptions}
                    permissions={event.permissions}
                    compact
                  />
                </div>
                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <AnnouncementPanel
                    eventId={event.id}
                    announcements={event.announcements}
                    permissions={event.permissions}
                    compact
                  />
                  <InsightsPanel
                    event={event}
                    compact
                  />
                </div>
              </>
            )}

            {activeTab === "ranking" && event.ranking.length > 0 && (
              <div className="rounded-[28px] border border-white/60 bg-white/85 p-5 text-sm text-slate-500 shadow-soft backdrop-blur sm:p-6">
                O filtro de periodo ja esta preparado para trocar entre recortes semanais e totais quando os dados vierem do backend.
              </div>
            )}
          </div>
        </div>
      </div>

      <MobileTabBar
        items={navItems.map((item) => ({ ...item }))}
        activeTab={activeTab}
        onSelect={(tab) => setActiveTab(tab as TabId)}
      />
    </main>
  );
}
