import {GraphQLBoolean, GraphQLID, GraphQLNonNull} from 'graphql';
import UpdateTaskPayload from 'server/graphql/types/UpdateTaskPayload';
import {getUserId, requireSUOrTeamMember} from 'server/utils/authorization';
import getPubSub from 'server/utils/getPubSub';
import {TASK_UPDATED} from 'universal/utils/constants';

export default {
  type: UpdateTaskPayload,
  description: 'Annouce to everyone that you are editing a task',
  args: {
    taskId: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'The task id that is being edited'
    },
    editing: {
      type: new GraphQLNonNull(GraphQLBoolean),
      description: 'true if the editing is starting, false if it is stopping'
    }
  },
  async resolve(source, {taskId, editing}, {authToken, socketId, getDataLoader}) {
    const dataLoader = getDataLoader();
    const operationId = dataLoader.share();

    // AUTH
    const userId = getUserId(authToken);
    const [teamId] = taskId.split('::');
    requireSUOrTeamMember(authToken, teamId);

    // RESOLUTION
    // grab the task to see if it's private, don't share with other if it is
    const task = await dataLoader.tasks.load(taskId);
    const mutatorId = socketId;
    const taskUpdated = {
      task,
      editor: {
        userId,
        taskId,
        editing
      }
    };
    getPubSub().publish(`${TASK_UPDATED}.${teamId}`, {taskUpdated, mutatorId, operationId});
    getPubSub().publish(`${TASK_UPDATED}.${userId}`, {taskUpdated, mutatorId, operationId});
    return taskUpdated;
  }
};
