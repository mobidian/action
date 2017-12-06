import {GraphQLID, GraphQLList, GraphQLNonNull} from 'graphql';
import makeSubscribeIter from 'server/graphql/makeSubscribeIter';
import CreateTaskPayload from 'server/graphql/types/CreateTaskPayload';
import {getUserId, requireSUOrTeamMember} from 'server/utils/authorization';
import {TASK_CREATED} from 'universal/utils/constants';

export default {
  type: new GraphQLNonNull(CreateTaskPayload),
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
    const channelNames = channelIds.map((id) => `${TASK_CREATED}.${id}`);
    const filterFn = (value) => {
      const {taskCreated: {task: {tags, userId: taskUserId}}, mutatorId} = value;
      if (mutatorId === socketId) return false;
      const isPrivate = tags.includes('private');
      return !isPrivate || userId === taskUserId;
    };
    return makeSubscribeIter(channelNames, {filterFn, getDataLoader});
  }
};
