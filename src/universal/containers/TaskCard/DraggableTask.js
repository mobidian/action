import PropTypes from 'prop-types';
import React, { Component } from 'react';
import NullableTask from 'universal/components/NullableTask/NullableTask';
import {TASK} from 'universal/utils/constants';
import {DragSource as dragSource} from 'react-dnd';
import {getEmptyImage} from 'react-dnd-html5-backend';
import TaskDragLayer from './TaskDragLayer';
import {createFragmentContainer} from 'react-relay';

const taskSource = {
  beginDrag(props) {
    return {
      id: props.task.id,
      status: props.task.status
    };
  },
  isDragging(props, monitor) {
    return props.task.id === monitor.getItem().id;
  }
};

const importantProps = ['content', 'status', 'teamMember', 'sortOrder', 'integration'];

class DraggableTask extends Component {
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
      if (nextProps.task[key] !== this.props.task[key]) {
        return true;
      }
    }
    return isDragging !== this.props.isDragging;
  }

  render() {
    const {area, connectDragSource, isDragging, myUserId, task} = this.props;
    return connectDragSource(
      <div>
        {isDragging &&
          <TaskDragLayer
            area={area}
            task={task}
          />
        }
        <div style={{opacity: isDragging ? 0.5 : 1}}>
          <NullableTask
            area={area}
            task={task}
            myUserId={myUserId}
            isDragging={isDragging}
          />
        </div>
      </div>
    );
  }
}


DraggableTask.propTypes = {
  area: PropTypes.string,
  connectDragSource: PropTypes.func,
  connectDragPreview: PropTypes.func,
  isDragging: PropTypes.bool,
  isPreview: PropTypes.bool,
  myUserId: PropTypes.string,
  task: PropTypes.shape({
    id: PropTypes.string,
    content: PropTypes.string,
    status: PropTypes.string,
    teamMemberId: PropTypes.string
  })
};

const dragSourceCb = (connectSource, monitor) => ({
  connectDragSource: connectSource.dragSource(),
  connectDragPreview: connectSource.dragPreview(),
  isDragging: monitor.isDragging()
});

export default createFragmentContainer(
  dragSource(TASK, taskSource, dragSourceCb)(DraggableTask),
  graphql`
    fragment DraggableTask_task on Task {
      id
      content
      integration {
        service
      }
      status
      sortOrder
      teamMember {
        id
      }
      ...NullableTask_task
    }`
);
