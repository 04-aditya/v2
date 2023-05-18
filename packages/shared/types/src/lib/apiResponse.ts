export class APIResponse<T> {
  data?: T;
  message?: string;
  qid?: string;

  constructor(data?:T, message?:string, qid?: string){
    this.data = data;
    this.message = message;
    this.qid = qid;
  }
}
