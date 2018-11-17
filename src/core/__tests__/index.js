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
