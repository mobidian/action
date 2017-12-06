import {GraphQLID, GraphQLList, GraphQLNonNull} from 'graphql';
import makeSubscribeIter from 'server/graphql/makeSubscribeIter';
import DeleteTaskPayload from 'server/graphql/types/DeleteTaskPayload';
import {getUserId, requireSUOrTeamMember} from 'server/utils/authorization';
import {TASK_DELETED} from 'universal/utils/constants';

export default {
  type: new GraphQLNonNull(DeleteTaskPayload),
  args: {
    teamIds: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLID))
    }
  },
  subscribe: async (source, {teamIds}, {authToken, getDataLoader, socketId}) => {
    // AUTH
    const userId = getUserId(authToken);
    if (teamIds) {
      teamIds.forEach((teamId) => {
        requireSUOrTeamMember(authToken, teamId);
      });
    }
    const channelIds = teamIds || [userId];

    // RESOLUTION
    const channelNames = channelIds.map((id) => `${TASK_DELETED}.${id}`);
    const filterFn = (value) => {
      const {taskDeleted: {task: {tags, userId: taskUserId}}, mutatorId} = value;
      if (mutatorId === socketId) return false;
      const isPrivate = tags.includes('private');
      return !isPrivate || userId === taskUserId;
    };
    return makeSubscribeIter(channelNames, {filterFn, getDataLoader});
  }
};
