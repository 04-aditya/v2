import React from 'react';
import { createStore } from 'react-hooks-global-state';

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

