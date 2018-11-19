// @flow
import PubSubType from '../core';

type AtomStatic<T> = {
  eventType: string,
  subscribe: (cb: (state: T) => any) => () => void,
  '@@UPS/ATOM/IS_ATOM': true,
  '@@UPS/ATOM/COMPUTED_LEVEL': number,
};

type Atom<T> = ((newState?: T) => T) & AtomStatic<T>;

const IS_ATOM = '@@UPS/ATOM/IS_ATOM';
const COMPUTED_LEVEL = '@@UPS/ATOM/COMPUTED_LEVEL';
const MEMORIZED = '@@UPS/ATOM/MEMORIZED';

const isAtom = atom => atom[IS_ATOM] === true;

function omitSetterSignature<T>(
  originalAtom: Atom<T>,
): (() => T) & AtomStatic<T> {
  function atom(...a) {
    if (a.length === 0) return originalAtom();
    throw new TypeError('Combined atom can not set the value');
  }
  return Object.assign(atom, originalAtom);
}

function createAtomCreator(pb: PubSubType) {
  let atomsCount = 0;
  function createAtom<State>(
    initialState: State,
    description?: string = '',
  ): Atom<State> {
    let state: State = initialState;

    function atom(newState?: State): State {
      if (arguments.length !== 0) {
        state = newState;
        pb.dispatch(atom.eventType, state);
      }
      return state;
    }
    atom.eventType = `@@UPS/ATOM/[${++atomsCount}] ${description}`;

    atom.subscribe = cb => pb.subscribe(cb, atom.eventType);

    atom[IS_ATOM] = true;
    atom[COMPUTED_LEVEL] = 0;

    return atom;
  }

  // TODO: GC
  function createAtomFrom<State, PublisherState>(
    pub: Atom<PublisherState>,
    map: (s: PublisherState) => State,
  ): (() => State) & AtomStatic<State> {
    const atom = createAtom(map(pub()));

    atom[COMPUTED_LEVEL] = pub[COMPUTED_LEVEL] + 1;

    pb.subscribe(
      (value: PublisherState) => {
        const newValue = map(value);
        if (newValue !== MEMORIZED) atom(newValue);
      },
      pub.eventType,
      atom[COMPUTED_LEVEL],
    );

    return omitSetterSignature(atom);
  }

  function combineAtoms(atoms: [Atom<mixed>]) {
    let maxComputedLevel = 0;
    const atomsValue = atoms.map(atom => {
      maxComputedLevel = Math.max(atom[COMPUTED_LEVEL], maxComputedLevel);
      return atom();
    });
    const combinedAtom = createAtom(atomsValue);
    const accumulator = combinedAtom();
    for (let i = 0; i < atoms.length; i++) {
      pb.subscribe(
        newValue => {
          accumulator[i] = newValue;
          combinedAtom(accumulator);
        },
        atoms[i].eventType,
        // TODO: `atoms[i][COMPUTED_LEVEL] + 1` ?
        0,
      );
    }
    combinedAtom[COMPUTED_LEVEL] = maxComputedLevel;
    return omitSetterSignature(combinedAtom);
  }

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
          atom = combineAtoms(a);
        } else {
          if (a.length === 2) atom = a[0];
          else atom = combineAtoms(a.slice(0, -1));
        }
        atom = createAtomFrom(atom, mapper);
      }
    }
    return atom;
  };
}

module.exports = createAtomCreator;
