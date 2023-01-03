export interface IUserPAT {
  id: string;
  name: string;
  expiration: string;
  createdAt?: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
  permissions: string[];
  token?: string;
}
