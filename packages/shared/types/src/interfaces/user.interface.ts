import { IUserPAT } from './userpat.interface';
import { IUserRole } from './userrole.interface';

export interface IUser {
  id: number;
  email: string;
  oid?: number;
  csid?: number;

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
  home_region?: string;

  roles: IUserRole[];

  pats?: IUserPAT[];
}
