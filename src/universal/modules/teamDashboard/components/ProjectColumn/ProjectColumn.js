import {css} from 'aphrodite-local-styles/no-important';
import {cashay} from 'cashay';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {DropTarget as dropTarget} from 'react-dnd';
import withScrolling from 'react-dnd-scrollzone';
import FontAwesome from 'react-fontawesome';
import shortid from 'shortid';
import AddProjectButton from 'universal/components/AddProjectButton/AddProjectButton';
import Badge from 'universal/components/Badge/Badge';
import ProjectCardContainer from 'universal/containers/ProjectCard/ProjectCardContainer';
import withAtmosphere from 'universal/decorators/withAtmosphere/withAtmosphere';
import handleColumnDrop from 'universal/dnd/handleColumnDrop';
import handleDrop from 'universal/dnd/handleDrop';
import withDragState from 'universal/dnd/withDragState';
import {Menu, MenuItem} from 'universal/modules/menu';
import CreateProjectMutation from 'universal/mutations/CreateProjectMutation';
import {overflowTouch} from 'universal/styles/helpers';
import projectStatusStyles from 'universal/styles/helpers/projectStatusStyles';
import appTheme from 'universal/styles/theme/appTheme';
import themeLabels from 'universal/styles/theme/labels';
import ui from 'universal/styles/ui';
import withStyles from 'universal/styles/withStyles';
import {MEETING, PROJECT, SORT_STEP, TEAM_DASH, USER_DASH} from 'universal/utils/constants';
import dndNoise from 'universal/utils/dndNoise';
import getNextSortOrder from 'universal/utils/getNextSortOrder';
import {connect} from 'react-redux';
import {withRouter} from 'react-router';

// The `ScrollZone` component manages an overflowed block-level element,
// scrolling its contents when another element is dragged close to its edges.
const ScrollZone = withScrolling('div');

const originAnchor = {
  vertical: 'bottom',
  horizontal: 'right'
};

const targetAnchor = {
  vertical: 'top',
  horizontal: 'right'
};

const badgeColor = {
  done: 'dark',
  active: 'cool',
  stuck: 'warm',
  future: 'mid'
};

const handleAddProjectFactory = (atmosphere, dispatch, history, status, teamMemberId, sortOrder) => () => {
  const [, teamId] = teamMemberId.split('::');
  const newProject = {
    id: `${teamId}::${shortid.generate()}`,
    status,
    teamMemberId,
    sortOrder
  };
  CreateProjectMutation(atmosphere, newProject);
};

class ProjectColumn extends Component {
  makeAddProject = () => {
    const {
      area,
      atmosphere,
      dispatch,
      history,
      isMyMeetingSection,
      status,
      projects,
      myTeamMemberId,
      queryKey,
      teams,
      userId
    } = this.props;
    const label = themeLabels.projectStatus[status].slug;
    const sortOrder = getNextSortOrder(projects, dndNoise());
    if (area === TEAM_DASH || isMyMeetingSection) {
      const teamMemberId = queryKey.indexOf('::') === -1 ? myTeamMemberId : queryKey;
      const handleAddProject = handleAddProjectFactory(atmosphere, dispatch, history, status, teamMemberId, sortOrder);
      return <AddProjectButton onClick={handleAddProject} label={label} />;
    } else if (area === USER_DASH) {
      if (teams.length === 1) {
        const {id: teamId} = teams[0];
        const generatedMyTeamMemberId = `${userId}::${teamId}`;
        const handleAddProject = handleAddProjectFactory(atmosphere, dispatch, history, status, generatedMyTeamMemberId, sortOrder);
        return <AddProjectButton onClick={handleAddProject} label={label} />;
      }
      const itemFactory = () => {
        const menuItems = this.makeTeamMenuItems(atmosphere, dispatch, history, sortOrder);
        return menuItems.map((item) =>
          (<MenuItem
            key={`MenuItem${item.label}`}
            label={item.label}
            onClick={item.handleClick}
          />)
        );
      };

      const toggle = <AddProjectButton label={label} />;
      return (
        <Menu
          itemFactory={itemFactory}
          originAnchor={originAnchor}
          menuWidth="10rem"
          targetAnchor={targetAnchor}
          toggle={toggle}
          label="Select Team:"
        />
      );
    }
    return null;
  };

  sortOrderBetween = (targetProject, boundingProject, newProjectId, before) => {
    if (targetProject == null) {
      throw new Error('targetProject cannot be null');
    }
    if (boundingProject == null) {
      return targetProject.sortOrder + ((SORT_STEP + dndNoise()) * (before ? -1 : 1));
    } else {
      return boundingProject.id === newProjectId
        ? boundingProject.sortOrder
        : (boundingProject.sortOrder + targetProject.sortOrder) / 2 + dndNoise();
    }
  };

