import {GraphQLEnumType} from 'graphql';
import {GITHUB, SLACK} from 'universal/utils/constants';

const IntegrationService = new GraphQLEnumType({
  name: 'IntegrationService',
  description: 'The list of services for integrations',
  values: {
    [GITHUB]: {},
    [SLACK]: {}
  }
});

export default IntegrationService;
