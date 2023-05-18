import React from 'react';
import { AxiosInstance, AxiosResponse } from 'axios';
import { createStore } from 'react-hooks-global-state';
import useAxiosPrivate from 'psnapi/useAxiosPrivate';

let nid=1;
export class NotificationInfo {
  id;
  busy = false;
  status =  '';
  title = '';
  description = '';

  constructor(title:string, description?:string, status?:string, busy?:boolean) {
    this.id=nid++;
    this.title = title;
    if (description) this.description=description;
    if (status) this.status = status;
    if (busy) this.busy=busy;
  }
}

export type INotificationState = {
  busy: boolean;
  unreadCount: number;
  notifications: Array<NotificationInfo>;
}

const reducer = (state:INotificationState, action:{type:string, notification?:NotificationInfo}) => {
  switch (action.type) {
    case 'add': {
      if (!action.notification) return state;
      const notifications = [action.notification, ...state.notifications];
      const newState = { ...state, notifications };
      if (!newState.busy) newState.busy = action.notification.busy;
      newState.unreadCount++;
      console.log(newState);
      return newState
    }
    case 'update': {
      if (!action.notification) return state;
      const notifications:Array<NotificationInfo> = [];
      const newState = {...state, busy: false};
      state.notifications.forEach(n=>{
        if (n.id === action.notification?.id) {
          notifications.push(action.notification)
        }
        else {
          notifications.push(n);
        }
        if (n.busy) newState.busy=true;
      });
      newState.notifications=notifications;
      return newState
    }
    case 'delete': {
      if (!action.notification) return state;
      const notifications:Array<NotificationInfo> = [];
      const newState = {...state, busy:false};
      state.notifications.forEach(n=>{
        if (n.id !== action.notification?.id) {
          notifications.push(n);
          if (n.busy) newState.busy=true;
        }
      });
      newState.notifications=notifications;
      return newState
    }
    case 'resetunreadcount': {
      return {...state, unreadCount:0};
    }
    default: return state;
  }
};
const initialNotificationState:INotificationState = { busy: false, unreadCount:0, notifications:[]};
export const { dispatch:notificationDispatch, useStoreState:useNotificationStore } = createStore(reducer, initialNotificationState);

export const displayNotification = (title:string, description:string, status: string, poll?:{axios:AxiosInstance, ar:AxiosResponse})=>{
  return new Promise<void>(resolve=>{
    const notification = new NotificationInfo(title, description, status, true);
    notificationDispatch({type:'add', notification});
    //poll for completion
    if (!poll) return resolve();

    const {axios, ar} = poll;
    const pollid = setInterval(()=>{
      axios.get(`/api/q/${ar.data.qid}`)
        .then(res=>{
          if (res.status===200) {
            if (res.data.status==='done') {
              clearInterval(pollid);
              notification.busy = false;
              notification.status = 'done';
              notification.description = `${description}\n${res.data.results.message}`;
              notificationDispatch({type:'update', notification})
              resolve();
            }
            else if (res.data.status==='error') {
              clearInterval(pollid);
              notification.busy = false;
              notification.status = 'error';
              notification.description = `error:${res.data.results.error}\n` + notification.description;
              notificationDispatch({type:'update', notification})
              resolve();
            } else {
              notification.status = res.data.status;
              notification.description = `${description}\n${res.data.results.message}`;
              notificationDispatch({type:'update', notification})
            }
          }
        })
        .catch(ex=>{
          console.error(ex);
          clearInterval(pollid);
          notification.busy=false;
          notification.status='error';
          notification.description='error:\n' + notification.description;
          notificationDispatch({type:'update', notification})
          resolve();
        })
    }, 1000);
  });
}
