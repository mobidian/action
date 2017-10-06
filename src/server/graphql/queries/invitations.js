import {GraphQLID, GraphQLList, GraphQLNonNull} from 'graphql';
import getRethink from 'server/database/rethinkDriver';
import Invitation from 'server/graphql/types/Invitation';
import {requireSUOrTeamMember} from 'server/utils/authorization';

export default {
  type: new GraphQLList(Invitation),
  args: {
    teamId: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'The unique team ID'
    }
  },
  async resolve(source, {teamId}, {authToken}) {
    const r = getRethink();
    const now = new Date();

    // AUTH
    requireSUOrTeamMember(authToken, teamId);

    // RESOLUTION
    return r.table('Invitation')
      .getAll(teamId, {index: 'teamId'})
      .filter(r.row('tokenExpiration').ge(now));
  }
};
