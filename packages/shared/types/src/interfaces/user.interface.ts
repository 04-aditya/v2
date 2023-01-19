import { IUserPAT } from './userpat.interface';
import { IUserRole } from './userrole.interface';

export interface IUser {
  id: number;
  email: string;
  eid?: string;

  first_name?: string;
  middle_name?: string;
  last_name?: string;

  roles: IUserRole[];

  pats?: IUserPAT[];
}
