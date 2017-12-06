import {commitMutation} from 'react-relay';
import {handleTaskConnections} from 'universal/mutations/UpdateTaskMutation';
import makeEmptyStr from 'universal/utils/draftjs/makeEmptyStr';
import createProxyRecord from 'universal/utils/relay/createProxyRecord';
import toTeamMemberId from 'universal/utils/relay/toTeamMemberId';

const mutation = graphql`
  mutation CreateTaskMutation($newTask: CreateTaskInput!, $area: AreaEnum) {
    createTask(newTask: $newTask, area: $area) {
      task {
        id
        agendaId
        content
        createdAt
        createdBy
        editors {
          preferredName
          userId
        }
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

let tempId = 0;
const CreateTaskMutation = (environment, newTask, area, onError, onCompleted) => {
  const {viewerId} = environment;
  return commitMutation(environment, {
    mutation,
    variables: {
      area,
      newTask
    },
    updater: (store) => {
      const task = store.getRootField('createTask').getLinkedRecord('task');
      handleTaskConnections(store, viewerId, task);
    },
    optimisticUpdater: (store) => {
      const {teamId, userId} = newTask;
      const teamMemberId = toTeamMemberId(teamId, userId);
      const now = new Date().toJSON();
      const optimisticTask = {
        ...newTask,
        id: `${teamId}::$${tempId++}`,
        teamId,
        userId,
        createdAt: now,
        createdBy: userId,
        updatedAt: now,
        tags: [],
        teamMemberId,
        content: newTask.content || makeEmptyStr()
      };
      const task = createProxyRecord(store, 'Task', optimisticTask)
        .setLinkedRecords([], 'editors')
        .setLinkedRecord(store.get(teamMemberId), 'teamMember')
        .setLinkedRecord(store.get(teamId), 'team');


      handleTaskConnections(store, viewerId, task);
    },
    onError,
    onCompleted
  });
};

export default CreateTaskMutation;
