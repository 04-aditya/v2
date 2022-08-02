import App from '@/app/app';
import { IndexController } from '@controllers/index.controller';
import { AuthController } from '@controllers/auth.controller';
import { UsersController } from '@controllers/users.controller';
import validateEnv from '@utils/validateEnv';

validateEnv();

const app = new App([IndexController, AuthController, UsersController]);
app.listen();
