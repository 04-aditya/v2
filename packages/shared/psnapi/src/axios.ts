import axios from 'axios';
import axiosRetry, {isNetworkOrIdempotentRequestError} from 'axios-retry';
const BASE_URL = process.env['NX_API_URL']

const defaultAxios = axios.create({
    baseURL: BASE_URL,
    timeout: 60000,
});
axiosRetry(defaultAxios, {
  retries: 2,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: error => {
    const status = error.response?.status || 500;
    console.log('retry', status)
    if (status<500) return false;
    console.error(error);
    return true;
  },
});


const axiosPrivate = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
    timeout: 60000,
});

axiosRetry(axiosPrivate, {
  retries: 0,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: error => {
    // return isNetworkOrIdempotentRequestError(error);
    const status = error.response?.status || 500;
    console.log('retry', status)
    if (status<500) return false;
    console.error(error);
    return true;
  },
});

export default defaultAxios
export { axiosPrivate };
