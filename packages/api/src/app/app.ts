import 'reflect-metadata';
import { validationMetadatasToSchemas } from 'class-validator-jsonschema';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import { useExpressServer, getMetadataArgsStorage, Action } from 'routing-controllers';
import { routingControllersToSpec } from 'routing-controllers-openapi';
import swaggerUi from 'swagger-ui-express';
import { NODE_ENV, PORT, LOG_FORMAT, ORIGIN, CREDENTIALS } from '@config';
import errorMiddleware from '@middlewares/error.middleware';
import { logger, stream } from '@utils/logger';
import { AppDataSource } from '@/databases';
import { UserRoleEntity } from '@/entities/userrole.entity';
import { UserEntity } from '@/entities/user.entity';
class App {
  public app: express.Application;
  public env: string;
  public port: string | number;

  constructor(Controllers: Function[]) {
    this.app = express();
    this.env = NODE_ENV || 'development';
    this.port = PORT || 3000;

    this.initializeMiddlewares();
    this.initializeRoutes(Controllers);
    this.initializeSwagger(Controllers);
    this.initializeErrorHandling();
  }

  public listen() {
    AppDataSource.initialize()
      .then(async () => {
        const rolesRepo = AppDataSource.getRepository(UserRoleEntity);
        try {
          //create roles
          const roles = [
            { name: 'default', description: 'default role. every new user will start with this role.' },
            { name: 'admin', description: 'master admin role.' },
          ];

          for (const role of roles) {
            let urole = await rolesRepo.findOne({ where: { name: role.name } });
            if (!urole) {
              urole = new UserRoleEntity();
              urole.name = role.name;
              urole.description = role.description;
              try {
                await AppDataSource.getRepository(UserRoleEntity).save(urole);
                logger.info(`${role.name} userrole created.`);
              } catch (ex) {
                if (ex.code !== '23505') {
                  // if not duplicate
                  logger.warn(`duplicate ${role.name}. userrole not created.`, ex);
                } else {
                  logger.error(ex);
                }
              }
            }
          }
        } catch (ex) {
          logger.error('Unable to create default data', ex);
        }

        const adminemail = process.env.ADMINUSEREMAIL;
        try {
          const adminUser = await AppDataSource.getRepository(UserEntity).findOne({
            where: {
              email: adminemail,
            },
            relations: {
              roles: true,
            },
          });
          if (!adminUser) {
            logger.warn(`No user with email ${adminemail} found. Create one by requesting access`);
          } else {
            if (adminUser.roles.findIndex(r => r.name === 'admin') === -1) {
              const adminrole = await rolesRepo.findOne({ where: { name: 'admin' } });
              adminUser.roles = [...adminUser.roles, adminrole];
              logger.info(`Setting admin role to ${adminemail}`);
              await AppDataSource.manager.save(adminUser);
            }
          }
        } catch (ex) {
          if (ex.code !== '23505') {
            // if not duplicate
            logger.warn(`Unable to set admin role to ${adminemail}.`, ex);
          }
        }

        this.app.listen(this.port, () => {
          logger.info(`=================================`);
          logger.info(`======= ENV: ${this.env} =======`);
          logger.info(`🚀 App listening on the port ${this.port}`);
          logger.info(`=================================`);
        });
      })
      .catch(error => {
        logger.error('Unable to initialize database', error);
      });
  }

  public getServer() {
    return this.app;
  }

  private initializeMiddlewares() {
    this.app.use(morgan(LOG_FORMAT, { stream }));
    this.app.use(hpp());
    this.app.use(helmet());
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser());
    this.app.use(function (req, res, next) {
      const whitelist = ORIGIN.split(',');
      const host = req.get('origin').toLowerCase();

      whitelist.forEach((val: string) => {
        if (host?.indexOf(val) > -1) {
          res.setHeader('Access-Control-Allow-Origin', host);
          // res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, PATCH, DELETE, OPTION');
          // res.setHeader('Access-Control-Allow-Headers', '*');
        }
      });

      next();
    });
  }

  private initializeRoutes(controllers: Function[]) {
    useExpressServer(this.app, {
      cors: {
        origin: ORIGIN.split(','),
        credentials: CREDENTIALS,
      },
      controllers: controllers,
      currentUserChecker: async (action: Action) => {
        return action.request.user as UserEntity;
      },
      authorizationChecker: async (action: Action, roles?: string[]) => {
        // perform queries based on token from request headers
        const user = action.request.user as UserEntity;
        if (roles) {
          let hasRole = false;
          user.roles.forEach(r => {
            if (roles.includes(r.name)) hasRole = true;
          });
          return hasRole;
        }
        return user ? true : false;
      },
      defaultErrorHandler: false,
    });
  }

  private initializeSwagger(controllers: Function[]) {
    const schemas = validationMetadatasToSchemas({
      refPointerPrefix: '#/components/schemas/',
    });

    const routingControllersOptions = {
      controllers: controllers,
    };

    const storage = getMetadataArgsStorage();
    const spec = routingControllersToSpec(storage, routingControllersOptions, {
      components: {
        schemas,
        securitySchemes: {
          bearerAuth:{
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          // basicAuth: {
          //   scheme: 'basic',
          //   type: 'http',
          // },
        },
      },
      info: {
        description: 'API endpoints for psnext.info',
        title: 'PSNext API',
        version: '0.2.0',
      },
    });

    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
  }

  private initializeErrorHandling() {
    this.app.use(errorMiddleware);
  }
}

export default App;
