import { IUser } from "./user.interface";

export interface ITeamMember {
  id: number;
  user: IUser;
  role: string;
  details?: Record<string, any>;
}
