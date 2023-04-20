import axios from './axios';
import { IAuth } from './context/AuthProvider';
import useAuth from './useAuth';

const useRefreshToken = () => {
  const { auth, setAuth } = useAuth();

  const refresh = async () => {
      const response = await axios.get('/auth/refreshtoken', {
        withCredentials: true
      });
      setAuth(({
        ...auth,
        roles: response.data.roles,
        accessToken: response.data.accessToken
      } as IAuth));
      return response.data.accessToken;
  }
  return refresh;
};

export default useRefreshToken;
