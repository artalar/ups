// @flow

import PubSub from '../../core';
import withAtoms from '..';

describe('atom', () => {

  it('deep structure', () => {
    const cb = jest.fn();

    const { multiAtom } = new (withAtoms(PubSub))();

    const a0 = multiAtom(null);
    const a1 = multiAtom(null);
    const a2 = multiAtom(null);
    const a01 = multiAtom(a0, v => v);
    const a02 = multiAtom(a0, a1, a2, (...v) => v);
    const a001 = multiAtom(a01, v => v);
    const a002 = multiAtom(a01, a02, (...v) => v);
    const a0001 = multiAtom(a001, a002, (...v) => v);

    a0001.subscribe(cb);

    a0(true);

    expect(cb.mock.calls.length).toBe(1);
    expect(a02()).toEqual([true, null, null]);
    expect(a002()).toEqual([true, [true, null, null]]);
    expect(a0001()).toEqual([true, [true, [true, null, null]]]);

    a2(false);

    expect(cb.mock.calls.length).toBe(2);
    expect(a02()).toEqual([true, null, false]);
    expect(a002()).toEqual([true, [true, null, false]]);
    expect(a0001()).toEqual([true, [true, [true, null, false]]]);
  });

  it('map', () => {
    const { multiAtom } = new (withAtoms(PubSub))();

    const One = multiAtom('one');
    const Two = multiAtom('two');
    const Shape = multiAtom(One, Two, (one, two) => ({ one, two }));
    const One2 = Shape.map(({ one }) => one);
    const Two2 = Shape.map(({ two }) => two);

    const Shape2 = multiAtom(One2, Two2, (one, two) => ({ one, two }));

    const view = jest.fn();
    Shape2.subscribe(view);

    One('one!');
    expect(Shape2()).toEqual({ one: 'one!', two: 'two' });
    expect(view.mock.calls.length).toBe(1);
  });

  it('lens', () => {
    const { multiAtom } = new (withAtoms(PubSub))();

    const One = multiAtom('one');
    const Two = multiAtom('two');
    const Shape = multiAtom(One, Two, (one, two) => ({ one, two }));
    const One2 = Shape.map('one');
    const Two2 = Shape.map('two');

    const Shape2 = multiAtom(One2, Two2, (one, two) => ({ one, two }));

    const view = jest.fn();
    Shape2.subscribe(view);

    One('one!');
    expect(Shape()).toEqual({ one: 'one!', two: 'two' });
    expect(Shape2()).toEqual({ one: 'one!', two: 'two' });
    expect(view.mock.calls.length).toBe(1);

    One2('one2');
    expect(Shape2()).toEqual({ one: 'one2', two: 'two' });
    expect(view.mock.calls.length).toBe(2);
  });
});
