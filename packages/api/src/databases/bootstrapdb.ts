import { AppDataSource } from '@/databases';
import { PermissionEntity } from '@/entities/permission.entity';
import { UserEntity } from '@/entities/user.entity';
import { UserRoleEntity } from '@/entities/userrole.entity';
import { logger } from '@/utils/logger';
import { In } from 'typeorm';

const defaultPermissions = [
  /* resource.action.group[.data] */
  /* user permissions */
  { name: 'user.read.self.basic', description: 'permission to read basic userdetails data of self' },
  { name: 'user.read.team.basic', description: 'permission to read basic userdetails data of their teams' },
  { name: 'user.read.self.all', description: 'permission to read all userdetails data of self' },
  { name: 'user.read.team.all', description: 'permission to read all userdetails data of their teams' },
  { name: 'user.read.org.all', description: 'permission to read all userdetails data of their org' },
  { name: 'user.read.all.all', description: 'permission to read all userdetails data of all' },

  { name: 'user.write.self.basic', description: 'permission to write basic userdetails data of self' },
  { name: 'user.write.team.basic', description: 'permission to write basic userdetails data of their teams' },
  { name: 'user.write.self.all', description: 'permission to write all userdetails data of self' },
  { name: 'user.write.team.all', description: 'permission to write all userdetails data of their teams' },
  { name: 'user.write.org.all', description: 'permission to write all userdetails data of their org' },
  { name: 'user.write.all.all', description: 'permission to write all userdetails data of all' },

  { name: 'roles.read.self', description: 'permission to read self roles data' },
  { name: 'roles.read.all', description: 'permission to read all roles data' },
  { name: 'roles.write.all', description: 'permission to write all roles data' },

  { name: 'permissions.read.self', description: 'permission to read permissions of self' },
  { name: 'permissions.read.all', description: 'permission to read all permissions' },
  { name: 'permissions.write.all', description: 'permission to read all permissions' },
];

const defaultRoles = [
  {
    name: 'default',
    description: 'default role. every new user will start with this role.',
    permissions: ['user.read.self.basic', 'permissions.read.self'],
  },
  {
    name: 'admin',
    description: 'master admin role.',
    includedRoleNames: ['default'],
    permissions: ['user.read.all.all', 'user.write.all.all', 'roles.read.all', 'roles.write.all', 'permissions.read.all', 'permissions.write.all'],
  },
];

export async function bootstrapPermissions() {
  const permsRepo = AppDataSource.getRepository(PermissionEntity);
  try {
    //create permissions
    for await (const data of defaultPermissions) {
      let perm = await permsRepo.findOne({ where: { name: data.name } });
      if (perm) continue;
      perm = new PermissionEntity();
      perm.name = data.name;
      perm.description = data.description;
      try {
        await perm.save();
        logger.info(`${data.name} permission created.`);
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
      let urole = await rolesRepo.findOne({ where: { name: role.name } });
      if (urole) continue;
      urole = new UserRoleEntity();
      urole.name = role.name;
      urole.description = role.description;

      if (role.includedRoleNames) {
        urole.includedRoleNames = role.includedRoleNames;
      } else {
        urole.includedRoleNames = [];
      }
      try {
        if (role.permissions) {
          urole.permissions = await permsRepo.find({
            where: { name: In(role.permissions) },
          });
        }
        await urole.save();
        logger.info(`${role.name} userrole created.`);
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
}
