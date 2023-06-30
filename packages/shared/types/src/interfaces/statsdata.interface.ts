export interface IStatsData<T extends number|Array<{name:string, value:number}>> {
  name: string,
  type: string,
  value: T,
  all?: T,
  industry?: T,
  capability?: T,
  account?: T,
}
