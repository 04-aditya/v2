export interface IUserData {
  userid: number;
  key: string;
  value: string|number|boolean|Record<string, unknown>;
  timestamp: Date;
}
