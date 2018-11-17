// @flow

const createAtomCreator = require('../index.js');

const PRIORITY_LEVEL = '@@UPS/PRIORITY_LEVEL';
const IS_ATOM = '@@UPS/IS_ATOM';
const MEMOIZED = '@@UPS/MEMOIZED';

const importFromThirdPartyLibrary = () => {
  const isAtom = subject =>
    (typeof subject === 'function' || typeof subject === 'object') &&
    subject[IS_ATOM] === true;

  const omitSetterSignature = originalAtom => {
    const atom = function(...a) {
      if (a.length === 0) return originalAtom();
      else throw new TypeError('Combined atom can not set the value');
    };
    return Object.assign(atom, originalAtom);
  };

  const createAtom = createAtomCreator({
    compute0: 'compute0',
    compute1: 'compute1',
    compute2: 'compute2',
    compute3: 'compute3',
    compute4: 'compute4',
    compute5: 'compute5',
    reaction: 'reaction',
  });

  /**
   `pub` - is _publisher_ - another atom
   `map` - is mapper function
  */
  const createAtomFrom = (pub, map = _ => _) => {
    const priorityLevel = (pub[PRIORITY_LEVEL] || 0) + 1;
    const priorityLevelName = `compute${priorityLevel}`;
    let lastValue = map(pub());
    const atom = createAtom(lastValue);

    atom[PRIORITY_LEVEL] = priorityLevel;

    pub[priorityLevelName].subscribe(v => {
      const newValue = map(v);
      if (newValue === MEMOIZED) return;
      atom(newValue);
    });
    atom[IS_ATOM] = true;
    return omitSetterSignature(atom);
  };

  const combine = atoms => {
    let maxPriorityLevel = 0;
    const combinedAtom = createAtom(
      atoms.map(atom => {
        maxPriorityLevel = Math.max(
          atom[PRIORITY_LEVEL] || 0,
          maxPriorityLevel,
        );
        return atom();
      }),
    );
    const accumulator = combinedAtom();
    for (let i = 0; i < atoms.length; i++) {
      atoms[i].compute0.subscribe(newValue => {
        accumulator[i] = newValue;
        combinedAtom(accumulator);
      });
    }
    combinedAtom[PRIORITY_LEVEL] = maxPriorityLevel;
    combinedAtom[IS_ATOM] = true;
    return omitSetterSignature(combinedAtom);
  };

  return function create(...a) {
    let atom;
    switch (a.length) {
      case 0:
        throw new Error('Please, specify arguments');
      case 1:
        if (isAtom(a[0])) {
          throw new Error('Please, specify mapper function');
        } else {
          atom = createAtom(a[0]);
          atom[IS_ATOM] = true;
          break;
        }
      default: {
        let mapper = a[a.length - 1];
        if (isAtom(mapper)) {
          mapper = _ => _;
          atom = combine(a);
        } else {
          if (a.length === 2) atom = a[0];
          else atom = combine(a.slice(0, -1));
        }
        atom = createAtomFrom(atom, mapper);
      }
    }
    return atom;
  };
};

describe('core', () => {
  it('basic', () => {
    const createAtom = createAtomCreator({
      final: 'final', // default `atom.subscribe`
    });

    const Toggle1 = createAtom(false);
    const Toggle2 = createAtom(false);

    Toggle1.subscribe(Toggle2);

    // start
    Toggle1(true);
    expect(Toggle2()).toBe(true);
  });

  it('compute', () => {
    const createAtom = createAtomCreator({
      compute: 'compute',
      final: 'final',
    });

    const Toggle = createAtom(false);
    const Counter = createAtom(0);
    const Logger = createAtom(0);

    Counter.compute.subscribe(v => v < 5 && Counter(v + 1));

    Counter.subscribe(() => Toggle(true));

    Toggle.subscribe(() => Logger(Logger() + 1));

    // start
    Counter(0);

    expect(Toggle()).toBe(true);
    expect(Logger()).toBe(1);
  });

  it('rhombus', () => {
    const createAtom = createAtomCreator({
      workflow: 'workflow',
      accumulator: 'accumulator',
      compute: 'compute',
      final: 'final',
    });

    const Counter1 = createAtom(0);
    const Counter2 = createAtom(0);
    const Counters = createAtom([Counter1(), Counter2()]);
    const Sum = createAtom(Counter1() + Counter2());
    const view = jest.fn();

    Counter2.workflow.subscribe(v => v < 5 && Counter1(v + 1));
    Counter1.workflow.subscribe(v => v <= 4 && Counter2(v + 1));

    Counter1.accumulator.subscribe(v => Counters([Counters()[0], v]));
    Counter2.accumulator.subscribe(v => Counters([v, Counters()[1]]));
    Counters.compute.subscribe(([c1, c2]) => Sum(c1 + c2));

    Sum.subscribe(view);

    // start
    Counter1(0);

    expect(Sum()).toBe(9);
    expect(view.mock.calls.length).toBe(1);
  });

  it('map', () => {
    const create = importFromThirdPartyLibrary();

    const One = create('one');
    const Two = create('two');
    const Shape = create(One, Two, ([one, two]) => ({ one, two }));
    const One2 = create(Shape, ({ one }) => one);
    const Two2 = create(Shape, ({ two }) => two);

    const Shape2 = create(One2, Two2, ([one, two]) => ({ one, two }));

    const view = jest.fn();
    Shape2.subscribe(view);

    One('one!');
    expect(Shape2()).toEqual({ one: 'one!', two: 'two' });
    expect(view.mock.calls.length).toBe(1);
  });

  it('rhombus2', () => {
    const create = importFromThirdPartyLibrary();

    const FirstName = create('John');
    const LastName = create('Doe');

    const FullName = create(FirstName, LastName, names => names.join(' '));

    const DisplayName = create(FirstName, FullName, ([firstName, fullName]) =>
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

  it('map memoized', () => {
    const create = importFromThirdPartyLibrary();
    const memoize = map => {
      let lastValue;
      return v => {
        const newValue = map(v);
        if (lastValue === newValue) return MEMOIZED;
        else return (lastValue = newValue);
      };
    };

    // TODO: shortcut for
    // `const FirstName = create("John", memoize(v => v));`
    const FirstName = create('John');
    const LastName = create('Doe');

    const FullName = create(FirstName, LastName, names => names.join(' '));

    const DisplayName = create(
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

  it('rhombus3', () => {
    const create = importFromThirdPartyLibrary();

    const FirstName = create('John');
    const LastName = create('Doe');

    const isFirstNameShortMap = jest.fn(v => v.length < 10);
    const IsFirstNameShort = create(FirstName, isFirstNameShortMap);

    const fullNameMap = jest.fn(names => names.join(' '));
    const FullName = create(FirstName, LastName, fullNameMap);

    const displayNameMap = jest.fn(([firstName, isFirstNameShort, fullName]) =>
      isFirstNameShort ? fullName : firstName,
    );
    const DisplayName = create(
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
