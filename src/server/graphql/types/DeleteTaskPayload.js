import {GraphQLObjectType} from 'graphql';
import Task from 'server/graphql/types/Task';

const DeleteTaskPayload = new GraphQLObjectType({
  name: 'DeleteTaskPayload',
  fields: () => ({
    task: {
      type: Task,
      description: 'The task that was deleted'
    }
  })
});

export default DeleteTaskPayload;
