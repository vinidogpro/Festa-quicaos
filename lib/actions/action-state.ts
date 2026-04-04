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

export const initialTeamActionState = initialMutationActionState;
export const initialSalesActionState = initialMutationActionState;
export const initialFinanceActionState = initialMutationActionState;
export const initialEventActionState = initialMutationActionState;
