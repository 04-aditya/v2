import { AppDataSource } from '@/databases';
import { PermissionEntity } from '@/entities/permission.entity';
import { UserEntity } from '@/entities/user.entity';
import { UserRoleEntity } from '@/entities/userrole.entity';
import { logger } from '@/utils/logger';
import { In, Not } from 'typeorm';

const defaultPermissions = [
  /* resource.action.group[.fields] */
  /* user permissions */
  { name: 'user.read.self.basic', description: 'permission to read basic userdetails data of self' },
  { name: 'user.read.org.basic', description: 'permission to read basic userdetails data of their org' },

  { name: 'user.read.self.all', description: 'permission to read all userdetails data of self' },
  { name: 'user.read.org.all', description: 'permission to read all userdetails data of their org' },
  { name: 'user.read.all.all', description: 'permission to read all userdetails data of all' },

  { name: 'user.write.self.custom', description: 'permission to write custom userdetails data of self' },
  { name: 'user.write.org.custom', description: 'permission to write custom userdetails data for org users' },
  { name: 'user.write.group.custom', description: 'permission to write custom userdetails data of uers in their group' },

  { name: 'user.write.all.all', description: 'permission to write all userdetails data of all' },

  /* role permissions */
  { name: 'roles.read.self', description: 'permission to read self roles data' },
  { name: 'roles.read.all', description: 'permission to read all roles data' },
  { name: 'roles.write.all', description: 'permission to write all roles data' },

  /* permission permissions */
  { name: 'permissions.read.self', description: 'permission to read permissions of self' },
  { name: 'permissions.read.all', description: 'permission to read all permissions' },
  { name: 'permissions.write.all', description: 'permission to read all permissions' },

  /* usergroup permissions */
  { name: 'usergroup.read.all', description: 'permission to read all usergroup data' },
  { name: 'usergroup.write.all', description: 'permission to write all usergroup data' },

  /* config permissions */
  { name: 'config.write.all', description: 'permission to write all config items data' },
  /* chat permissions */
  { name: 'chat.read.self', description: 'permission to read self chat data' },
  { name: 'chat.write.self', description: 'permission to write self chat data' },
  { name: 'chat.read.all', description: 'permission to read all users chat data' },
  { name: 'chat.write.all', description: 'permission to write all users chat data' },
];

const defaultRoles = [
  {
    name: 'default',
    description: 'default role. every new user will start with this role.',
    permissions: [
      'user.read.self.basic',
      'user.read.org.basic',
      'user.write.group.custom',
      'permissions.read.self',
      'roles.read.self',
      'chat.read.self',
      'chat.write.self',
    ],
  },
  {
    name: 'chat.admin',
    includedRoleNames: ['default'],
    description: 'admin role to read and write all chat data',
    permissions: ['chat.read.all', 'chat.write.all'],
  },
  {
    name: 'user.admin',
    includedRoleNames: ['default'],
    description: 'admin role to read and write all user data',
    permissions: ['user.read.all.all', 'user.write.all.all'],
  },
  {
    name: 'usergroup.admin',
    includedRoleNames: ['default'],
    description: 'admin role to read and write all usergroup data',
    permissions: ['usergroup.read.all', 'usergroup.write.all'],
  },
  {
    name: 'admin',
    description: 'master admin role.',
    includedRoleNames: ['default', 'user.admin', 'usergroup.admin', 'chat.admin'],
    permissions: ['roles.read.all', 'roles.write.all', 'permissions.read.all', 'permissions.write.all', 'config.write.all'],
  },
];

export async function bootstrapPermissions() {
  const permsRepo = AppDataSource.getRepository(PermissionEntity);
  try {
    //create permissions
    for await (const data of defaultPermissions) {
      try {
        let perm = await permsRepo.findOne({ where: { name: data.name } });
        if (!perm) {
          logger.info(`${data.name} permission created.`);
          perm = new PermissionEntity();
          perm.name = data.name;
        }
        perm.description = data.description;
        await perm.save();
      } catch (ex) {
        if (ex.code === '23505') {
          // if duplicate
          logger.warn(`duplicate ${data.name}. permission not created.`, ex);
        } else {
          logger.error(ex);
        }
      }
    }
  } catch (ex) {
    logger.error('Unable to bootstrap default permissions', ex);
  }
}

