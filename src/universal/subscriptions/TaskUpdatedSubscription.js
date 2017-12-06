import {handleTaskConnections} from 'universal/mutations/UpdateTaskMutation';
import {handleEditingFromPayload} from 'universal/mutations/EditTaskMutation';

const subscription = graphql`
  subscription TaskUpdatedSubscription($teamIds: [ID!]) {
    taskUpdated(teamIds: $teamIds) {
      task {
        id
        agendaId
        content
        createdAt
        createdBy
        integration {
          service
          nameWithOwner
          issueNumber
        }
        sortOrder
        status
        tags
        teamMemberId
        updatedAt
        userId
        teamId
        team {
          id
          name
        }
        teamMember {
          id
          picture
          preferredName
        }
      }
      editor {
        taskId
        editing
        user {
          userId: id
          preferredName
        }
      }
    }
  }
`;

const TaskUpdatedSubscription = (environment, queryVariables, subParams) => {
  const {viewerId} = environment;
  const {operationName} = subParams;
  const {teamId} = queryVariables;
  // kinda hacky, but cleaner than creating a separate file
  const variables = operationName === 'UserDashRootQuery' ? {} : {teamIds: [teamId]};
  return {
    subscription,
    variables,
    updater: (store) => {
      const payload = store.getRootField('taskUpdated');
      const task = payload.getLinkedRecord('task');
      handleTaskConnections(store, viewerId, task);

      const editor = payload.getLinkedRecord('editor');
      handleEditingFromPayload(store, editor);
    }
  };
};

export default TaskUpdatedSubscription;
