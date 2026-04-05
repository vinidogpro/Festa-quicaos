export type UserRole = "host" | "organizer" | "seller";
export type EventRole = "host" | "organizer" | "seller";
export type EventStatus = "current" | "upcoming" | "past";
export type PaymentStatus = "paid" | "pending";
export type TaskStatus = "pending" | "in-progress" | "done";

export interface ViewerProfile {
  id: string;
  email: string;
  name: string;
  avatar: string;
  role: UserRole;
}

export interface ViewerPermissions {
  eventRole?: EventRole;
  canCreateEvents: boolean;
  canManageEvent: boolean;
  canViewActivityLog: boolean;
  canManageTeam: boolean;
  canManageSales: boolean;
  canManageFinance: boolean;
  canManageTasks: boolean;
  canManageAnnouncements: boolean;
  canManageOwnSalesOnly: boolean;
  sellerUserId?: string;
}

export interface SummaryMetric {
  label: string;
  value: number;
  helper: string;
  progress?: number;
  isCurrency?: boolean;
}

export interface SellerOption {
  id: string;
  name: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  role: EventRole;
  isActive: boolean;
  ticketQuota: number;
  ticketsSold: number;
  revenue: number;
  goalProgress: number;
  pendingTransferAmount: number;
  isCurrentUser: boolean;
}

export interface UserDirectoryOption {
  id: string;
  name: string;
}

export interface SellerRanking {
  id: string;
  sellerUserId?: string;
  name: string;
  ticketsSold: number;
  revenue: number;
  goalTickets: number;
  goalProgress: number;
  pendingTransferAmount: number;
  delta: string;
}

export interface EventHealthSnapshot {
  label: string;
  tone: "positive" | "warning" | "critical";
  summary: string;
}

export interface EventAttentionItem {
  id: string;
  title: string;
  description: string;
  tone: "warning" | "critical";
}

export interface ActivityLogItem {
  id: string;
  actorUserId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId?: string;
  message: string;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: string;
}

export interface SalesRecord {
  id: string;
  sellerUserId: string;
  seller: string;
  received: number;
  sold: number;
  remaining: number;
  paymentStatus: PaymentStatus;
  unitPrice: number;
  soldAt: string;
  notes?: string;
  amount: number;
  attendeeNames: string[];
  attendeeCount: number;
  missingAttendeeCount: number;
  isOwnedByViewer: boolean;
}

export interface GuestListEntry {
  id: string;
  saleId: string;
  sellerUserId: string;
  sellerName: string;
  guestName: string;
  checkedInAt?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  incurredAt: string;
  notes?: string;
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
  ownerProfileId?: string;
  status: TaskStatus;
  dueLabel: string;
  dueAt?: string;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned?: boolean;
  createdAt: string;
  author?: string;
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
  description?: string;
  totalRevenue: number;
  goalValue: number;
  progress: number;
  estimatedProfit: number;
  totalTicketsSold: number;
  bestSeller: string;
  venue: string;
}

export interface PartyEventDetail extends EventSummary {
  viewer: ViewerProfile;
  viewerEventRole?: EventRole;
  permissions: ViewerPermissions;
  health: EventHealthSnapshot;
  attentionItems: EventAttentionItem[];
  activeSellers: number;
  totalExpenses: number;
  pendingPaymentsCount: number;
  confirmedPaymentsCount: number;
  summary: SummaryMetric[];
  ranking: SellerRanking[];
  salesControl: SalesRecord[];
  expenses: Expense[];
  transfersPending: TransferPending[];
  tasks: TaskItem[];
  announcements: Announcement[];
  activityLogs: ActivityLogItem[];
  guestListEntries: GuestListEntry[];
  salesSeries: SalesSeries[];
  sellerContribution: SellerContribution[];
  sellerOptions: SellerOption[];
  participantOptions: SellerOption[];
  teamMembers: TeamMember[];
  availableUsers: UserDirectoryOption[];
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
