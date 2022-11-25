import { cleanEnv, port, str } from 'envalid';

const validateEnv = () => {
  cleanEnv(process.env, {
    NODE_ENV: str(),
    PORT: port(),

    LOG_DIR: str(),
    ORIGIN: str(),

    ACCESS_TOKEN_SECRET: str(),
    REFRESH_TOKEN_SECRET: str(),
    MAILDOMAINS: str(),

    DB_HOST: str(),
    DB_PORT: port(),
    DB_USER: str(),
    DB_PASSWORD: str(),
    DB_DATABASE: str(),

    CLID: str(),
    CLIS: str(),
    TID: str(),
    PDAAPI: str(),
  });
};

export default validateEnv;
