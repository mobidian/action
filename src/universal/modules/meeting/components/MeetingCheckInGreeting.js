import {css} from 'aphrodite-local-styles/no-important';
import PropTypes from 'prop-types';
import React from 'react';
import Tooltip from 'universal/components/Tooltip/Tooltip';
import appTheme from 'universal/styles/theme/appTheme';
import withStyles from 'universal/styles/withStyles';

const originAnchor = {
  vertical: 'top',
  horizontal: 'center'
};

const targetAnchor = {
  vertical: 'bottom',
  horizontal: 'center'
};

const MeetingCheckInGreeting = ({currentName, greeting, styles}) => (
  <div style={{color: appTheme.palette.warm}}>
    <Tooltip
      maxHeight={40}
      maxWidth={500}
      originAnchor={originAnchor}
      targetAnchor={targetAnchor}
      delay={300}
      tip={<span>{`${greeting.content} means “hello” in ${greeting.language}`}</span>}
    >
      <span className={css(styles.greeting)}>
        {greeting.content}
      </span>
    </Tooltip>
    {`, ${currentName}`}
  </div>
);

MeetingCheckInGreeting.propTypes = {
  currentName: PropTypes.string.isRequired,
  greeting: PropTypes.shape({
    content: PropTypes.string.isRequired,
    language: PropTypes.string.isRequired
  }),
  styles: PropTypes.object.isRequired
};

const greetingStyleThunk = () => ({
  greeting: {
    borderBottom: '1px dashed currentColor',
    color: 'inherit',
    cursor: 'help'
  }
});

export default withStyles(greetingStyleThunk)(MeetingCheckInGreeting);
