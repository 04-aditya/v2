import { IPermission } from "./permission.interface";

export interface IUserRole {
  id: number;
  name: string;
  description?: string;
  permissions: IPermission[];
  children?: IUserRole[];
}
