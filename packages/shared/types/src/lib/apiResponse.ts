export class APIResponse<T> {
  data?: T;
  message?: string;

  constructor(data?:T, message?:string){
    this.data = data;
    this.message = message;
  }
}
