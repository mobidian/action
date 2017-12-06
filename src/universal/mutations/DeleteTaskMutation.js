import {commitMutation} from 'react-relay';
import {
  getArchiveConnection,
  getTeamDashConnection,
  getUserDashConnection
} from 'universal/mutations/UpdateTaskMutation';
import safeRemoveNodeFromConn from 'universal/utils/relay/safeRemoveNodeFromConn';

const mutation = graphql`
  mutation DeleteTaskMutation($taskId: ID!) {
    deleteTask(taskId: $taskId) {
      task {
        id
      }
    }
  }
`;

export const removeFromTaskConnections = (store, viewerId, taskId, teamId) => {
  // we currently have 3 connections, user, team, and team archive
  const viewer = store.get(viewerId);
  const archiveConn = getArchiveConnection(viewer, teamId);
  const teamConn = getTeamDashConnection(viewer, teamId);
  const userConn = getUserDashConnection(viewer);
  safeRemoveNodeFromConn(taskId, teamConn);
  safeRemoveNodeFromConn(taskId, userConn);
  safeRemoveNodeFromConn(taskId, archiveConn);
};

const DeleteTaskMutation = (environment, taskId, teamId, onError, onCompleted) => {
  const {viewerId} = environment;
  const updater = (store) => {
    removeFromTaskConnections(store, viewerId, taskId, teamId);
  };
  return commitMutation(environment, {
    mutation,
    variables: {taskId},
    updater,
    optimisticUpdater: updater,
    onError,
    onCompleted
  });
};

export default DeleteTaskMutation;
