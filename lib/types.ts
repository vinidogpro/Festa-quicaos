export type UserRole = "admin" | "member";
export type EventStatus = "current" | "upcoming" | "past";
export type PaymentStatus = "paid" | "pending";
export type TaskStatus = "pending" | "in-progress" | "done";

export interface PartyUser {
  id: string;
  name: string;
  avatar: string;
  role: UserRole;
}

export interface SummaryMetric {
  label: string;
  value: number;
  helper: string;
  progress?: number;
  isCurrency?: boolean;
}

export interface SellerRanking {
  id: string;
  name: string;
  ticketsSold: number;
  revenue: number;
  delta: string;
}

export interface SalesRecord {
  id: string;
  seller: string;
  received: number;
  sold: number;
  remaining: number;
  paymentStatus: PaymentStatus;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
}

export interface TransferPending {
  id: string;
  name: string;
  amount: number;
}

export interface TaskItem {
  id: string;
  title: string;
  owner: string;
  status: TaskStatus;
  dueLabel: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned?: boolean;
}

export interface SalesSeries {
  day: string;
  amount: number;
}

export interface SellerContribution {
  seller: string;
  amount: number;
}

export interface EventSummary {
  id: string;
  name: string;
  eventDate: string;
  status: EventStatus;
  totalRevenue: number;
  goalValue: number;
  progress: number;
  estimatedProfit: number;
  totalTicketsSold: number;
  bestSeller: string;
  venue: string;
}

export interface PartyEventDetail extends EventSummary {
  user: PartyUser;
  activeSellers: number;
  summary: SummaryMetric[];
  ranking: SellerRanking[];
  salesControl: SalesRecord[];
  expenses: Expense[];
  transfersPending: TransferPending[];
  tasks: TaskItem[];
  announcements: Announcement[];
  salesSeries: SalesSeries[];
  sellerContribution: SellerContribution[];
}

export interface EventComparisonSnapshot {
  bestRevenueEvent: {
    eventName: string;
    value: number;
  };
  bestProfitEvent: {
    eventName: string;
    value: number;
  };
  topSellerOverall: {
    sellerName: string;
    value: number;
  };
  averageSalesPerEvent: number;
}
