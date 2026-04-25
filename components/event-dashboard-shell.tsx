"use client";

import { useEffect, useState } from "react";
import {
  History,
  Bell,
  ChartSpline,
  ClipboardList,
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
import { ActivityLogPanel } from "@/components/panels/activity-log-panel";
import { DashboardOverview } from "@/components/panels/dashboard-overview";
import { FinancePanel } from "@/components/panels/finance-panel";
import { GuestListPanel } from "@/components/panels/guest-list-panel";
import { InsightsPanel } from "@/components/panels/insights-panel";
import { RankingPanel } from "@/components/panels/ranking-panel";
import { SalesControlPanel } from "@/components/panels/sales-control-panel";
import { TasksPanel } from "@/components/panels/tasks-panel";
import { TeamPanel } from "@/components/panels/team-panel";
import { PartyEventDetail } from "@/lib/types";

const baseNavItems = [
  { id: "overview", label: "Resumo", icon: LayoutDashboard },
  { id: "ranking", label: "Ranking", icon: Crown },
  { id: "sales", label: "Vendas", icon: Ticket },
  { id: "guest-list", label: "Lista", icon: ClipboardList },
  { id: "team", label: "Equipe", icon: Users },
  { id: "finance", label: "Financeiro", icon: DollarSign },
  { id: "tasks", label: "Tarefas", icon: ListTodo },
  { id: "announcements", label: "Comunicados", icon: Bell },
  { id: "insights", label: "Desempenho", icon: ChartSpline },
  { id: "activity", label: "Atividades", icon: History }
] as const;

type TabId = (typeof baseNavItems)[number]["id"];

function AsyncSectionState({
  tone,
  message,
  onRetry
}: {
  tone: "loading" | "error";
  message: string;
  onRetry?: () => void;
}) {
  const palette =
    tone === "error"
      ? "border border-rose-200 bg-rose-50 text-rose-700"
      : "border border-white/60 bg-white/85 text-slate-500 backdrop-blur";

  return (
    <div className={`rounded-[28px] p-5 text-sm shadow-soft sm:p-6 ${palette}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>{message}</p>
        {tone === "error" && onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-current/15 bg-white px-4 py-3 text-sm font-semibold transition hover:bg-white/80"
          >
            Tentar novamente
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function EventDashboardShell({ event }: { event: PartyEventDetail }) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [period, setPeriod] = useState<"week" | "total">("week");
  const [teamSection, setTeamSection] = useState<{
    teamMembers: PartyEventDetail["teamMembers"];
    availableUsers: PartyEventDetail["availableUsers"];
  } | null>(null);
  const [teamStatus, setTeamStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [teamError, setTeamError] = useState("");
  const [activitySection, setActivitySection] = useState<{
    activityLogs: PartyEventDetail["activityLogs"];
  } | null>(null);
  const [activityStatus, setActivityStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [activityError, setActivityError] = useState("");
  const [guestListSection, setGuestListSection] = useState<{
    guestListEntries: PartyEventDetail["guestListEntries"];
  } | null>(null);
  const [guestListStatus, setGuestListStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [guestListError, setGuestListError] = useState("");
  const overviewTasksGridClass =
    event.tasks.length >= 4
      ? "lg:grid-cols-[1fr_1fr]"
      : event.tasks.length >= 2
        ? "lg:grid-cols-[1.15fr_0.85fr]"
        : "lg:grid-cols-[1.3fr_0.7fr]";
  const overviewAnnouncementsGridClass =
    event.announcements.length >= 4
      ? "xl:grid-cols-[1fr_1fr]"
      : event.announcements.length >= 2
        ? "xl:grid-cols-[0.95fr_1.05fr]"
        : "xl:grid-cols-[0.78fr_1.22fr]";
  const navItems = baseNavItems.filter((item) => {
    if (item.id === "team" && !event.permissions.canManageTeam) {
      return false;
    }

    if (item.id === "activity" && !event.permissions.canViewActivityLog) {
      return false;
    }

    return true;
  });

  useEffect(() => {
    if (activeTab === "team" && event.permissions.canManageTeam && teamStatus === "idle") {
      setTeamStatus("loading");
      setTeamError("");

      fetch(`/api/events/${event.id}/sections?section=team`, { cache: "no-store" })
        .then(async (response) => {
          const payload = await response.json();

          if (!response.ok) {
            throw new Error(payload.message ?? "Nao foi possivel carregar a equipe.");
          }

          setTeamSection({
            teamMembers: payload.teamMembers ?? [],
            availableUsers: payload.availableUsers ?? []
          });
          setTeamStatus("loaded");
        })
        .catch((error) => {
          setTeamError(error instanceof Error ? error.message : "Nao foi possivel carregar a equipe.");
          setTeamStatus("error");
        });
    }

    if (activeTab === "activity" && event.permissions.canViewActivityLog && activityStatus === "idle") {
      setActivityStatus("loading");
      setActivityError("");

      fetch(`/api/events/${event.id}/sections?section=activity`, { cache: "no-store" })
        .then(async (response) => {
          const payload = await response.json();

          if (!response.ok) {
            throw new Error(payload.message ?? "Nao foi possivel carregar as atividades.");
          }

          setActivitySection({
            activityLogs: payload.activityLogs ?? []
          });
          setActivityStatus("loaded");
        })
        .catch((error) => {
          setActivityError(error instanceof Error ? error.message : "Nao foi possivel carregar as atividades.");
          setActivityStatus("error");
        });
    }

    if (activeTab === "guest-list" && guestListStatus === "idle") {
      setGuestListStatus("loading");
      setGuestListError("");

      fetch(`/api/events/${event.id}/sections?section=guest-list`, { cache: "no-store" })
        .then(async (response) => {
          const payload = await response.json();

          if (!response.ok) {
            throw new Error(payload.message ?? "Nao foi possivel carregar a lista desta festa.");
          }

          setGuestListSection({
            guestListEntries: payload.guestListEntries ?? []
          });
          setGuestListStatus("loaded");
        })
        .catch((error) => {
          setGuestListError(error instanceof Error ? error.message : "Nao foi possivel carregar a lista.");
          setGuestListStatus("error");
        });
    }
  }, [
    activeTab,
    activityStatus,
    event.id,
    event.permissions.canManageTeam,
    event.permissions.canViewActivityLog,
    guestListStatus,
    teamStatus
  ]);

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex max-w-7xl gap-4 px-3 pb-36 pt-3 sm:gap-6 sm:px-6 sm:pb-32 sm:pt-4 lg:px-8">
        <aside className="sticky top-4 hidden h-[calc(100dvh-2rem)] max-h-[calc(100dvh-2rem)] w-72 shrink-0 overflow-hidden rounded-[28px] border border-white/60 bg-white/75 p-4 shadow-soft backdrop-blur xl:block">
          <div className="flex h-full min-h-0 flex-col">
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

            <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
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

            <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
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

          <div className="mt-4 hidden md:block xl:hidden">
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "bg-slate-900 text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 space-y-5 sm:mt-6 sm:space-y-6">
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
                eventBatches={event.eventBatches}
                hasVip={event.hasVip}
                hasGroupSales={event.hasGroupSales}
              />
            )}
            {activeTab === "team" && (
              teamStatus === "loading" ? (
                <AsyncSectionState
                  tone="loading"
                  message="Carregando equipe e usuarios disponiveis desta festa..."
                />
              ) : teamStatus === "error" ? (
                <AsyncSectionState
                  tone="error"
                  message={teamError || "Nao foi possivel carregar a equipe agora."}
                  onRetry={() => {
                    setTeamSection(null);
                    setTeamStatus("idle");
                  }}
                />
              ) : (
                <TeamPanel
                  eventId={event.id}
                  permissions={event.permissions}
                  teamMembers={teamSection?.teamMembers ?? event.teamMembers}
                  availableUsers={teamSection?.availableUsers ?? event.availableUsers}
                />
              )
            )}
            {activeTab === "guest-list" && (
              guestListStatus === "loading" ? (
                <AsyncSectionState tone="loading" message="Carregando lista completa da festa..." />
              ) : guestListStatus === "error" ? (
                <AsyncSectionState
                  tone="error"
                  message={guestListError || "Nao foi possivel carregar a lista agora."}
                  onRetry={() => {
                    setGuestListSection(null);
                    setGuestListStatus("idle");
                  }}
                />
              ) : (
                <GuestListPanel
                  eventId={event.id}
                  entries={guestListSection?.guestListEntries ?? event.guestListEntries}
                  permissions={event.permissions}
                  sellerOptions={event.sellerOptions}
                  eventBatches={event.eventBatches}
                  hasVip={event.hasVip}
                  hasGroupSales={event.hasGroupSales}
                />
              )
            )}
            {activeTab === "finance" && (
                <FinancePanel
                  eventId={event.id}
                  permissions={event.permissions}
                  ticketRevenue={event.ticketRevenue}
                  additionalRevenue={event.additionalRevenue}
                  totalRevenue={event.totalRevenue}
                  totalExpenses={event.totalExpenses}
                  estimatedProfit={event.estimatedProfit}
                  sales={event.salesControl}
                  expenses={event.expenses}
                  additionalRevenues={event.additionalRevenues}
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
            {activeTab === "activity" && (
              activityStatus === "loading" ? (
                <AsyncSectionState tone="loading" message="Carregando historico de atividades..." />
              ) : activityStatus === "error" ? (
                <AsyncSectionState
                  tone="error"
                  message={activityError || "Nao foi possivel carregar as atividades agora."}
                  onRetry={() => {
                    setActivitySection(null);
                    setActivityStatus("idle");
                  }}
                />
              ) : (
                <ActivityLogPanel logs={activitySection?.activityLogs ?? event.activityLogs} permissions={event.permissions} />
              )
            )}

            {activeTab === "overview" && (
              <>
                <SalesControlPanel
                  eventId={event.id}
                  sales={event.salesControl.slice(0, 4)}
                  permissions={event.permissions}
                  sellerOptions={event.sellerOptions}
                  eventBatches={event.eventBatches}
                  hasVip={event.hasVip}
                  hasGroupSales={event.hasGroupSales}
                  compact
                />
                <div className={`grid gap-6 ${overviewTasksGridClass}`}>
                  <FinancePanel
                    eventId={event.id}
                    permissions={event.permissions}
                  ticketRevenue={event.ticketRevenue}
                  additionalRevenue={event.additionalRevenue}
                  totalRevenue={event.totalRevenue}
                  totalExpenses={event.totalExpenses}
                  estimatedProfit={event.estimatedProfit}
                  sales={event.salesControl}
                  expenses={event.expenses}
                  additionalRevenues={event.additionalRevenues}
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
                <div className={`grid gap-6 ${overviewAnnouncementsGridClass}`}>
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
