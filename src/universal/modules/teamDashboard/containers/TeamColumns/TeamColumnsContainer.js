import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {createFragmentContainer} from 'react-relay';
import TaskColumns from 'universal/components/TaskColumns/TaskColumns';
import {TEAM_DASH} from 'universal/utils/constants';

const mapStateToProps = (state, props) => {
  const {teamId} = props;
  const {teamMemberFilterId} = state.teamDashboard;
  const userId = state.auth.obj.sub;
  return {
    myTeamMemberId: `${userId}::${teamId}`,
    teamMemberFilterId
  };
};


class TeamColumnsContainer extends Component {
  componentWillMount() {
    this.filterByTeamMember(this.props);
  }

  componentWillReceiveProps(nextProps) {
    const {teamMemberFilterId: oldFilter, viewer: {tasks: oldTasks}} = this.props;
    const {teamMemberFilterId, viewer: {tasks}} = nextProps;
    if (oldFilter !== teamMemberFilterId || oldTasks !== tasks) {
      this.filterByTeamMember(nextProps);
    }
  }

  filterByTeamMember(props) {
    const {teamMemberFilterId, viewer: {tasks, team: {teamMembers}}} = props;
    const edges = teamMemberFilterId ?
      tasks.edges.filter(({node}) => node.teamMember.id === teamMemberFilterId) :
      tasks.edges;
    const edgesWithTeamMembers = edges.map((edge) => {
      return {
        ...edge,
        node: {
          ...edge.node,
          teamMembers
        }
      };
    });
    this.setState({
      tasks: {
        ...tasks,
        edges: edgesWithTeamMembers
      }
    });
  }

  render() {
    const {myTeamMemberId, teamMemberFilterId} = this.props;
    const {tasks} = this.state;
    return (
      <TaskColumns
        myTeamMemberId={myTeamMemberId}
        tasks={tasks}
        teamMemberFilterId={teamMemberFilterId}
        area={TEAM_DASH}
      />
    );
  }
}

TeamColumnsContainer.propTypes = {
  myTeamMemberId: PropTypes.string,
  teamId: PropTypes.string.isRequired,
  teamMemberFilterId: PropTypes.string,
  viewer: PropTypes.object.isRequired
};

export default createFragmentContainer(
  connect(mapStateToProps)(TeamColumnsContainer),
  graphql`
    fragment TeamColumnsContainer_viewer on User {
      team(teamId: $teamId) {
        teamMembers(sortBy: "checkInOrder") {
          id
          picture
          preferredName
        }
      }
      tasks(first: 1000, teamId: $teamId) @connection(key: "TeamColumnsContainer_tasks") {
        edges {
          node {
            # grab these so we can sort correctly
            id
            status
            sortOrder
            teamMember {
              id
            }
            ...DraggableTask_task
          }
        }
      }
      
    }`
);
