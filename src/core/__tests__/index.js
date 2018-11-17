// @flow

const PubSub = require('../index.js');
const withLogging = require('../withLogging.js');

describe('core', () => {
  describe('subscribe', () => {
    const PubSubWithLogging = withLogging(PubSub);
    const log = [];
    const pb = new PubSubWithLogging();
    const EVENT_TYPE = 'EVENT_TYPE';
    const EVENT_TYPE_UNEXIST = 'EVENT_TYPE_UNEXIST';
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    const cbLog = jest.fn(value => {
      log.push(value);
    });

    pb.subscribe(cbLog);

    const unsubscribe = pb.subscribe(cb1, EVENT_TYPE);

    it('dispatch', () => {
      pb.dispatch(EVENT_TYPE);

      expect(cb1.mock.calls.length).toBe(1);
    });
    it('receive argument', () => {
      pb.dispatch(EVENT_TYPE, true);

      expect(cb1.mock.calls.length).toBe(2);
      expect(cb1.mock.calls[1][0]).toBe(true);
    });
    it('unsubscribe', () => {
      unsubscribe();
      pb.dispatch(EVENT_TYPE, false);

      expect(cb1.mock.calls.length).toBe(2);
    });
    it('only relative subscriber calls', () => {
      expect(cb2.mock.calls.length).toBe(0);
    });
    it('call unexist event', () => {
      pb.dispatch(EVENT_TYPE_UNEXIST, null);
    });
    it('all logs', () => {
      expect(cbLog.mock.calls.length).toBe(3);
      expect(log).toEqual([
        { EVENT_TYPE: undefined },
        { EVENT_TYPE: true },
        // TODO: do we need publish events without subscribers?
        { EVENT_TYPE: false },
        // TODO: do we need logs unexist (without subscribers) event?
        // { EVENT_TYPE_UNEXIST: null },
      ]);
    });
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
