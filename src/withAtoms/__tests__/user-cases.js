/* eslint-disable */
// @flow

const PubSub = require('../../core');
const withAtoms = require('../');

const MEMORIZED = '@@UPS/ATOM/MEMORIZED';

describe('user-cases', () => {
  it('rhombus', () => {
    const { createAtom } = new (withAtoms(PubSub))();

    const FirstName = createAtom('John');
    const LastName = createAtom('Doe');

    const FullName = createAtom(FirstName, LastName, names => names.join(' '));

    const DisplayName = createAtom(
      FirstName,
      FullName,
      ([firstName, fullName]) => (firstName.length < 10 ? fullName : firstName),
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

  it('rhombus memorized map', () => {
    const { createAtom } = new (withAtoms(PubSub))();
    const memoize = map => {
      let lastValue;
      return v => {
        const newValue = map(v);
        if (lastValue === newValue) return MEMORIZED;
        else return (lastValue = newValue);
      };
    };

    // TODO: shortcut for
    // `const FirstName = createAtom("John", memoize(v => v));`
    const FirstName = createAtom('John');
    const LastName = createAtom('Doe');

    const FullName = createAtom(FirstName, LastName, names => names.join(' '));

    const DisplayName = createAtom(
      FirstName,
      FullName,
      memoize(([firstName, fullName]) =>
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
    const { createAtom } = new (withAtoms(PubSub))();

    const FirstName = createAtom('John');
    const LastName = createAtom('Doe');

    const isFirstNameShortMap = jest.fn(v => v.length < 10);
    const IsFirstNameShort = createAtom(FirstName, isFirstNameShortMap);

    const fullNameMap = jest.fn(names => names.join(' '));
    const FullName = createAtom(FirstName, LastName, fullNameMap);

    const displayNameMap = jest.fn(([firstName, isFirstNameShort, fullName]) =>
      isFirstNameShort ? fullName : firstName,
    );
    const DisplayName = createAtom(
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
    const { createAtom } = new (withAtoms(PubSub))();
    const cb = jest.fn();

    async function updateUser(fetcher) {
      Status({ status: 'req' });
      try {
        Status({ status: 'res', data: await fetcher() });
      } catch (error) {
        Status({ status: 'err', error });
      }
    }

    const Status = createAtom({
      status: 'idle',
    });

    const Data = createAtom(Status, ({ status, data }) =>
      status === 'res' ? data : [],
    );

    const ErrorStatus = createAtom(Status, ({ status, error }) =>
      status === 'err' ? error : null,
    );

    const Feature = createAtom(Status, Data, ErrorStatus);

    Feature.subscribe(data => {
      expect(data).toBe(Feature())
      cb(data)
    });

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
});
