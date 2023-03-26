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
import { UserEntity } from '@/entities/user.entity';
import { bootstrapDB } from '../databases/bootstrapdb';
import { HttpErrorHandler } from '@/utils/HttpErrorHandler';

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
        await bootstrapDB();
        this.app.listen(this.port, () => {
          logger.debug(`==================================`);
          logger.debug(`======= ENV: ${this.env} =========`);
          logger.debug(`🚀 PSNI listening on the port ${this.port}`);
          logger.debug(`==================================`);
          logger.info(`Started PSNI server at ${new Date().toISOString()}`);
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
  }

  private initializeRoutes(controllers: Function[]) {
    const whitelist = ORIGIN.split(',');
    useExpressServer(this.app, {
      cors: {
        origin: whitelist,
        credentials: CREDENTIALS,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'OPTION', 'DELETE'],
      },
      controllers: controllers,
      middlewares: [HttpErrorHandler],
      currentUserChecker: async (action: Action) => {
        return action.request.user as UserEntity;
      },
      authorizationChecker: async (action: Action, permissions?: string[]) => {
        try {
          // perform queries based on token from request headers
          const user = action.request.user as UserEntity;
          if (permissions && permissions.length > 0) {
            for (const p of action.request.permissions) {
              if (permissions.findIndex(r => p.startsWith(r)) !== -1) return true;
            }
            logger.warn(`Not found roles:[${permissions.join(',')}]`);
            return false;
          } else if (!user) {
            logger.warn(`Not found user for the request`);
            return false;
          }
          return true;
        } catch (ex) {
          console.error(ex);
          logger.error(ex.toString());
          return false;
        }
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
        //schemas: { ...schemas },
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ bearerAuth: [] }],
      info: {
        description: 'API endpoints for PSnext.info',
        title: 'PSNext API',
        version: '0.2.0',
      },
    });

    this.app.use('/openapi.json', (_req, res) => {
      res.json(spec);
    });
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
  }

  private initializeErrorHandling() {
    this.app.use(errorMiddleware);
  }
}

export default App;
