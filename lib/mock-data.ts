import { EventComparisonSnapshot, EventSummary, PartyEventDetail } from "@/lib/types";

const defaultUser = {
  id: "user-1",
  name: "Ana Souza",
  avatar: "AS",
  role: "admin" as const
};

export const eventDetails: PartyEventDetail[] = [
  {
    id: "sunset-white-party",
    name: "Sunset White Party",
    eventDate: "2026-07-18T22:00:00.000Z",
    status: "current",
    totalRevenue: 18420,
    goalValue: 30000,
    progress: 61,
    estimatedProfit: 10670,
    totalTicketsSold: 187,
    bestSeller: "Lucas Lima",
    venue: "Espaco Marina Sul",
    user: defaultUser,
    activeSellers: 12,
    summary: [
      {
        label: "Total arrecadado",
        value: 18420,
        helper: "+18% vs. semana passada",
        isCurrency: true
      },
      {
        label: "Meta de vendas",
        value: 30000,
        helper: "61% concluido",
        progress: 61,
        isCurrency: true
      },
      {
        label: "Vendedores ativos",
        value: 12,
        helper: "3 novos esta semana",
        isCurrency: false
      },
      {
        label: "Lucro estimado",
        value: 10670,
        helper: "Apos despesas atuais",
        isCurrency: true
      }
    ],
    ranking: [
      { id: "1", name: "Lucas Lima", ticketsSold: 52, revenue: 6240, delta: "+12%" },
      { id: "2", name: "Marina Alves", ticketsSold: 45, revenue: 5400, delta: "+8%" },
      { id: "3", name: "Joao Pedro", ticketsSold: 39, revenue: 4680, delta: "+6%" },
      { id: "4", name: "Camila Rocha", ticketsSold: 30, revenue: 3600, delta: "+3%" },
      { id: "5", name: "Rafa Martins", ticketsSold: 21, revenue: 2520, delta: "-2%" }
    ],
    salesControl: [
      { id: "1", seller: "Lucas Lima", received: 60, sold: 52, remaining: 8, paymentStatus: "paid" },
      { id: "2", seller: "Marina Alves", received: 50, sold: 45, remaining: 5, paymentStatus: "paid" },
      { id: "3", seller: "Joao Pedro", received: 45, sold: 39, remaining: 6, paymentStatus: "pending" },
      { id: "4", seller: "Camila Rocha", received: 35, sold: 30, remaining: 5, paymentStatus: "pending" },
      { id: "5", seller: "Rafa Martins", received: 25, sold: 21, remaining: 4, paymentStatus: "paid" }
    ],
    expenses: [
      { id: "1", title: "DJ principal", amount: 2800, category: "Atracoes" },
      { id: "2", title: "Open bar", amount: 3650, category: "Bebidas" },
      { id: "3", title: "Midia paga", amount: 1300, category: "Marketing" }
    ],
    transfersPending: [
      { id: "1", name: "Joao Pedro", amount: 980 },
      { id: "2", name: "Camila Rocha", amount: 720 }
    ],
    tasks: [
      { id: "1", title: "Confirmar lista VIP", owner: "Ana Souza", status: "in-progress", dueLabel: "Hoje" },
      { id: "2", title: "Fechar fotografo", owner: "Marina Alves", status: "pending", dueLabel: "Amanha" },
      { id: "3", title: "Publicar teaser final", owner: "Lucas Lima", status: "done", dueLabel: "Concluido" }
    ],
    announcements: [
      {
        id: "1",
        title: "Virada de lote sexta-feira",
        body: "Todos os vendedores precisam revisar os leads e reforcar o push no Instagram ate 18h.",
        pinned: true
      },
      {
        id: "2",
        title: "Reuniao rapida as 20h",
        body: "Vamos alinhar operacao da entrada, pulseiras e repasses pendentes."
      }
    ],
    salesSeries: [
      { day: "Seg", amount: 1200 },
      { day: "Ter", amount: 1550 },
      { day: "Qua", amount: 2100 },
      { day: "Qui", amount: 1800 },
      { day: "Sex", amount: 2650 },
      { day: "Sab", amount: 3100 },
      { day: "Dom", amount: 2350 }
    ],
    sellerContribution: [
      { seller: "Lucas", amount: 6240 },
      { seller: "Marina", amount: 5400 },
      { seller: "Joao", amount: 4680 },
      { seller: "Camila", amount: 3600 },
      { seller: "Rafa", amount: 2520 }
    ]
  },
  {
    id: "neon-jungle",
    name: "Neon Jungle",
    eventDate: "2026-09-12T23:00:00.000Z",
    status: "upcoming",
    totalRevenue: 6420,
    goalValue: 28000,
    progress: 23,
    estimatedProfit: 2250,
    totalTicketsSold: 64,
    bestSeller: "Marina Alves",
    venue: "Green Hall",
    user: defaultUser,
    activeSellers: 8,
    summary: [
      { label: "Total arrecadado", value: 6420, helper: "Primeira onda de vendas", isCurrency: true },
      { label: "Meta de vendas", value: 28000, helper: "23% concluido", progress: 23, isCurrency: true },
      { label: "Vendedores ativos", value: 8, helper: "Equipe inicial em operacao", isCurrency: false },
      { label: "Lucro estimado", value: 2250, helper: "Cenario inicial", isCurrency: true }
    ],
    ranking: [
      { id: "1", name: "Marina Alves", ticketsSold: 20, revenue: 2400, delta: "+10%" },
      { id: "2", name: "Lucas Lima", ticketsSold: 14, revenue: 1680, delta: "+7%" },
      { id: "3", name: "Nina Costa", ticketsSold: 12, revenue: 1440, delta: "+5%" },
      { id: "4", name: "Vitor Melo", ticketsSold: 10, revenue: 1200, delta: "+2%" }
    ],
    salesControl: [
      { id: "1", seller: "Marina Alves", received: 25, sold: 20, remaining: 5, paymentStatus: "paid" },
      { id: "2", seller: "Lucas Lima", received: 20, sold: 14, remaining: 6, paymentStatus: "pending" },
      { id: "3", seller: "Nina Costa", received: 20, sold: 12, remaining: 8, paymentStatus: "paid" },
      { id: "4", seller: "Vitor Melo", received: 15, sold: 10, remaining: 5, paymentStatus: "pending" }
    ],
    expenses: [
      { id: "1", title: "Reserva do espaco", amount: 2200, category: "Locacao" },
      { id: "2", title: "Direcao criativa", amount: 950, category: "Branding" }
    ],
    transfersPending: [
      { id: "1", name: "Lucas Lima", amount: 420 },
      { id: "2", name: "Vitor Melo", amount: 300 }
    ],
    tasks: [
      { id: "1", title: "Fechar patrocinio de drinks", owner: "Ana Souza", status: "in-progress", dueLabel: "Esta semana" },
      { id: "2", title: "Aprovar key visual", owner: "Nina Costa", status: "pending", dueLabel: "Sexta" }
    ],
    announcements: [
      {
        id: "1",
        title: "Abertura de lista embaixadores",
        body: "Vamos ampliar a equipe comercial antes da virada do lote promocional.",
        pinned: true
      }
    ],
    salesSeries: [
      { day: "Seg", amount: 500 },
      { day: "Ter", amount: 680 },
      { day: "Qua", amount: 920 },
      { day: "Qui", amount: 1100 },
      { day: "Sex", amount: 1420 },
      { day: "Sab", amount: 980 },
      { day: "Dom", amount: 820 }
    ],
    sellerContribution: [
      { seller: "Marina", amount: 2400 },
      { seller: "Lucas", amount: 1680 },
      { seller: "Nina", amount: 1440 },
      { seller: "Vitor", amount: 1200 }
    ]
  },
  {
    id: "pool-vibes-opening",
    name: "Pool Vibes Opening",
    eventDate: "2026-11-21T16:00:00.000Z",
    status: "upcoming",
    totalRevenue: 0,
    goalValue: 35000,
    progress: 0,
    estimatedProfit: 0,
    totalTicketsSold: 0,
    bestSeller: "A definir",
    venue: "Clube Paraiso",
    user: defaultUser,
    activeSellers: 0,
    summary: [
      { label: "Total arrecadado", value: 0, helper: "Lote ainda nao aberto", isCurrency: true },
      { label: "Meta de vendas", value: 35000, helper: "Planejamento comercial", progress: 0, isCurrency: true },
      { label: "Vendedores ativos", value: 0, helper: "Time ainda nao escalado", isCurrency: false },
      { label: "Lucro estimado", value: 0, helper: "Aguardando custos finais", isCurrency: true }
    ],
    ranking: [],
    salesControl: [],
    expenses: [],
    transfersPending: [],
    tasks: [
      { id: "1", title: "Definir headline de campanha", owner: "Ana Souza", status: "pending", dueLabel: "Proxima semana" }
    ],
    announcements: [],
    salesSeries: [],
    sellerContribution: []
  },
  {
    id: "carnaval-rooftop-2026",
    name: "Carnaval Rooftop 2026",
    eventDate: "2026-02-14T22:00:00.000Z",
    status: "past",
    totalRevenue: 42700,
    goalValue: 38000,
    progress: 112,
    estimatedProfit: 19850,
    totalTicketsSold: 386,
    bestSeller: "Marina Alves",
    venue: "Rooftop Central",
    user: defaultUser,
    activeSellers: 14,
    summary: [
      { label: "Total arrecadado", value: 42700, helper: "Evento encerrado", isCurrency: true },
      { label: "Meta de vendas", value: 38000, helper: "112% da meta", progress: 112, isCurrency: true },
      { label: "Vendedores ativos", value: 14, helper: "Operacao finalizada", isCurrency: false },
      { label: "Lucro estimado", value: 19850, helper: "Fechamento consolidado", isCurrency: true }
    ],
    ranking: [
      { id: "1", name: "Marina Alves", ticketsSold: 72, revenue: 8640, delta: "+15%" },
      { id: "2", name: "Lucas Lima", ticketsSold: 58, revenue: 6960, delta: "+11%" },
      { id: "3", name: "Bia Torres", ticketsSold: 49, revenue: 5880, delta: "+9%" }
    ],
    salesControl: [
      { id: "1", seller: "Marina Alves", received: 80, sold: 72, remaining: 8, paymentStatus: "paid" },
      { id: "2", seller: "Lucas Lima", received: 65, sold: 58, remaining: 7, paymentStatus: "paid" },
      { id: "3", seller: "Bia Torres", received: 55, sold: 49, remaining: 6, paymentStatus: "paid" }
    ],
    expenses: [
      { id: "1", title: "Estrutura", amount: 9800, category: "Producao" },
      { id: "2", title: "Bar", amount: 7100, category: "Operacao" },
      { id: "3", title: "Artistas", amount: 5950, category: "Line-up" }
    ],
    transfersPending: [],
    tasks: [],
    announcements: [],
    salesSeries: [
      { day: "Seg", amount: 2800 },
      { day: "Ter", amount: 3200 },
      { day: "Qua", amount: 4100 },
      { day: "Qui", amount: 5200 },
      { day: "Sex", amount: 6800 },
      { day: "Sab", amount: 7300 },
      { day: "Dom", amount: 6500 }
    ],
    sellerContribution: [
      { seller: "Marina", amount: 8640 },
      { seller: "Lucas", amount: 6960 },
      { seller: "Bia", amount: 5880 }
    ]
  },
  {
    id: "reveillon-signature",
    name: "Reveillon Signature",
    eventDate: "2025-12-31T23:30:00.000Z",
    status: "past",
    totalRevenue: 58900,
    goalValue: 52000,
    progress: 113,
    estimatedProfit: 26440,
    totalTicketsSold: 442,
    bestSeller: "Lucas Lima",
    venue: "Casa Aurora",
    user: defaultUser,
    activeSellers: 16,
    summary: [
      { label: "Total arrecadado", value: 58900, helper: "Evento encerrado", isCurrency: true },
      { label: "Meta de vendas", value: 52000, helper: "113% da meta", progress: 113, isCurrency: true },
      { label: "Vendedores ativos", value: 16, helper: "Time completo", isCurrency: false },
      { label: "Lucro estimado", value: 26440, helper: "Maior lucro do ciclo", isCurrency: true }
    ],
    ranking: [
      { id: "1", name: "Lucas Lima", ticketsSold: 81, revenue: 9720, delta: "+17%" },
      { id: "2", name: "Marina Alves", ticketsSold: 67, revenue: 8040, delta: "+12%" },
      { id: "3", name: "Joao Pedro", ticketsSold: 60, revenue: 7200, delta: "+10%" }
    ],
    salesControl: [
      { id: "1", seller: "Lucas Lima", received: 90, sold: 81, remaining: 9, paymentStatus: "paid" },
      { id: "2", seller: "Marina Alves", received: 75, sold: 67, remaining: 8, paymentStatus: "paid" }
    ],
    expenses: [
      { id: "1", title: "Locacao premium", amount: 12800, category: "Locacao" },
      { id: "2", title: "Buffet", amount: 9400, category: "Hospitalidade" },
      { id: "3", title: "Showcase artistico", amount: 7600, category: "Line-up" }
    ],
    transfersPending: [],
    tasks: [],
    announcements: [],
    salesSeries: [
      { day: "Seg", amount: 3800 },
      { day: "Ter", amount: 4700 },
      { day: "Qua", amount: 5900 },
      { day: "Qui", amount: 7200 },
      { day: "Sex", amount: 8600 },
      { day: "Sab", amount: 9300 },
      { day: "Dom", amount: 9400 }
    ],
    sellerContribution: [
      { seller: "Lucas", amount: 9720 },
      { seller: "Marina", amount: 8040 },
      { seller: "Joao", amount: 7200 }
    ]
  }
];

export const eventSummaries: EventSummary[] = eventDetails.map(
  ({
    id,
    name,
    eventDate,
    status,
    totalRevenue,
    goalValue,
    progress,
    estimatedProfit,
    totalTicketsSold,
    bestSeller,
    venue
  }) => ({
    id,
    name,
    eventDate,
    status,
    totalRevenue,
    goalValue,
    progress,
    estimatedProfit,
    totalTicketsSold,
    bestSeller,
    venue
  })
);

export const eventComparison: EventComparisonSnapshot = {
  bestRevenueEvent: {
    eventName: "Reveillon Signature",
    value: 58900
  },
  bestProfitEvent: {
    eventName: "Reveillon Signature",
    value: 26440
  },
  topSellerOverall: {
    sellerName: "Lucas Lima",
    value: 17680
  },
  averageSalesPerEvent: 25288
};
