export interface MutationActionState {
  status: "idle" | "success" | "error";
  message: string;
  redirectTo?: string;
}

export const initialMutationActionState: MutationActionState = {
  status: "idle",
  message: ""
};

export type TeamActionState = MutationActionState;
export type SalesActionState = MutationActionState;
export type FinanceActionState = MutationActionState;
export type EventActionState = MutationActionState;
export type TaskActionState = MutationActionState;
export type AnnouncementActionState = MutationActionState;

export const initialTeamActionState = initialMutationActionState;
export const initialSalesActionState = initialMutationActionState;
export const initialFinanceActionState = initialMutationActionState;
export const initialEventActionState = initialMutationActionState;
export const initialTaskActionState = initialMutationActionState;
export const initialAnnouncementActionState = initialMutationActionState;
