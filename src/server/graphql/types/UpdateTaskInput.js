import {GraphQLFloat, GraphQLID, GraphQLInputObjectType, GraphQLString} from 'graphql';
import TaskStatusEnum from 'server/graphql/types/TaskStatusEnum';

const UpdateTaskInput = new GraphQLInputObjectType({
  name: 'UpdateTaskInput',
  fields: () => ({
    id: {
      type: GraphQLID,
      description: 'The task id'
    },
    content: {type: GraphQLString},
    sortOrder: {type: GraphQLFloat},
    status: {type: TaskStatusEnum},
    userId: {
      type: GraphQLID,
      description: 'the owner of the task'
    }
  })
});

export default UpdateTaskInput;
