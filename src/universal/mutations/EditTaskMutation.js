import {commitMutation} from 'react-relay';
import createProxyRecord from 'universal/utils/relay/createProxyRecord';

const mutation = graphql`
  mutation EditTaskMutation($taskId: ID!, $editing: Boolean!) {
    editTask(taskId: $taskId, editing: $editing) {
      editor {
        editing
        taskId
        user {
          userId: id
          preferredName
        }
      }
    }
  }
`;

const handleEditing = (store, editing, taskId, editorDetails) => {
  const task = store.get(taskId);
  if (!task) return;
  const taskEditors = task.getLinkedRecords('editors') || [];
  const newTaskEditors = [];
  const incomingUserId = editorDetails.getValue('userId');
  if (editing) {
    // handle multiple socket connections
    for (let ii = 0; ii < taskEditors.length; ii++) {
      const taskEditor = taskEditors[ii];
      if (taskEditor.getValue('userId') === incomingUserId) return;
      newTaskEditors.push(taskEditor);
    }
    newTaskEditors.push(editorDetails);
  } else {
    for (let ii = 0; ii < taskEditors.length; ii++) {
      const taskEditor = taskEditors[ii];
      if (taskEditor.getValue('userId') !== incomingUserId) {
        newTaskEditors.push(taskEditor);
      }
    }
  }
  task.setLinkedRecords(newTaskEditors, 'editors');
};

export const handleEditingFromPayload = (store, editorPayload) => {
  if (!editorPayload) return;
  const editing = editorPayload.getValue('editing');
  const taskId = editorPayload.getValue('taskId');
  const editorDetails = editorPayload.getLinkedRecord('user');

  // manual alias: https://github.com/facebook/relay/issues/2196
  editorDetails.setValue(editorDetails.getValue('id'), 'userId');
  handleEditing(store, editing, taskId, editorDetails);
};

const EditTaskMutation = (environment, taskId, editing, onCompleted, onError) => {
  const {userId} = environment;
  // use this as a temporary fix until we get rid of cashay because otherwise relay will roll back the change
  // which means we'll have 2 items, then 1, then 2, then 1. i prefer 2, then 1.
  return commitMutation(environment, {
    mutation,
    variables: {taskId, editing},
    updater: (store) => {
      const payload = store.getRootField('editTask').getLinkedRecord('editor');
      handleEditingFromPayload(store, payload);
    },
    optimisticUpdater: (store) => {
      // TODO fix when we move users to relay
      const user = store.get(userId);
      const preferredName = user ? user.getValue('preferredName') : 'you';
      const optimisticDetails = {
        userId,
        preferredName
      };
      const editorDetails = createProxyRecord(store, 'TaskEditorDetails', optimisticDetails);
      handleEditing(store, editing, taskId, editorDetails);
    },
    onCompleted,
    onError
  });
};

export default EditTaskMutation;
