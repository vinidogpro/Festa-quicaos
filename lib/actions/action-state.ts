export interface TeamActionState {
  status: "idle" | "success" | "error";
  message: string;
}

export const initialTeamActionState: TeamActionState = {
  status: "idle",
  message: ""
};
