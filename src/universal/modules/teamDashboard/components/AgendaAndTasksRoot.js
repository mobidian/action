import ms from 'ms';
import PropTypes from 'prop-types';
import React from 'react';
import {withRouter} from 'react-router-dom';
import {TransitionGroup} from 'react-transition-group';
import AnimatedFade from 'universal/components/AnimatedFade';
import ErrorComponent from 'universal/components/ErrorComponent/ErrorComponent';
import LoadingView from 'universal/components/LoadingView/LoadingView';
import QueryRenderer from 'universal/components/QueryRenderer/QueryRenderer';
import withAtmosphere from 'universal/decorators/withAtmosphere/withAtmosphere';
import AgendaAndTasks from 'universal/modules/teamDashboard/components/AgendaAndTasks/AgendaAndTasks';
import AgendaItemAddedSubscription from 'universal/subscriptions/AgendaItemAddedSubscription';
import AgendaItemRemovedSubscription from 'universal/subscriptions/AgendaItemRemovedSubscription';
import AgendaItemUpdatedSubscription from 'universal/subscriptions/AgendaItemUpdatedSubscription';
import TaskCreatedSubscription from 'universal/subscriptions/TaskCreatedSubscription';
import TaskDeletedSubscription from 'universal/subscriptions/TaskDeletedSubscription';
import TaskUpdatedSubscription from 'universal/subscriptions/TaskUpdatedSubscription';
import TeamMemberAddedSubscription from 'universal/subscriptions/TeamMemberAddedSubscription';
import TeamMemberUpdatedSubscription from 'universal/subscriptions/TeamMemberUpdatedSubscription';

const query = graphql`
  query AgendaAndTasksRootQuery($teamId: ID!) {
    viewer {
      ...AgendaAndTasks_viewer
    }
  }
`;

const subscriptions = [
  TaskUpdatedSubscription,
  TaskCreatedSubscription,
  TaskDeletedSubscription,
  AgendaItemAddedSubscription,
  AgendaItemUpdatedSubscription,
  AgendaItemRemovedSubscription,
  TeamMemberAddedSubscription,
  TeamMemberUpdatedSubscription
];
const cacheConfig = {ttl: ms('10s')};

const AgendaAndTasksRoot = (props) => {
  const {atmosphere, match: {params: {teamId}}} = props;
  return (
    <QueryRenderer
      cacheConfig={cacheConfig}
      environment={atmosphere}
      query={query}
      variables={{teamId}}
      subscriptions={subscriptions}
      render={({error, props: renderProps, initialLoad}) => {
        if (!renderProps && !initialLoad) {
          return null;
        }

        return (
          <TransitionGroup appear component={null} exit={false}>
            {error && <ErrorComponent height={'14rem'} error={error} />}
            {renderProps &&
            <AnimatedFade key="1">
              <AgendaAndTasks
                viewer={renderProps.viewer}
              />
            </AnimatedFade>
            }
            {!renderProps && !error &&
            <AnimatedFade key="2" unmountOnExit exit={false}>
              <LoadingView minHeight="50vh" />
            </AnimatedFade>
            }
          </TransitionGroup>
        );
      }}
    />
  );
};

AgendaAndTasksRoot.propTypes = {
  atmosphere: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
  teams: PropTypes.array
};

export default withRouter(withAtmosphere(AgendaAndTasksRoot));
