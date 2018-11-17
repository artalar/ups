// @flow

const PubSub = require('../index.js');

describe('core', () => {
  it('basic', () => {
    const pb = new PubSub();
    const EVENT_TYPE = 'EVENT_TYPE';
    const cb = jest.fn();

    pb.subscribe(cb, EVENT_TYPE);

    pb.dispatch(EVENT_TYPE);

    expect(cb.mock.calls.length).toBe(1);

    pb.dispatch(EVENT_TYPE, true);

    expect(cb.mock.calls.length).toBe(2);
    expect(cb.mock.calls[1][0]).toBe(true);
  });
  it('compute', () => {
    const pb = new PubSub();
    const SET_FIRST_NAME = 'SET_FIRST_NAME';
    const SET_LAST_NAME = 'SET_LAST_NAME';
    const SET_FULL_NAME = 'SET_FULL_NAME';
    const SET_DISPLAY_NAME = 'SET_DISPLAY_NAME';

    let firstName = 'John';
    let lastName = 'Doe';
    let fullName = 'John Doe';
    let displayName = 'John Doe';

    const reaction = jest.fn();
    const setFirstName = jest.fn(name => {
      firstName = name;
    });
    const setLastName = jest.fn(name => {
      lastName = name;
    });
    const setFullName = jest.fn(() => {
      fullName = `${firstName} ${lastName}`;
      pb.dispatch(SET_FULL_NAME);
    });
    const setDisplayName = jest.fn(() => {
      displayName = firstName.length < 10 ? fullName : firstName;
      pb.dispatch(SET_DISPLAY_NAME);
    });

    pb.subscribe(setFirstName, SET_FIRST_NAME, 0);
    pb.subscribe(setLastName, SET_LAST_NAME, 0);
    pb.subscribe(setFullName, SET_FIRST_NAME, 1);
    pb.subscribe(setFullName, SET_LAST_NAME, 1);
    pb.subscribe(setDisplayName, SET_FIRST_NAME, 2);
    pb.subscribe(setDisplayName, SET_FULL_NAME, 2);
    pb.subscribe(reaction, SET_DISPLAY_NAME);

    pb.dispatch(SET_FIRST_NAME, 'Joseph');
    expect(displayName).toBe('Joseph Doe');
    expect(reaction.mock.calls.length).toBe(1);

    pb.dispatch(SET_FIRST_NAME, 'Jooooooooooooooseph');
    expect(displayName).toBe('Jooooooooooooooseph');
    expect(reaction.mock.calls.length).toBe(2);
  });
  it('compute circular', () => {
    const pb = new PubSub();
    const EVENT1 = 'EVENT1';
    const EVENT2 = 'EVENT2';
    const EVENT3 = 'EVENT3';
    const reaction = jest.fn();
    const computedResult = [];
    const computedResultExcepted = [2, 3];
    const computedAccumulator = jest.fn((eventType, payload) => {
      if (eventType === EVENT1) computedResult[0] = payload;
      if (eventType === EVENT2) computedResult[1] = payload;
    });

    pb.subscribe(
      payload => {
        void (
          payload <= computedResultExcepted[1] &&
          pb.dispatch(EVENT2, payload + 1)
        );
      },
      EVENT1,
      0,
    );
    pb.subscribe(
      payload => {
        void (
          payload <= computedResultExcepted[0] &&
          pb.dispatch(EVENT1, payload + 1)
        );
      },
      EVENT2,
      0,
    );
    pb.subscribe(
      payload => {
        computedAccumulator(EVENT1, payload);
        pb.dispatch(EVENT3);
      },
      EVENT1,
      1,
    );
    pb.subscribe(
      payload => {
        computedAccumulator(EVENT2, payload);
        pb.dispatch(EVENT3);
      },
      EVENT2,
      1,
    );
    pb.subscribe(reaction, EVENT3);

    pb.dispatch(EVENT1, 0);

    expect(computedResult).toEqual(computedResultExcepted);
    expect(computedAccumulator.mock.calls.length).toBe(2);
    expect(reaction.mock.calls.length).toBe(1);
  });
});
