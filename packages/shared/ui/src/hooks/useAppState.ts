import React from 'react';
import { createStore } from 'react-hooks-global-state';

export type IAppState = {
  title: string;
}

const reducer = (state:IAppState, action:{type:string, data?:any}) => {
  switch (action.type) {
    case 'title': {
      return { ...state, title: action.data };
    }
    default: return state;
  }
};
const initialAppState:IAppState = { title: 'PSNext'};
export const { dispatch:appstateDispatch, useStoreState:useAppStore } = createStore(reducer, initialAppState);

