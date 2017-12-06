import {removeFromTaskConnections} from 'universal/mutations/DeleteTaskMutation';

const subscription = graphql`
  subscription TaskDeletedSubscription($teamIds: [ID!]) {
    taskDeleted(teamIds: $teamIds) {
      task {
        id
        teamId
      }
    }
  }
`;

const TaskDeletedSubscription = (environment, queryVariables, subParams) => {
  const {viewerId} = environment;
  const {operationName} = subParams;
  // kinda hacky, but cleaner than creating a separate file
  const variables = operationName === 'UserDashRootQuery' ? {} : {teamIds: [queryVariables.teamId]};
  return {
    subscription,
    variables,
    updater: (store) => {
      const task = store.getRootField('taskDeleted').getLinkedRecord('task');
      const taskId = task.getValue('id');
      const teamId = task.getValue('teamId');
      removeFromTaskConnections(store, viewerId, taskId, teamId);
    }
  };
};

export default TaskDeletedSubscription;
