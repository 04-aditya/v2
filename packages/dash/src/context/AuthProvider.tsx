import { createContext, useState } from "react";
import {IUser} from 'sharedtypes';


interface IAuth {
  user?:IUser;
  accessToken?:string
}
interface IAuthContext {
  auth:IAuth;
  setAuth:((arg0:IAuth) => void );
}

const AuthContext = createContext<IAuthContext>({auth: {}, setAuth:()=>{ console.log('default setAuth')}});

export const AuthProvider = ({ children }:{children:React.ReactNode}) => {

    let authSession:IAuth = {};
    try {
      authSession = JSON.parse(window.sessionStorage.getItem('auth')||'{}') as IAuth;
    } catch (e) {
      console.error(e);
    }

    const [auth, setAuthInternal] = useState<IAuth>(authSession);

    const setAuth = (auth:IAuth) => {
      window.sessionStorage.setItem('auth', JSON.stringify(auth));
      console.log(window.sessionStorage.getItem('auth'));
      setAuthInternal(auth);
    }

    return (
      <AuthContext.Provider value={{ auth, setAuth }}>
        {children}
      </AuthContext.Provider>
    )
}

export default AuthContext;
