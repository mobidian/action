import shortid from 'shortid';
import convertToProjectContent from 'universal/utils/draftjs/convertToProjectContent';
import getTagsFromEntityMap from 'universal/utils/draftjs/getTagsFromEntityMap';
import getRethink from '../../../../database/rethinkDriver';
import {ACTIVE, FUTURE, STUCK} from 'universal/utils/constants';
import ms from 'ms';

const formatDate = (datetime) => {
  const date = new Date(datetime);
  const [, month, day] = date.toDateString().split(' ');
  return `${month} ${day}`;
};

const makeSeedProjects = () => {
  const now = Date.now();
  const today = formatDate(now);
  const in2weeks = formatDate(now + ms('14d'));
  const tomorrow = formatDate(now + ms('1d'));
  const in2days = formatDate(now + ms('2d'));
  const in3days = formatDate(now + ms('3d'));
  const in6days = formatDate(now + ms('6d'));
  const in7days = formatDate(now + ms('7d'));
  return [
    {
      status: FUTURE,
      sortOrder: 1,
      content: convertToProjectContent(`
      ${today} - Use this column to plan ahead. #private
      `)
    },
    {
      status: STUCK,
      sortOrder: 0,
      content: convertToProjectContent(`
      ${today} - Use this column if a task is Stuck.`)
    },
    {
      status: ACTIVE,
      sortOrder: 5,
      content: convertToProjectContent(`
      ${today} - Welcome! Get started by entering active tasks in this column. Assign tasks to any teammate.
      Use links, bold, and italics just like an editor.
      Click & drag cards to other columns.
      Mark any card #private if you don't need your whole team to see it.`)
    },
    {
      status: ACTIVE,
      sortOrder: 4,
      content: convertToProjectContent(`
      ${tomorrow} - Free facilitation scheduled. Parabol offers live facilitation for your team. Contact us to
      schedule a 20min video chat to get ready for your first 3 team meetings.`)
    },
    {
      status: ACTIVE,
      sortOrder: 3,
      content: convertToProjectContent(`
      ${in2days} - Recurring action meetings scheduled for the team. Tuesday mornings are a great weekly choice;
      or Mon-Wed-Fri afternoons for a faster pace`)
    },
    {
      status: ACTIVE,
      sortOrder: 2,
      content: convertToProjectContent(`
      ${in3days} - Slack & GitHub integrations activated. Visit Team Settings to connect your favorite tools to Parabol.
      (more tools coming soon!)`)
    },
    {
      status: ACTIVE,
      sortOrder: 1,
      content: convertToProjectContent(`
      ${in6days} - Parabol process reviewed. We encourage new users to read our Parabol 101 Guide 
      for more info on how (and why!) it works before your first Team Meeting. 
      (Add any questions to the Team Agenda Queue)`)
    },
    {
      status: ACTIVE,
      sortOrder: 0,
      content: convertToProjectContent(`
      ${in7days} - Agenda items added to the Queue. All teammates can add Agenda topics at any time;
       prioritize by dragging them up and down.`)
    },
    //{
    //  status: ACTIVE,
    //  sortOrder: 0,
    //  content: convertToProjectContent(`
    //  Invite any missing team members to join the team. Tap on ‘Team Settings’
    //  in the dashboard header above.
    //`)
    //},
    //{
    //  status: ACTIVE,
    //  sortOrder: 1,
    //  content: convertToProjectContent(`
    //  Try a test run of an Action Meeting. Tap on ‘Meeting Lobby’ in
    //  the dashboard header above. #private
    //`)
    //},
    //{
    //  status: FUTURE,
    //  sortOrder: 0,
    //  content: convertToProjectContent(`
    //  Make good teaming a habit! Schedule a weekly Action Meeting with your
    //  team. Pro-tip: include a link to the meeting lobby.
    //`)
    //},
    //{
    //  status: FUTURE,
    //  sortOrder: 1,
    //  content: convertToProjectContent(`
    //  Add integrations (like Slack, GitHub…) for your team.
    //  See the Integrations tab under Team Settings
    //`)
    //}
  ];
};

export default (userId, teamId) => {
  const r = getRethink();
  const now = new Date();

  const teamMemberId = `${userId}::${teamId}`;

  const seedProjects = makeSeedProjects().map((proj) => ({
    ...proj,
    id: `${teamId}::${shortid.generate()}`,
    createdAt: now,
    createdBy: userId,
    tags: getTagsFromEntityMap(JSON.parse(proj.content).entityMap),
    teamId,
    teamMemberId,
    userId,
    updatedAt: now
  }));

  const histories = seedProjects.map((project) => ({
    id: shortid.generate(),
    content: project.content,
    projectId: project.id,
    status: project.status,
    teamMemberId: project.teamMemberId,
    updatedAt: project.updatedAt
  }));

  return r({
    agendaItem: r.table('AgendaItem').insert({
      id: shortid.generate(),
      content: 'team metrics review',
      createdAt: now,
      isActive: true,
      isComplete: false,
      sortOrder: 0,
      teamId,
      teamMemberId,
      updatedAt: now
    }),
    projects: r.table('Project').insert(seedProjects),
    projectHistory: r.table('ProjectHistory').insert(histories)
  });
};
