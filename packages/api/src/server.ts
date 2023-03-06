import App from '@/app/app';
import validateEnv from '@utils/validateEnv';
import { IndexController } from '@controllers/index.controller';
import { AuthController } from '@controllers/auth.controller';
import { UsersController } from '@controllers/users.controller';
import { AdminController } from '@controllers/admin.controller';
import { QApiController } from '@controllers/qapi.controller';
import { RolesController } from '@controllers/roles.controller';
import { PermissionsController } from '@controllers/permissions.controller';
import { UserGroupController } from './controllers/usergroup.controller';

validateEnv();

const app = new App([
  IndexController,
  AuthController,
  UsersController,
  AdminController,
  QApiController,
  RolesController,
  PermissionsController,
  UserGroupController,
]);
app.listen();
