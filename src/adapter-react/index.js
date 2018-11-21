// @flow

import React from 'react';

export function handleAtom(atom, mapper = props => props) {
  return class HandledAtom extends React.Component {
    state = {};

    componentDidMount() {
      this.unsubscribe = atom.subscribe(() => this.forceUpdate());
    }

    componentWillUnmount() {
      if (this.unsubscribe) {
        this.unsubscribe();
      }
    }

    render() {
      return mapper(atom(), this.props);
    }
  };
}

// handleAtom(Loading, ({ isLoading }, props) => isLoading && <Loading {...props} />);
