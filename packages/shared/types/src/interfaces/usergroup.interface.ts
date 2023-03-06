import { ITeamMember } from "./teammember.interface";

export interface IUserGroup {
  id: number;
  type: string;
  name: string;
  team: ITeamMember[];
  details?: Record<string, any>;
}
