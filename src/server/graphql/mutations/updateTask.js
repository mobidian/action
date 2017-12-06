import {GraphQLNonNull} from 'graphql';
import ms from 'ms';
import getRethink from 'server/database/rethinkDriver';
import publishChangeNotifications from 'server/graphql/mutations/helpers/publishChangeNotifications';
import AreaEnum from 'server/graphql/types/AreaEnum';
import UpdateTaskInput from 'server/graphql/types/UpdateTaskInput';
import UpdateTaskPayload from 'server/graphql/types/UpdateTaskPayload';
import {getUserId, requireSUOrTeamMember} from 'server/utils/authorization';
import getPubSub from 'server/utils/getPubSub';
import {handleSchemaErrors} from 'server/utils/utils';
import shortid from 'shortid';
import {MEETING, TASK_UPDATED} from 'universal/utils/constants';
import getTagsFromEntityMap from 'universal/utils/draftjs/getTagsFromEntityMap';
import makeTaskSchema from 'universal/validation/makeTaskSchema';

const DEBOUNCE_TIME = ms('5m');

export default {
  type: UpdateTaskPayload,
  description: 'Update a task with a change in content, ownership, or status',
  args: {
    area: {
      type: AreaEnum,
      description: 'The part of the site where the creation occurred'
    },
    updatedTask: {
      type: new GraphQLNonNull(UpdateTaskInput),
      description: 'the updated task including the id, and at least one other field'
    }
  },
  async resolve(source, {area, updatedTask}, {authToken, getDataLoader, socketId}) {
    const r = getRethink();
    const now = new Date();
    const dataLoader = getDataLoader();
    const operationId = dataLoader.share();

    // AUTH
    const myUserId = getUserId(authToken);
    const {id: taskId} = updatedTask;
    const [teamId] = taskId.split('::');
    requireSUOrTeamMember(authToken, teamId);

    // VALIDATION
    const schema = makeTaskSchema();
    const {errors, data: validUpdatedTask} = schema(updatedTask);
    handleSchemaErrors(errors);

    // RESOLUTION
    const {agendaId, content, status, userId, sortOrder} = validUpdatedTask;

    const newTask = {
      agendaId,
      content,
      status,
      userId,
      tags: content ? getTagsFromEntityMap(JSON.parse(content).entityMap) : undefined,
      teamId,
      teamMemberId: userId ? `${userId}::${teamId}` : undefined,
      sortOrder
    };

    let taskHistory;
    if (Object.keys(updatedTask).length > 2 || newTask.sortOrder === undefined) {
      // if this is anything but a sort update, log it to history
      newTask.updatedAt = now;
      const mergeDoc = {
        content,
        taskId,
        status,
        teamMemberId: newTask.teamMemberId,
        updatedAt: now,
        tags: newTask.tags
      };
      taskHistory = r.table('TaskHistory')
        .between([taskId, r.minval], [taskId, r.maxval], {index: 'taskIdUpdatedAt'})
        .orderBy({index: 'taskIdUpdatedAt'})
        .nth(-1)
        .default({updatedAt: r.epochTime(0)})
        .do((lastDoc) => {
          return r.branch(
            lastDoc('updatedAt').gt(r.epochTime((now - DEBOUNCE_TIME) / 1000)),
            r.table('TaskHistory').get(lastDoc('id')).update(mergeDoc),
            r.table('TaskHistory').insert(lastDoc.merge(mergeDoc, {id: shortid.generate()}))
          );
        });
    }
    const {taskChanges, usersToIgnore} = await r({
      taskChanges: r.table('Task').get(taskId).update(newTask, {returnChanges: true})('changes')(0).default(null),
      history: taskHistory,
      usersToIgnore: area === MEETING ? await r.table('TeamMember')
        .getAll(teamId, {index: 'teamId'})
        .filter({
          isCheckedIn: true
        })('userId')
        .coerceTo('array') : []
    });
    if (!taskChanges) {
      throw new Error('Task already updated or does not exist');
    }

    // send task updated messages
    const {new_val: task, old_val: oldTask} = taskChanges;
    const taskUpdated = {task};
    const affectedUsers = Array.from(new Set([taskChanges.new_val.userId, taskChanges.old_val.userId]));
    affectedUsers.forEach((affectedUserId) => {
      getPubSub().publish(`${TASK_UPDATED}.${affectedUserId}`, {taskUpdated, operationId, mutatorId: socketId});
    });
    getPubSub().publish(`${TASK_UPDATED}.${teamId}`, {taskUpdated, operationId, mutatorId: socketId});

    // send notifications to assignees and mentionees
    publishChangeNotifications(task, oldTask, myUserId, usersToIgnore);

    return taskUpdated;
  }
};
