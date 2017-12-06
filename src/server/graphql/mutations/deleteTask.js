import {GraphQLID, GraphQLNonNull} from 'graphql';
import getRethink from 'server/database/rethinkDriver';
import DeleteTaskPayload from 'server/graphql/types/DeleteTaskPayload';
import {getUserId, requireSUOrTeamMember} from 'server/utils/authorization';
import getPubSub from 'server/utils/getPubSub';
import {NOTIFICATIONS_CLEARED, TASK_DELETED, TASK_INVOLVES} from 'universal/utils/constants';
import getTypeFromEntityMap from 'universal/utils/draftjs/getTypeFromEntityMap';

export default {
  type: DeleteTaskPayload,
  description: 'Delete (not archive!) a task',
  args: {
    taskId: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'The taskId to delete'
    }
  },
  async resolve(source, {taskId}, {authToken, getDataLoader}) {
    const r = getRethink();
    const dataLoader = getDataLoader();
    const operationId = dataLoader.share();

    // AUTH
    const userId = getUserId(authToken);
    // format of id is teamId::shortId
    const [teamId] = taskId.split('::');
    requireSUOrTeamMember(authToken, teamId);

    // RESOLUTION
    const {task} = await r({
      task: r.table('Task').get(taskId).delete({returnChanges: true})('changes')(0)('old_val').default(null),
      taskHistory: r.table('TaskHistory')
        .between([taskId, r.minval], [taskId, r.maxval], {index: 'taskIdUpdatedAt'})
        .delete()
    });
    if (!task) {
      throw new Error('Task does not exist');
    }
    const taskDeleted = {task};
    getPubSub().publish(`${TASK_DELETED}.${teamId}`, {taskDeleted, operationId});
    getPubSub().publish(`${TASK_DELETED}.${userId}`, {taskDeleted, operationId});

    // handle notifications
    const {entityMap} = JSON.parse(task.content);
    const userIdsWithNotifications = getTypeFromEntityMap('MENTION', entityMap).concat(task.userId);
    const clearedNotifications = await r.table('Notification')
      .getAll(r.args(userIdsWithNotifications), {index: 'userIds'})
      .filter({
        taskId: task.id,
        type: TASK_INVOLVES
      })
      .delete({returnChanges: true})('changes')('old_val')
      .pluck('id', 'userIds')
      .default([]);
    clearedNotifications.forEach((notification) => {
      const notificationsCleared = {deletedIds: [notification.id]};
      const notificationUserId = notification.userIds[0];
      getPubSub().publish(`${NOTIFICATIONS_CLEARED}.${notificationUserId}`, {notificationsCleared});
    });

    return taskDeleted;
  }
};
