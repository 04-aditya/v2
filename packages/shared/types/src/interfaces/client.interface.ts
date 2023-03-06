import { IIndustry } from "./industry.interface";
import { ITeamMember } from "./teammember.interface";
import { IUserGroup } from "./usergroup.interface";

export interface IClient extends IUserGroup {
  region?: string;
  industry?: IIndustry;
  team: ITeamMember[];
}
