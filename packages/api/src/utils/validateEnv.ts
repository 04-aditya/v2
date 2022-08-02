import { cleanEnv, port, str } from 'envalid';

const validateEnv = () => {
  cleanEnv(process.env, {
    NODE_ENV: str(),
    PORT: port(),

    JWT_SECRET_KEY: str(),

    LOG_DIR: str(),

    DB_HOST: str(),
    DB_PORT: port(),
    DB_USER: str(),
    DB_PASSWORD: str(),
    DB_DATABASE: str(),
  });
};

export default validateEnv;
