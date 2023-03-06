import { APIResponse, IClient, IIndustry, IUserGroup } from '@/../../shared/types/src';
import { AppDataSource } from '@/databases';
import { TeamMemberEntity } from '@/entities/teammember.entity';
import { UserEntity } from '@/entities/user.entity';
import { UserGroupEntity } from '@/entities/usergroup.entity';
import { HttpException } from '@/exceptions/HttpException';
import authMiddleware from '@/middlewares/auth.middleware';
import cache from '@/utils/cache';
import { logger } from '@/utils/logger';
import { JsonController, UseBefore, Get, Authorized, Post, Body, CurrentUser, Delete, Param, QueryParam, HttpError } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { In } from 'typeorm';

@JsonController('/api/usergroup')
@UseBefore(authMiddleware)
export class UserGroupController {
  @Get('/:type')
  @OpenAPI({ summary: 'Return usergroups matched by the query' })
  @Authorized(['usergroup.read'])
  async listUserGroups(@Param('type') type: string) {
    const result = new APIResponse<IUserGroup[]>();
    const matchedUsergroups = await AppDataSource.getRepository(UserGroupEntity).find({
      where: {
        type,
      },
      relations: {
        team: {
          user: true,
        },
      },
      order: {
        name: 'ASC',
      },
    });
    logger.info(`fetched ${matchedUsergroups.length} usergroups.`);
    result.data = matchedUsergroups.map(p => p.toJSON());

    return result;
  }

  @Post('/')
  @OpenAPI({ summary: 'Create/Update a UserGroup`' })
  @Authorized(['usergroup.write'])
  async upsertUserGroup(@Body() data: IUserGroup) {
    try {
      const result = new APIResponse<IUserGroup>();
      let usergroup: UserGroupEntity;
      if (data.id === -1) {
        usergroup = new UserGroupEntity();
      } else {
        usergroup = await AppDataSource.getRepository(UserGroupEntity).findOne({
          where: { id: data.id },
          relations: {
            team: {
              user: true,
            },
          },
        });
        if (usergroup === null) {
          throw new HttpException(400, 'Invalid usergroup to update');
        }
      }
      // logger.debug(JSON.stringify(data));
      if (data.name) usergroup.name = data.name;
      if (data.type) usergroup.type = data.type;
      if (data.team) {
        const team: TeamMemberEntity[] = [];
        for await (const memberData of data.team) {
          if (memberData.user.id === -1) continue;
          let newTeamMember = await AppDataSource.getRepository(TeamMemberEntity).findOne({
            where: {
              id: memberData.id,
            },
            relations: {
              user: true,
            },
          });
          if (!newTeamMember) {
            newTeamMember = new TeamMemberEntity();
          }
          newTeamMember.user = await UserEntity.getUserById(memberData.user.id);
          newTeamMember.role = memberData.role;
          newTeamMember.details = memberData.details;
          await newTeamMember.save();
          team.push(newTeamMember);
          const CACHEKEY = `usergroups-${newTeamMember.user.id}`;
          cache.del(CACHEKEY);
        }
        usergroup.team = team;
      }
      await AppDataSource.getRepository(UserGroupEntity).manager.save(usergroup);
      //delete teammembers that are NOT referred by any usergroup
      AppDataSource.query(`DELETE FROM teammember WHERE id NOT IN (SELECT "teammemberId" FROM usergroup_team_teammember)`);

      result.data = usergroup.toJSON();

      return result;
    } catch (ex) {
      logger.error(JSON.stringify(ex));
      throw new HttpError(500);
    }
  }

  @Delete('/')
  @Authorized(['usergroup.write'])
  @OpenAPI({ summary: 'Delete a set of usergroups' })
  async deletePermission(@QueryParam('ids') ids: string) {
    const usergroupRepo = AppDataSource.getRepository(UserGroupEntity);

    const idlist = ids.split(',').map(v => parseInt(v));
    const groups = await usergroupRepo.find({ where: { id: In(idlist) } });

    await usergroupRepo.remove(groups);

    return { data: ids, message: 'deleted' };
  }
}
