/* eslint-disable */
// @flow

import PubSub from '../../core';
import withAtoms from '..';
import type { Atom } from '..';

const MEMORIZED = '@@UPS/ATOM/MEMORIZED';

function memo(atom) {
  // `undefined` memorized by default 🤔
  let lastValue;
  return atom.filter(value =>
    value === lastValue ? false : ((lastValue = value), true),
  );
}

describe('user-cases', () => {
  it('rhombus', () => {
    const { multiAtom } = new (withAtoms(PubSub))();

    const FirstName = multiAtom('John');
    const LastName = multiAtom('Doe');

    const FullName = multiAtom(FirstName, LastName, (fn, ln) =>
      [fn, ln].join(' '),
    );

    const DisplayName = multiAtom(FirstName, FullName, (firstName, fullName) =>
      firstName.length < 10 ? fullName : firstName,
    );

    const view = jest.fn();
    DisplayName.subscribe(view);

    FirstName('Joseph');
    expect(DisplayName()).toBe('Joseph Doe');
    expect(view.mock.calls.length).toBe(1);

    FirstName('Jooooooooooooooseph');
    expect(DisplayName()).toBe('Jooooooooooooooseph');
    expect(view.mock.calls.length).toBe(2);
  });

  it('rhombus memorized', () => {
    const { multiAtom } = new (withAtoms(PubSub))();

    function memo(atom) {
      let lastValue;
      return atom.filter(value =>
        value === lastValue ? false : ((lastValue = value), true),
      );
    }

    const FirstName = multiAtom('John');
    const LastName = multiAtom('Doe');

    const FullName = multiAtom(FirstName, LastName, (fn, ln) =>
      [fn, ln].join(' '),
    );

    const DisplayName = memo(
      multiAtom(FirstName, FullName, (firstName, fullName) =>
        firstName.length < 10 ? fullName : firstName,
      ),
    );

    const view = jest.fn();
    DisplayName.subscribe(view);

    FirstName('Joseph');
    expect(DisplayName()).toBe('Joseph Doe');
    expect(view.mock.calls.length).toBe(1);

    FirstName('Jooooooooooooooseph');
    expect(DisplayName()).toBe('Jooooooooooooooseph');
    expect(view.mock.calls.length).toBe(2);

    FirstName('Jooooooooooooooseph');
    LastName('Down?');
    LastName('Down');
    expect(DisplayName()).toBe('Jooooooooooooooseph');
    expect(view.mock.calls.length).toBe(2);
  });

  it('rhombus detailed', () => {
    const { multiAtom } = new (withAtoms(PubSub))();

    const FirstName = multiAtom('John');
    const LastName = multiAtom('Doe');

    const isFirstNameShortMap = jest.fn(v => v.length < 10);
    const IsFirstNameShort = multiAtom(FirstName, isFirstNameShortMap);

    const fullNameMap = jest.fn((fn, ln) => [fn, ln].join(' '));
    const FullName = multiAtom(FirstName, LastName, fullNameMap);

    const displayNameMap = jest.fn((firstName, isFirstNameShort, fullName) =>
      isFirstNameShort ? fullName : firstName,
    );
    const DisplayName = multiAtom(
      FirstName,
      IsFirstNameShort,
      FullName,
      displayNameMap,
    );

    const view = jest.fn();
    DisplayName.subscribe(view);

    FirstName('Joseph');
    expect(DisplayName()).toBe('Joseph Doe');
    // `*Map` call's one time when initiated. So 1 update == 2 calls
    expect(isFirstNameShortMap.mock.calls.length).toBe(2);
    expect(fullNameMap.mock.calls.length).toBe(2);
    expect(displayNameMap.mock.calls.length).toBe(2);
    expect(view.mock.calls.length).toBe(1);

    FirstName('Jooooooooooooooseph');
    expect(DisplayName()).toBe('Jooooooooooooooseph');
    expect(isFirstNameShortMap.mock.calls.length).toBe(3);
    expect(fullNameMap.mock.calls.length).toBe(3);
    expect(displayNameMap.mock.calls.length).toBe(3);
    expect(view.mock.calls.length).toBe(2);

    // LastName("Down"); // not affecting changes (for `view`)
    // // TODO: mobx can do it automatically. We need it?
    // expect(DisplayName()).toBe("Jooooooooooooooseph");
    // expect(fullNameMap.mock.calls.length).toBe(3);
    // expect(displayNameMap.mock.calls.length).toBe(3);
    // expect(view.mock.calls.length).toBe(2);
  });

  it('async', async () => {
    const { multiAtom } = new (withAtoms(PubSub))();
    const cb = jest.fn();

    const Status: Atom<
      | {|
          status: 'idle',
        |}
      | {|
          status: 'req',
        |}
      | {|
          status: 'res',
          data: number[],
        |}
      | {|
          status: 'err',
          error: Error,
        |},
    > = multiAtom({
      status: 'idle',
    });

    const Data = Status.map(payload =>
      payload.status === 'res' ? payload.data : [],
    );

    const ErrorStatus = Status.map(payload =>
      payload.status === 'err' ? payload.error : null,
    );

    const Feature = multiAtom(Status, Data, ErrorStatus, (...v) => v);

    Feature.subscribe(data => {
      expect(data).toBe(Feature());
      cb(data);
    });

    async function updateUser(fetcher) {
      Status({ status: 'req' });
      try {
        Status({ status: 'res', data: await fetcher() });
      } catch (error) {
        Status({ status: 'err', error });
      }
    }

    await updateUser(() => new Promise(r => setTimeout(r, 50, [1, 2, 3])));

    expect(Data()).toEqual([1, 2, 3]);
    expect(Status().status).toEqual('res');
    expect(ErrorStatus()).toBe(null);
    expect(cb.mock.calls.length).toBe(2);
    expect(cb.mock.calls[0][0]).toEqual([{ status: 'req' }, [], null]);
    expect(cb.mock.calls[1][0]).toEqual([
      { status: 'res', data: [1, 2, 3] },
      [1, 2, 3],
      null,
    ]);
  });

  it('array', () => {
    const { multiAtom } = new (withAtoms(PubSub))();

    const List = multiAtom([]);
    const listView = jest.fn();
    List.subscribe(listView);

    const FirstItem = List.map(0);
    const firstItemView = jest.fn();
    memo(FirstItem).subscribe(firstItemView);

    const SecondItem = List.map(1);
    const secondItemView = jest.fn();
    memo(SecondItem).subscribe(secondItemView);

    const ThirdItem = List.map(2);
    const thirdItemView = jest.fn();
    memo(ThirdItem).subscribe(thirdItemView);

    List([1, 2]);
    expect(List()).toEqual([1, 2]);
    expect(FirstItem()).toBe(1);
    expect(SecondItem()).toBe(2);
    expect(listView.mock.calls.length).toBe(1);
    expect(firstItemView.mock.calls.length).toBe(1);
    expect(secondItemView.mock.calls.length).toBe(1);
    expect(thirdItemView.mock.calls.length).toBe(0);

    SecondItem(22);
    expect(List()).toEqual([1, 22]);
    expect(FirstItem()).toBe(1);
    expect(SecondItem()).toBe(22);
    expect(listView.mock.calls.length).toBe(2);
    expect(firstItemView.mock.calls.length).toBe(1);
    expect(secondItemView.mock.calls.length).toBe(2);
    expect(thirdItemView.mock.calls.length).toBe(0);

    List(List().concat(3));
    expect(List()).toEqual([1, 22, 3]);
    expect(FirstItem()).toBe(1);
    expect(SecondItem()).toBe(22);
    expect(listView.mock.calls.length).toBe(3);
    expect(firstItemView.mock.calls.length).toBe(1);
    expect(secondItemView.mock.calls.length).toBe(2);
    expect(thirdItemView.mock.calls.length).toBe(1);
  });
});
