import {GraphQLNonNull, GraphQLObjectType} from 'graphql';
import Task from 'server/graphql/types/Task';
import TaskEditorPayload from 'server/graphql/types/TaskEditorPayload';

const UpdateTaskPayload = new GraphQLObjectType({
  name: 'UpdateTaskPayload',
  fields: () => ({
    task: {
      type: new GraphQLNonNull(Task)
    },
    editor: {
      type: TaskEditorPayload,
      description: 'An announcement to all subscribers that someone is editing the task'
    }
  })
});

export default UpdateTaskPayload;
