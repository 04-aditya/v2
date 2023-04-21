import { useQueryClient } from "@tanstack/react-query";
import { createContext, useState } from "react";
// import {IUser} from 'sharedtypes';


export interface IAuth {
  user?:any;
  roles?:any;
  accessToken?:string
}
export interface IAuthContext {
  auth:IAuth;
  setAuth:((arg0:IAuth) => void );
}

const AuthContext = createContext<IAuthContext>({auth: {}, setAuth:(a:IAuth)=>{ console.log('default setAuth')}});

export const AuthProvider = ({ children }:{children:React.ReactNode}) => {
    const queryClient = useQueryClient();
    let authSession:IAuth = {};
    try {
      authSession = JSON.parse(window.sessionStorage.getItem('auth')||'{}') as IAuth;
    } catch (e) {
      console.error(e);
    }

    const [auth, setAuthInternal] = useState<IAuth>(authSession);

    const setAuth = (auth:IAuth) => {
      window.sessionStorage.setItem('auth', JSON.stringify(auth));
      // console.log(window.sessionStorage.getItem('auth'));
      // console.log('Reseting the user cache');
      setAuthInternal(auth);
      queryClient.invalidateQueries(['users','me']);
    }

    return (
      <AuthContext.Provider value={{ auth, setAuth }}>
        {children}
      </AuthContext.Provider>
    )
}

export default AuthContext;
