
export interface IStatType {
  name: string;
  expression: string;
  type: string; // 'string' | 'number' | 'date' | 'array[number]' | 'array[string]' | 'array[date]';
  description?: string;
}
