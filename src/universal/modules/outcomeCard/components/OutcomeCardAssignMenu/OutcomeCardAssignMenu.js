import PropTypes from 'prop-types';
import React from 'react';
import {createFragmentContainer} from 'react-relay';
import withAtmosphere from 'universal/decorators/withAtmosphere/withAtmosphere';
import {MenuItem} from 'universal/modules/menu';
import UpdateTaskMutation from 'universal/mutations/UpdateTaskMutation';
import fromTeamMemberId from 'universal/utils/relay/fromTeamMemberId';

const OutcomeCardAssignMenu = (props) => {
  const {
    atmosphere,
    area,
    closePortal,
    task: {taskId, teamMember: {ownerId}, team: {teamMembers}}
  } = props;

  const handleTaskUpdate = (newOwner) => {
    if (newOwner === ownerId) {
      return;
    }
    const {userId} = fromTeamMemberId(newOwner);
    const updatedTask = {
      id: taskId,
      userId
    };
    UpdateTaskMutation(atmosphere, updatedTask, area);
  };

  const itemFactory = () => {
    return teamMembers
      .filter((teamMember) => teamMember.id !== ownerId)
      .map((teamMember) => {
        return (
          <MenuItem
            key={teamMember.id}
            avatar={teamMember.picture}
            isActive={ownerId === teamMember.id}
            label={teamMember.preferredName}
            onClick={() => handleTaskUpdate(teamMember.id)}
            closePortal={closePortal}
          />
        );
      });
  };

  return (
    <div>
      {itemFactory()}
    </div>
  );
};

OutcomeCardAssignMenu.propTypes = {
  area: PropTypes.string.isRequired,
  atmosphere: PropTypes.object.isRequired,
  closePortal: PropTypes.func.isRequired,
  task: PropTypes.object.isRequired
};

export default createFragmentContainer(
  withAtmosphere(OutcomeCardAssignMenu),
  graphql`
    fragment OutcomeCardAssignMenu_task on Task {
      taskId: id
      team {
        teamMembers(sortBy: "preferredName") {
          id
          picture
          preferredName
          teamId
          userId
        }
      }
      teamMember {
        ownerId: id
      }
    }
  `
);
