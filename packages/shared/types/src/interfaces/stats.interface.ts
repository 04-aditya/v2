
export interface IStatType {
  group: string;
  name: string;
  expression: string;
  type: string; // 'string' | 'number' | 'date' | 'array[number]' | 'array[string]' | 'array[date]';
  aggregation: string;
  description?: string;
}
