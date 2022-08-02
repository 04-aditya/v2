import { IUserRole } from './userrole.interface';

export interface IUser {
  id: number;
  email: string;

  roles: IUserRole[];
}
