import {GraphQLFloat, GraphQLID, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLString} from 'graphql';
import connectionDefinitions from 'server/graphql/connectionDefinitions';
import GitHubTask from 'server/graphql/types/GitHubTask';
import GraphQLISO8601Type from 'server/graphql/types/GraphQLISO8601Type';
import PageInfoDateCursor from 'server/graphql/types/PageInfoDateCursor';
import TaskEditorDetails from 'server/graphql/types/TaskEditorDetails';
import TaskStatusEnum from 'server/graphql/types/TaskStatusEnum';
import Team from 'server/graphql/types/Team';
import TeamMember from 'server/graphql/types/TeamMember';

const Task = new GraphQLObjectType({
  name: 'Task',
  description: 'A long-term task shared across the team, assigned to a single user ',
  fields: () => ({
    id: {
      type: GraphQLID,
      description: 'A shortid for the task teamId::shortid'
    },
    agendaId: {
      type: GraphQLID,
      description: 'the agenda item that created this task, if any'
    },
    content: {type: GraphQLString, description: 'The body of the task. If null, it is a new task.'},
    createdAt: {
      type: GraphQLISO8601Type,
      description: 'The timestamp the task was created'
    },
    createdBy: {
      type: GraphQLID,
      description: 'The userId that created the task'
    },
    editors: {
      type: new GraphQLList(TaskEditorDetails),
      description: 'a list of users currently editing the task (fed by a subscription, so queries return null)',
      resolve: ({editors = []}) => {
        return editors;
      }
    },
    integration: {
      // TODO replace this with TaskIntegration when we remove cashay. it doens't handle intefaces well
      type: GitHubTask
    },
    sortOrder: {
      type: GraphQLFloat,
      description: 'the shared sort order for tasks on the team dash & user dash'
    },
    // TODO make this nonnull again
    status: {
      type: TaskStatusEnum,
      description: 'The status of the task'
    },
    tags: {
      type: new GraphQLList(GraphQLString),
      description: 'The tags associated with the task'
    },
    teamId: {
      type: GraphQLID,
      description: 'The id of the team (indexed). Needed for subscribing to archived tasks'
    },
    team: {
      type: Team,
      description: 'The team this task belongs to',
      resolve: ({teamId}, args, {getDataLoader}) => {
        return getDataLoader().teams.load(teamId);
      }
    },
    teamMember: {
      type: TeamMember,
      description: 'The team member that owns this task',
      resolve: ({teamMemberId}, args, {getDataLoader}) => {
        return getDataLoader().teamMembers.load(teamMemberId);
      }
    },
    teamMemberId: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'The id of the team member assigned to this task, or the creator if content is null'
    },
    updatedAt: {
      type: GraphQLISO8601Type,
      description: 'The timestamp the task was updated'
    },
    userId: {
      type: GraphQLID,
      description: '* The userId, index useful for server-side methods getting all tasks under a user'
    }
  })
});

const {connectionType, edgeType} = connectionDefinitions({
  nodeType: Task,
  edgeFields: () => ({
    cursor: {
      type: GraphQLISO8601Type
    }
  }),
  connectionFields: () => ({
    pageInfo: {
      type: PageInfoDateCursor,
      description: 'Page info with cursors coerced to ISO8601 dates'
    }
  })
});

export const TaskConnection = connectionType;
export const TaskEdge = edgeType;
export default Task;
