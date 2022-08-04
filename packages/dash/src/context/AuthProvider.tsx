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
    const [auth, setAuth] = useState<IAuth>({});

    return (
        <AuthContext.Provider value={{ auth, setAuth }}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthContext;