  insertProject = (newProjectId, targetProjectId, before) => {
    const areaOpLookup = {
      [MEETING]: 'meetingUpdatesContainer',
      [USER_DASH]: 'userColumnsContainer',
      [TEAM_DASH]: 'teamColumnsContainer'
    };

    const {area, projects, queryKey} = this.props;
    const targetIndex = projects.findIndex((p) => p.id === targetProjectId);

    const targetProject = projects[targetIndex];
    const boundingProject = projects[targetIndex + (before ? -1 : 1)];

    const sortOrder = this.sortOrderBetween(targetProject, boundingProject, newProjectId, before);
    console.log('targetProject, boundingProject, computed:', targetProject.sortOrder, boundingProject && boundingProject.sortOrder, sortOrder);

    const {status} = targetProject;
    const gqlArgs = {
      area,
      updatedProject: {id: newProjectId, status, sortOrder}
    };
    const op = areaOpLookup[area];
    const cashayArgs = {
      ops: {[op]: queryKey},
      variables: gqlArgs
    };
    cashay.mutate('updateProject', cashayArgs);
  };

  makeTeamMenuItems = (atmosphere, dispatch, history, sortOrder) => {
    const {
      status,
      teams,
      userId
    } = this.props;
    return teams.map((team) => ({
      label: team.name,
      handleClick: () => {
        const newProject = {
          id: `${team.id}::${shortid.generate()}`,
          status,
          teamMemberId: `${userId}::${team.id}`,
          sortOrder
        };
        CreateProjectMutation(atmosphere, newProject);
      }
    }));
  };

  render() {
    const {
      area,
      connectDropTarget,
      dragState,
      firstColumn,
      lastColumn,
      status,
      projects,
      styles,
      userId
    } = this.props;
    const label = themeLabels.projectStatus[status].slug;
    const columnStyles = css(
      styles.column,
      firstColumn && styles.columnFirst,
      lastColumn && styles.columnLast
    );

    // reset every rerender so we make sure we got the freshest info
    dragState.clear();
    return connectDropTarget(
      <div className={columnStyles}>
        <div className={css(styles.columnHeader)}>
          <div className={css(styles.statusLabelBlock)}>
            <span className={css(styles.statusIcon, styles[status])}>
              <FontAwesome name={themeLabels.projectStatus[status].icon} />
            </span>
            <span className={css(styles.statusLabel, styles[status])}>
              {label}
            </span>
            {(projects.length > 0) &&
            <span className={css(styles.statusBadge)}>
              <Badge colorPalette={badgeColor[status]} flat value={projects.length} />
            </span>
            }
          </div>
          {this.makeAddProject()}
        </div>
        <div className={css(styles.columnBody)}>
          <ScrollZone className={css(styles.columnInner)}>
            {projects.map((project) =>
              (<ProjectCardContainer
                key={`teamCard${project.id}`}
                area={area}
                project={project}
                dragState={dragState}
                myUserId={userId}
                insert={(projectId, before) => this.insertProject(projectId, project.id, before)}
                ref={(c) => {
                  if (c) {
                    dragState.components.push(c);
                  }
                }}
              />))
            }
          </ScrollZone>
        </div>
      </div>
    );
  }
}


ProjectColumn.propTypes = {
  area: PropTypes.string,
  atmosphere: PropTypes.object.isRequired,
  connectDropTarget: PropTypes.func,
  dispatch: PropTypes.func.isRequired,
  dragState: PropTypes.object,
  firstColumn: PropTypes.bool,
  history: PropTypes.object.isRequired,
  isMyMeetingSection: PropTypes.bool,
  lastColumn: PropTypes.bool,
  myTeamMemberId: PropTypes.string,
  projects: PropTypes.array.isRequired,
  queryKey: PropTypes.string,
  status: PropTypes.string,
  styles: PropTypes.object,
  teams: PropTypes.array,
  userId: PropTypes.string
};

const styleThunk = () => ({
  column: {
    borderLeft: `2px dashed ${ui.dashBorderColor}`,
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    overflow: 'auto',
    position: 'relative',
    width: '25%'
  },

  columnFirst: {
    borderLeft: 0
  },

  columnLast: {
    // keeping this around, we may need it (TA)
  },

  columnHeader: {
    color: appTheme.palette.dark,
    display: 'flex !important',
    lineHeight: '1.5rem',
    padding: '.5rem 1rem',
    position: 'relative'
  },

  columnBody: {
    flex: 1,
    position: 'relative'
  },

  columnInner: {
    ...overflowTouch,
    height: '100%',
    padding: '0 1rem',
    position: 'absolute',
    width: '100%'
  },

  statusLabelBlock: {
    alignItems: 'center',
    display: 'flex',
    flex: 1,
    fontSize: appTheme.typography.s3
  },

  statusIcon: {
    fontSize: '14px',
    marginRight: '.25rem',
    paddingTop: 1,
    textAlign: 'center',
    verticalAlign: 'middle'
  },

  statusLabel: {
    fontWeight: 700,
    paddingTop: 2,
    textTransform: 'uppercase'
  },

  statusBadge: {
    marginLeft: '.5rem'
  },

  ...projectStatusStyles('color')
});

// specifies behavior on `drop` and `hover` events
const columnTargetSpec = {
  drop: handleColumnDrop
};

// returns props to merge into the component based on dnd state
const columnTargetCollect = (connect) => ({
  connectDropTarget: connect.dropTarget()
});

export default connect()(
  withAtmosphere(
    withRouter(
      withDragState(
        dropTarget(PROJECT, columnTargetSpec, columnTargetCollect)(
          withStyles(styleThunk)(ProjectColumn)
        )
      )
    )
  )
);
