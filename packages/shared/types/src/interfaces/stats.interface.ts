
export interface IStatType {
  id?:number;
  datakeys: string[],
  group: string;
  name: string;
  type: string; // 'string' | 'number' | 'date' | 'array[number]' | 'array[string]' | 'array[date]';
  expression: string;
  filter?:string;
  aggregation: string;
  description?: string;
}

// type Operator = '+' | '-' | '*' | '/';
// type Token = number | Operator | '(' | ')';

// function precedence(op: Operator): number {
//   switch (op) {
//     case '+':
//     case '-':
//       return 1;
//     case '*':
//     case '/':
//       return 2;
//     default:
//       throw new Error(`Unknown operator: ${op}`);
//   }
// }

// function parseExpression(expression: string): number {
//   const output: number[] = [];
//   const operators: Token[] = [];

//   const tokens: Token[] = expression
//     .replace(/\s+/g, '')
//     .split(/([+\-*/()])/g)
//     .filter((t) => t.length > 0)
//     .map((t) => (isNaN(Number(t)) ? t : Number(t)));

//   for (const token of tokens) {
//     if (typeof token === 'number') {
//       output.push(token);
//     } else if (token === '(') {
//       operators.push(token);
//     } else if (token === ')') {
//       while (operators.length > 0 && operators[operators.length - 1] !== '(') {
//         const currentToken = operators.pop() as Operator;
//         output.push(currentToken);
//       }
//       operators.pop();
//     } else {
//       while (
//         operators.length > 0 &&
//         operators[operators.length - 1] !== '(' &&
//         precedence(token) <= precedence(operators[operators.length - 1] as Operator)
//       ) {
//         output.push(operators.pop() as Operator);
//       }
//       operators.push(token);
//     }
//   }

//   while (operators.length > 0) {
//     output.push(operators.pop() as Operator);
//   }

//   const stack: number[] = [];

//   for (const token of output) {
//     if (typeof token === 'number') {
//       stack.push(token);
//     } else {
//       const b = stack.pop() as number;
//       const a = stack.pop() as number;

//       switch (token) {
//         case '+':
//           stack.push(a + b);
//           break;
//         case '-':
//           stack.push(a - b);
//           break;
//         case '*':
//           stack.push(a * b);
//           break;
//         case '/':
//           stack.push(a / b);
//           break;
//       }
//     }
//   }

//   return stack[0];
// }
export class StatsHelper {
  static extractData(jp: any, rawdata: any, expression: string, filter?: string) {
    const data = new Array<any>();
    let datasample: any;
    rawdata.forEach((u:any) => {
      const v=jp.query([u], expression);
      if (v[0] && datasample===undefined) {
        datasample = v[0];
      }
      if (filter && filter.trim() !== '') {
        if (filter.startsWith('!')) {
          if (filter==='!blank'){
            if (v[0]) data.push({data:v[0], raw:u});
            return;
          }
          if (v[0] !== filter.substring(1)) data.push({data:v[0], raw:u});
        }
        else if (filter==='blank') {
          if (!v[0]) data.push({data:v[0], raw:u});
          return;
        }
        else if (v[0] === filter) {
          data.push({data:v[0], raw:u});
        }
      } else {
        data.push({data:v[0], raw:u})
      }
    });
    return {data, datasample};
  }

  static calculateAgg(statAgg: string, data: any[], datasample: any, rawdata: any[]) {
    const datatype = typeof datasample;
    console.log(datatype);
    console.log(data.length);
    if (statAgg==='count') {
      const value = data.filter(d=>d).length;
      return value;
    } else if (statAgg === 'percent') {
      const value=data.filter(d=>d).length/rawdata.length
      return value;
    }

    if (datatype==='string' || datatype==='number') {
      if (datatype==='string') {
        if (statAgg.startsWith('distinct') || statAgg.startsWith('group')) {
          const distinctSet = new Set<string>([...data.map(d=>d.data)]);
          const distinctValues: string[] = []
          distinctSet.forEach(val=>distinctValues.push(val?val:'blank'));
          if (statAgg==='group-count') {
            return [...distinctValues].map((val:string)=>({name: val, value: data.map(d=>d.data).filter((d:string)=>(d?d:'blank')===val).length}));
          } else if (statAgg==='distinct') {
            return [...distinctValues];
          }
        }
      } else {
        if (statAgg.startsWith('sum')) {
          return data.map(d=>d.data).reduce((a:number, b:number)=>a+b, 0);
        } else if (statAgg.startsWith('avg')) {
          return data.map(d=>d.data).reduce((a:number, b:number)=>a+b, 0)/data.length;
        } else if (statAgg.startsWith('min')) {
          return Math.min(...data.map(d=>d.data));
        } else if (statAgg.startsWith('max')) {
          return Math.max(...data.map(d=>d.data));
        }
      }
    }
  }
}
