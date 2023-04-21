import { IUserPAT } from './userpat.interface';
import { IUserRole } from './userrole.interface';

export interface IUser {
  id: number;
  email: string;
  oid?: number;
  csid?: number;

  photo?: string;

  supervisor_id?: number;
  supervisor_name?: string;
  employment_type?: string;

  first_name?: string;
  middle_name?: string;
  last_name?: string;

  career_stage?: string;
  business_title?: string;
  capability?: string;
  craft?: string;

  account?:string;
  team?:string;

  current_region?: string;
  current_office?: string;
  home_region?: string;
  home_office?: string;

  most_recent_hire_date?: Date;
  snapshot_date?: Date;

  roles: IUserRole[];
  permissions?: string[];

  pats?: IUserPAT[];

  data?: Record<string, any>;
}


export const getUserName = (user: IUser)=>user?`${user.first_name||''} ${user.last_name||''}`.trim():'';
