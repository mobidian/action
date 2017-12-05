import PropTypes from 'prop-types';
import React, { Component } from 'react';
import {findDOMNode} from 'react-dom'
import OutcomeOrNullCard from 'universal/components/OutcomeOrNullCard/OutcomeOrNullCard';
import {PROJECT} from 'universal/utils/constants';
import {DragSource as dragSource, DropTarget as dropTarget} from 'react-dnd';
import {getEmptyImage} from 'react-dnd-html5-backend';
import ProjectDragLayer from './ProjectDragLayer';

const importantProps = ['content', 'status', 'teamMemberId', 'sortOrder', 'integration'];

class ProjectCardContainer extends Component {
  componentDidMount() {
    const {connectDragPreview, isPreview} = this.props;
    if (!isPreview) {
      connectDragPreview(getEmptyImage());
    }
  }

  shouldComponentUpdate(nextProps) {
    const {isDragging} = nextProps;
    for (let i = 0; i < importantProps.length; i++) {
      const key = importantProps[i];
      if (nextProps.project[key] !== this.props.project[key]) {
        return true;
      }
    }
    return isDragging !== this.props.isDragging;
  }

  render() {
    const {area, connectDragSource, connectDropTarget, isDragging, myUserId, project} = this.props;
    return connectDropTarget(
      connectDragSource(
        <div>
          {isDragging &&
            <ProjectDragLayer
              area={area}
              outcome={project}
            />
          }
          <div style={{opacity: isDragging ? 0.5 : 1}}>
            <OutcomeOrNullCard
              area={area}
              outcome={project}
              myUserId={myUserId}
              isDragging={isDragging}
            />
          </div>
        </div>
      )
    );
  }
}


ProjectCardContainer.propTypes = {
  area: PropTypes.string,
  connectDragSource: PropTypes.func,
  connectDragPreview: PropTypes.func,
  connectDropTarget: PropTypes.func.isRequired,
  dispatch: PropTypes.func,
  insert: PropTypes.func.isRequired,
  isDragging: PropTypes.bool,
  isPreview: PropTypes.bool,
  myUserId: PropTypes.string,
  preferredName: PropTypes.string,
  username: PropTypes.string,
  project: PropTypes.shape({
    id: PropTypes.string,
    content: PropTypes.string,
    status: PropTypes.string,
    teamMemberId: PropTypes.string
  })
};

const projectDragSpec = {
  beginDrag(props) {
    return {
      id: props.project.id,
      status: props.project.status
    };
  },
  isDragging(props, monitor) {
    return props.project.id === monitor.getItem().id;
  }
};

const projectDragCollect = (connectSource, monitor) => ({
  connectDragSource: connectSource.dragSource(),
  connectDragPreview: connectSource.dragPreview(),
  isDragging: monitor.isDragging()
});

const handleProjectDrop = (props, monitor, component) => {
  const {project, insert} = props;
  const dropTargetProjectId = project.id;
  const draggedProjectID = monitor.getItem().id;

  // Don't drag-and-drop on ourselves
  if (draggedProjectID === dropTargetProjectId) {
    return;
  }

  // Compute whether I am dropping "before" or "after" the card.
  const {y: mouseY} = monitor.getClientOffset();
  const {top: dropTargetTop, height: dropTargetHeight} = findDOMNode(component).getBoundingClientRect()
  const dropTargetMidpoint = dropTargetTop + (dropTargetHeight / 2);
  const before = mouseY < dropTargetMidpoint;

  // Re-insert this project in the list
  insert(draggedProjectID, before);
};

const projectDropCollect = (connect) => ({
  connectDropTarget: connect.dropTarget()
});

const projectDropSpec = {
  drop: handleProjectDrop
};

export default dropTarget(PROJECT, projectDropSpec, projectDropCollect)(
  dragSource(PROJECT, projectDragSpec, projectDragCollect)(ProjectCardContainer)
);
