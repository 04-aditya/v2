import App from '@/app/app';
import { IndexController } from '@controllers/index.controller';
import { AuthController } from '@controllers/auth.controller';
import { UsersController } from '@controllers/users.controller';
import { AdminController } from '@controllers/admin.controller';
import { QApiController } from '@controllers/qapi.controller';
import validateEnv from '@utils/validateEnv';
import { RolesController } from './controllers/roles.controller';
import { PermissionsController } from './controllers/permissions.controller';

validateEnv();

const app = new App([IndexController, AuthController, UsersController, AdminController, QApiController, RolesController, PermissionsController]);
app.listen();
