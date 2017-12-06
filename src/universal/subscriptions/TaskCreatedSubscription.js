import {handleTaskConnections} from 'universal/mutations/UpdateTaskMutation';

const subscription = graphql`
  subscription TaskCreatedSubscription($teamIds: [ID!]) {
    taskCreated(teamIds: $teamIds) {
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
    }
  }
`;

const TaskCreatedSubscription = (environment, queryVariables, subParams) => {
  const {viewerId} = environment;
  const {operationName} = subParams;
  const {teamId} = queryVariables;
  // kinda hacky, but cleaner than creating a separate file
  const variables = operationName === 'UserDashRootQuery' ? {} : {teamIds: [teamId]};
  return {
    subscription,
    variables,
    updater: (store) => {
      const task = store.getRootField('taskCreated').getLinkedRecord('task');
      handleTaskConnections(store, viewerId, task);
    }
  };
};

export default TaskCreatedSubscription;
