// @flow

const PubSub = require('../../core');
const withLogging = require('../');

describe('withLogging', () => {
  describe('log', () => {
    const PubSubWithLogging = withLogging(PubSub);
    const log = [];
    const pb = new PubSubWithLogging();
    const EVENT_TYPE = 'EVENT_TYPE';
    const EVENT_TYPE_UNEXIST = 'EVENT_TYPE_UNEXIST';
    const cb1 = jest.fn();
    const cbLog = jest.fn(value => {
      log.push(value);
    });

    pb.subscribe(cbLog);

    const unsubscribe = pb.subscribe(cb1, EVENT_TYPE);

    pb.dispatch(EVENT_TYPE);

    pb.dispatch(EVENT_TYPE, true);

    unsubscribe();
    pb.dispatch(EVENT_TYPE, false);

    pb.dispatch(EVENT_TYPE_UNEXIST, null);

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
});