export async function bootstrapRoles() {
  const permsRepo = AppDataSource.getRepository(PermissionEntity);
  const rolesRepo = AppDataSource.getRepository(UserRoleEntity);
  try {
    //create roles
    for await (const role of defaultRoles) {
      try {
        let urole = await rolesRepo.findOne({ where: { name: role.name } });
        if (!urole) {
          logger.debug(`${role.name} userrole created.`);
          urole = new UserRoleEntity();
          urole.name = role.name;
        }
        urole.description = role.description;

        if (role.includedRoleNames) {
          urole.includedRoleNames = role.includedRoleNames;
        } else {
          urole.includedRoleNames = [];
        }
        if (role.permissions) {
          urole.permissions = await permsRepo.find({
            where: { name: In(role.permissions) },
          });
        }
        await urole.save();
      } catch (ex) {
        if (ex.code === '23505') {
          // if duplicate
          logger.warn(`duplicate ${role.name}. userrole not created.`, ex);
        } else {
          console.log(ex);
          logger.error(ex);
        }
      }
    }
    // const allRoles = await AppDataSource.getRepository(UserRoleEntity).find({
    //   relations: ['permissions'],
    // });
    // allRoles.map(r => console.log(r.toJSON()));
  } catch (ex) {
    logger.error('Unable to bootstrap default roles', ex);
  }
}

export async function bootstrapDB() {
  await bootstrapPermissions();
  await bootstrapRoles();

  const rolesRepo = AppDataSource.getRepository(UserRoleEntity);
  const usersRepo = AppDataSource.getRepository(UserEntity);

  const adminEmail = process.env.ADMINUSEREMAIL.toLowerCase();
  try {
    let adminUser = await usersRepo.findOne({
      where: {
        email: adminEmail,
      },
      relations: {
        roles: true,
      },
    });
    if (!adminUser) {
      logger.warn(`No user with email ${adminEmail} found. Creating new user`);
      adminUser = new UserEntity();
      adminUser.email = adminEmail;
      adminUser.roles = [];
    }
    if (adminUser.roles.findIndex(r => r.name === 'admin') === -1) {
      const adminRole = await rolesRepo.findOne({ where: { name: 'admin' } });
      adminUser.roles = [...adminUser.roles, adminRole];
      logger.info(`Setting admin role to ${adminEmail}`);
      await adminUser.save();
    }
  } catch (ex) {
    if (ex.code === '23505') {
      // log if duplicate
      logger.warn(`Unable to set admin role to ${adminEmail}.`, ex);
    }
  }
  //delete roles that are not rquired
  try {
    //get roles that are not required
    const oldroles: UserRoleEntity[] = await AppDataSource.getRepository(UserRoleEntity).find({
      where: {
        name: Not(In(defaultRoles.map(r => r.name))),
      },
    });
    if (oldroles?.length > 0) {
      logger.warn(`deleting roles ${oldroles.map(r => r.name)}`);

      await AppDataSource.getRepository(UserRoleEntity).remove(oldroles);
    }
  } catch (ex) {
    logger.error('Unable to delete unused roles', ex);
  }

  //delete permissions that are not required
  try {
    //get permissions that are not required
    const oldperms: PermissionEntity[] = await AppDataSource.getRepository(PermissionEntity).find({
      where: {
        name: Not(In(defaultPermissions.map(p => p.name))),
      },
    });
    if (oldperms?.length > 0) {
      logger.warn(`deleting permissions ${oldperms.map(p => p.name)}`);

      await AppDataSource.getRepository(PermissionEntity).remove(oldperms);
    }
  } catch (ex) {
    logger.error('Unable to delete unused permissions', ex);
  }
}
