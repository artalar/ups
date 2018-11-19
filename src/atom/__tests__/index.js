// @flow

const PubSub = require('../../core');
const createAtomCreator = require('../');

const MEMORIZED = '@@UPS/ATOM/MEMORIZED';

describe('react', () => {
  it('map', () => {
    const createAtom = createAtomCreator(new PubSub());

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

  it('rhombus', () => {
    const createAtom = createAtomCreator(new PubSub());

    const FirstName = createAtom('John');
    const LastName = createAtom('Doe');

    const FullName = createAtom(FirstName, LastName, names => names.join(' '));

    const DisplayName = createAtom(FirstName, FullName, ([firstName, fullName]) =>
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

  it('rhombus memorized map', () => {
    const createAtom = createAtomCreator(new PubSub());
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
    const createAtom = createAtomCreator(new PubSub());

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
});
