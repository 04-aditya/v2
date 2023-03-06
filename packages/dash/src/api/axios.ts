import axios from 'axios';
import axiosRetry, {isNetworkOrIdempotentRequestError} from 'axios-retry';
const BASE_URL = process.env['NX_API_URL']

const defaultAxios = axios.create({
    baseURL: BASE_URL
});
axiosRetry(defaultAxios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: error => {
    return isNetworkOrIdempotentRequestError(error);
    // const status = error.response?.status || 500;
    // if (status<500) return false;
    // console.error(error);
    // return true;
  },
});


const axiosPrivate = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true
});

axiosRetry(axiosPrivate, {
  retries: 0,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: error => {
    return isNetworkOrIdempotentRequestError(error);
    // const status = error.response?.status || 500;
    // if (status<500) return false;
    // console.error(error);
    // return true;
  },
});

export default defaultAxios
export { axiosPrivate };
