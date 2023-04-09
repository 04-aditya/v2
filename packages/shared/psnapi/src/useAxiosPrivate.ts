import { axiosPrivate } from "./axios";
import { useEffect } from "react";
import useRefreshToken from "./useRefreshToken";
import useAuth from "./useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { AxiosError } from "axios";

const useAxiosPrivate = () => {
    const refresh = useRefreshToken();
    const { auth } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    useEffect(() => {

        const requestIntercept = axiosPrivate.interceptors.request.use(
            config => {
                if (!config.headers['Authorization']) {
                    config.headers['Authorization'] = `Bearer ${auth?.accessToken}`;
                }
                return config;
            }, (error) => Promise.reject(error)
        );

        const responseIntercept = axiosPrivate.interceptors.response.use(
            response => response,
            async (error) => {
                const prevRequest = error?.config;
                if (error?.response?.status === 401 && !prevRequest?.sent) {
                  navigate('/login', { state: { replace: false, from: location.pathname } });
                } else if (error?.response?.status === 412 && !prevRequest?.sent) {
                    prevRequest.sent = true;
                    try {
                      const newAccessToken = await refresh();
                      prevRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                      return axiosPrivate(prevRequest);
                    } catch (ex) {
                      if ((ex as AxiosError).response?.status===401) {
                        navigate('/login', { state: { replace: false, from: location.pathname } });
                        return;
                      }
                      console.log(ex);
                    }
                }
                console.debug(error);
                return Promise.reject(error);
            }
        );

        return () => {
            axiosPrivate.interceptors.request.eject(requestIntercept);
            axiosPrivate.interceptors.response.eject(responseIntercept);
        }
    }, [auth, refresh])

    return axiosPrivate;
}

export default useAxiosPrivate;
