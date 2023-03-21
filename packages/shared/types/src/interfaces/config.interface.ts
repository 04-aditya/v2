
export enum ConfigType {
  JSON = 'json',
  STATCONFIGTYPE = 'stat',
}
export interface IConfigItem {
  id: number;
  name: string;
  type: ConfigType;
  details: Record<string, any>;
}
