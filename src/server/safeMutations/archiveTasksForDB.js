import {convertFromRaw, convertToRaw} from 'draft-js';
import getRethink from 'server/database/rethinkDriver';
import addTagToTask from 'universal/utils/draftjs/addTagToTask';
import getTagsFromEntityMap from 'universal/utils/draftjs/getTagsFromEntityMap';

const archiveTasksForDB = async (tasks) => {
  const r = getRethink();
  const tasksToArchive = tasks.map((task) => {
    const contentState = convertFromRaw(JSON.parse(task.content));
    const nextContentState = addTagToTask(contentState, '#archived');
    const raw = convertToRaw(nextContentState);
    const nextTags = getTagsFromEntityMap(raw.entityMap);
    const nextContentStr = JSON.stringify(raw);
    return {
      content: nextContentStr,
      tags: nextTags,
      id: task.id
    };
  });
  return r(tasksToArchive).forEach((task) => {
    return r.table('Task')
      .get(task('id'))
      .update({
        content: task('content'),
        tags: task('tags')
      }, {returnChanges: true});
  })('changes')('new_val');
};

export default archiveTasksForDB;
