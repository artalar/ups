/* eslint-disable */
// @flow

const PubSub = require('../../core');
const withAtoms = require('../');

const MEMORIZED = '@@UPS/ATOM/MEMORIZED';

describe('atom', () => {
  it('map', () => {
    const { createAtom } = new (withAtoms(PubSub))();

    const One = createAtom('one');
    const Two = createAtom('two');
    const Shape = createAtom(One, Two, ([one, two]) => ({ one, two }));
    const One2 = createAtom(Shape, ({ one }) => one);
    const Two2 = createAtom(Shape, ({ two }) => two);

    const Shape2 = createAtom(One2, Two2, ([one, two]) => ({ one, two }));

    const view = jest.fn();
    Shape2.subscribe(view);

    One('one!');
    expect(Shape2()).toEqual({ one: 'one!', two: 'two' });
    expect(view.mock.calls.length).toBe(1);
  });

  it('deep structure', () => {
    const cb = jest.fn();

    const { createAtom } = new (withAtoms(PubSub))();

    const a0 = createAtom(null);
    const a1 = createAtom(null);
    const a2 = createAtom(null);
    const a01 = createAtom(a0, v => v);
    const a02 = createAtom(a0, a1, a2);
    const a03 = createAtom(a0, a1, a2, v => v);
    const a001 = createAtom(a01, v => v);
    const a002 = createAtom(a01, a02, a03);
    const a003 = createAtom(a01, a02, a03, v => v);
    const a0004 = createAtom(a001, a002, a003, v => v);

    a0004.subscribe(cb);

    a0(true);

    expect(cb.mock.calls.length).toBe(1);
    expect(a03()).toEqual([true, null, null]);
    expect(a003()).toEqual([true, [true, null, null], [true, null, null]]);
    expect(a0004()).toEqual([
      true,
      [true, [true, null, null], [true, null, null]],
      [true, [true, null, null], [true, null, null]],
    ]);

    a2(false);

    expect(cb.mock.calls.length).toBe(2);
    expect(a03()).toEqual([true, null, false]);
    expect(a003()).toEqual([true, [true, null, false], [true, null, false]]);
    expect(a0004()).toEqual([
      true,
      [true, [true, null, false], [true, null, false]],
      [true, [true, null, false], [true, null, false]],
    ]);
  });
});
