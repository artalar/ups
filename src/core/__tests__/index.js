// @flow

const PubSub = require('../index.js');

describe('core', () => {
  describe('basics', () => {
    const pb = new PubSub();
    const EVENT_TYPE = 'EVENT_TYPE';
    const EVENT_TYPE_UNEXIST = 'EVENT_TYPE_UNEXIST';
    const EVENT_TYPE_THROW = 'EVENT_TYPE_THROW';
    let EVENT_TYPE_UNUSED = 'EVENT_TYPE_UNUSED';
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    const calls = {
      cb1: 0,
      cb2: 0,
    };

    let unsubscribe = pb.subscribe(cb1, EVENT_TYPE);
    pb.subscribe(cb2, EVENT_TYPE_UNUSED);
    EVENT_TYPE_UNUSED = null;

    it('dispatch', () => {
      pb.dispatch(EVENT_TYPE);

      expect(cb1.mock.calls.length).toBe(++calls.cb1);
    });

    it('receive argument', () => {
      pb.dispatch(EVENT_TYPE, true);

      expect(cb1.mock.calls.length).toBe(++calls.cb1);
      expect(cb1.mock.calls[1][0]).toBe(true);
    });

    it('unsubscribe', () => {
      unsubscribe();
      pb.dispatch(EVENT_TYPE);

      expect(cb1.mock.calls.length).toBe(calls.cb1);

      unsubscribe = pb.subscribe(cb1, EVENT_TYPE);
      pb.dispatch(EVENT_TYPE);

      expect(cb1.mock.calls.length).toBe(++calls.cb1);
    });

    it('only relative subscriber calls', () => {
      expect(cb2.mock.calls.length).toBe(calls.cb2);
    });

    it('call unexist event', () => {
      pb.dispatch(EVENT_TYPE_UNEXIST, null);

      expect(cb1.mock.calls.length).toBe(calls.cb1);
      expect(cb2.mock.calls.length).toBe(calls.cb2);
    });

    it('can not dispatch to it self', () => {
      let error;
      try {
        pb.dispatch(pb._title);
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Can not dispatch directly to dispatcher');

      expect(cb1.mock.calls.length).toBe(calls.cb1);
      expect(cb2.mock.calls.length).toBe(calls.cb2);
    });

    it('throw', () => {
      const tag = 'test_g90384gf76swdf2#$54TG';
      let error;
      pb.subscribe(() => {
        throw new Error(tag);
      }, EVENT_TYPE_THROW);

      try {
        pb.dispatch(EVENT_TYPE_THROW);
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(tag);

      error = null;

      try {
        pb.dispatch(EVENT_TYPE_THROW);
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(tag);

      expect(cb1.mock.calls.length).toBe(calls.cb1);
      expect(cb2.mock.calls.length).toBe(calls.cb2);

      pb.dispatch(EVENT_TYPE);

      expect(cb1.mock.calls.length).toBe(++calls.cb1);
      expect(cb2.mock.calls.length).toBe(calls.cb2);
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
