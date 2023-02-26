export interface IStatsData<T extends number|Array<{name:string, value:number}>> {
  name: string,
  value: T,
  all?: T,
  industry?: T,
  capability?: T,
  account?: T,
}
