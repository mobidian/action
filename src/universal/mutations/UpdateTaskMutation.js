import {commitMutation} from 'react-relay';
import {ConnectionHandler} from 'relay-runtime';
import getTagsFromEntityMap from 'universal/utils/draftjs/getTagsFromEntityMap';
import getNodeById from 'universal/utils/relay/getNodeById';
import {insertEdgeAfter} from 'universal/utils/relay/insertEdge';
import safeRemoveNodeFromConn from 'universal/utils/relay/safeRemoveNodeFromConn';
import toTeamMemberId from 'universal/utils/relay/toTeamMemberId';
import updateProxyRecord from 'universal/utils/relay/updateProxyRecord';

const mutation = graphql`
  mutation UpdateTaskMutation($updatedTask: UpdateTaskInput!) {
    updateTask(updatedTask: $updatedTask) {
      task {
        id
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

export const getUserDashConnection = (viewer) => ConnectionHandler.getConnection(
  viewer,
  'UserColumnsContainer_tasks'
);

export const getTeamDashConnection = (viewer, teamId) => ConnectionHandler.getConnection(
  viewer,
  'TeamColumnsContainer_tasks',
  {teamId}
);

export const getArchiveConnection = (viewer, teamId) => ConnectionHandler.getConnection(
  viewer,
  'TeamArchive_archivedTasks',
  {teamId}
);

// export const getMeetingUpdatesConnections = (store, teamId) => {
//  const team = store.get(teamId);
//  if (!team) return [];
//  const teamMembers = team.getLinkedRecords('teamMembers', {sortBy: 'checkInOrder'});
//  if (!teamMembers) return [];
//  return teamMembers.map((teamMember) => {
//    return ConnectionHandler.getConnection(
//      teamMember,
//      'MeetingUpdates_tasks'
//    );
//  })
// };

export const handleTaskConnections = (store, viewerId, task) => {
  // we currently have 3 connections, user, team, and team archive
  const viewer = store.get(viewerId);
  const teamId = task.getValue('teamId');
  const taskId = task.getValue('id');
  const tags = task.getValue('tags');
  const isNowArchived = tags.includes('archived');
  const archiveConn = getArchiveConnection(viewer, teamId);
  const teamConn = getTeamDashConnection(viewer, teamId);
  const userConn = getUserDashConnection(viewer);
  const safePutNodeInConn = (conn) => {
    if (conn && !getNodeById(taskId, conn)) {
      const newEdge = ConnectionHandler.createEdge(
        store,
        conn,
        task,
        'TaskEdge'
      );
      newEdge.setValue(task.getValue('updatedAt'), 'cursor');
      insertEdgeAfter(conn, newEdge, 'updatedAt');
    }
  };

  if (isNowArchived) {
    safeRemoveNodeFromConn(taskId, teamConn);
    safeRemoveNodeFromConn(taskId, userConn);
    safePutNodeInConn(archiveConn);
  } else {
    safeRemoveNodeFromConn(taskId, archiveConn);
    safePutNodeInConn(teamConn);
    if (userConn) {
      const ownedByViewer = task.getValue('userId') === viewerId;
      if (ownedByViewer) {
        safePutNodeInConn(userConn);
      } else {
        safeRemoveNodeFromConn(taskId, userConn);
      }
    }
  }
};

const UpdateTaskMutation = (environment, updatedTask, area, onCompleted, onError) => {
  const {viewerId} = environment;
  // use this as a temporary fix until we get rid of cashay because otherwise relay will roll back the change
  // which means we'll have 2 items, then 1, then 2, then 1. i prefer 2, then 1.
  return commitMutation(environment, {
    mutation,
    variables: {
      area,
      updatedTask
    },
    updater: (store) => {
      const task = store.getRootField('updateTask').getLinkedRecord('task');
      handleTaskConnections(store, viewerId, task);
    },
    optimisticUpdater: (store) => {
      const {id, content, userId} = updatedTask;
      const task = store.get(id);
      if (!task) return;
      const now = new Date();
      const optimisticTask = {
        ...updatedTask,
        updatedAt: now.toJSON()
      };
      updateProxyRecord(task, optimisticTask);
      if (userId) {
        const teamMemberId = toTeamMemberId(task.getValue('teamId'), userId);
        task.setValue(teamMemberId, 'teamMemberId');
        const teamMember = store.get(teamMemberId);
        if (teamMember) {
          task.setLinkedRecord(teamMember, 'teamMember');
        }
      }
      if (content) {
        const {entityMap} = JSON.parse(content);
        const nextTags = getTagsFromEntityMap(entityMap);
        task.setValue(nextTags, 'tags');
      }
      handleTaskConnections(store, viewerId, task);
    },
    onCompleted,
    onError
  });
};

export default UpdateTaskMutation;
