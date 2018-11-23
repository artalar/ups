// @flow
import PubSubType from '../core';

type AtomStatic<T> = {
  eventType: string,
  subscribe: (cb: (state: T) => *) => () => void,
  '@@UPS/ATOM/IS_ATOM': true,
  '@@UPS/ATOM/COMPUTED_LEVEL': number,
};

type Atom<T> = ((newState?: T) => T) & AtomStatic<T>;

type AtomWithoutSet<T> = (() => T) & AtomStatic<T>;

type CreateAtomPlain = <State>(
  initialState: State,
  description?: string,
) => Atom<State>;

type CombineAtomsResult<T> =
  | $TupleMap<T, <A>(a: A) => $Call<A>>
  | $ObjMap<T, <A>(a: A) => $Call<A>>;

type CombineAtoms = <
  T: $ReadOnlyArray<Atom<*>> | { [string]: Atom<*> },
  M: Function,
>(
  atoms: T,
  mapper: M,
) => Atom<$Call<CombineAtomsResult<T>, M>>;

// eslint-disable-next-line
const IS_ATOM = '@@UPS/ATOM/IS_ATOM';
const COMPUTED_LEVEL = '@@UPS/ATOM/COMPUTED_LEVEL';
const MEMORIZED = '@@UPS/ATOM/MEMORIZED';

function isAtom(atom): %checks {
  // TODO:
  // $off
  return Boolean(atom && atom['@@UPS/ATOM/IS_ATOM'] === true);
}

function withAtoms(PubSub: typeof PubSubType) {
  return class PubSubWithAtoms extends PubSub {
    _atomsCount: number;

    createAtomPlain: CreateAtomPlain;

    combineAtoms: CombineAtoms;

    createAtom: CreateAtomPlain | CombineAtoms;

    constructor(...a: [] | [string]) {
      super(...a);

      this._atomsCount = 0;
      // $off
      this.createAtomPlain = this.createAtomPlain.bind(this);
      // $off
      this.combineAtoms = this.combineAtoms.bind(this);
      // $off
      this.createAtom = this.createAtom.bind(this);
    }

    _omitSetterSignature<T>(originalAtom: Atom<T>): AtomWithoutSet<T> {
      function atom(...a) {
        if (a.length === 0) return originalAtom();
        throw new TypeError('Combined atom can not set the value');
      }
      // TODO:
      // $off
      return Object.assign(atom, originalAtom);
    }

    createAtomPlain<State>(
      initialState: State,
      description?: string = '',
    ): Atom<State> {
      let state: State = initialState;

      function atom(newState?: State): State {
        if (arguments.length !== 0) {
          // TODO:
          // $off
          state = newState;
          this.dispatch(atom.eventType, state);
        }
        return state;
      }
      // eslint-disable-next-line
      atom = atom.bind(this);

      atom.eventType = `@@UPS/ATOM/[${++this._atomsCount}] ${description}`;

      atom.subscribe = cb => this.subscribe(cb, atom.eventType);

      atom['@@UPS/ATOM/IS_ATOM'] = true;
      atom['@@UPS/ATOM/COMPUTED_LEVEL'] = 0;

      // TODO:
      // $off
      return atom;
    }

    // TODO: GC
    combineAtoms<
      T: $ReadOnlyArray<Atom<*>> | { [string]: Atom<*> },
      M: Function,
    >(atoms: T, mapper: M): Atom<$Call<M, CombineAtomsResult<T>>> {
      let maxComputedLevel = 0;
      const isList = Array.isArray(atoms);
      // TODO:
      // const keys: (Object | mixed[]) => string[] = (Object.keys: any)
      const atomsIndex = Object.keys(atoms);
      const atomsValue: CombineAtomsResult<T> = atomsIndex.reduce(
        (acc, key) => {
          const atom = atoms[key];
          if (!isAtom(atom)) {
            throw new Error(`Property with key "${key}" is not atom`);
          }
          maxComputedLevel = Math.max(atom[COMPUTED_LEVEL], maxComputedLevel);
          acc[key] = atom();
          return acc;
        },
        isList ? [] : {},
      );

      const combinedAtom = this.createAtomPlain(atomsValue);

      combinedAtom[COMPUTED_LEVEL] = maxComputedLevel + 1;

      for (let i = 0; i < atomsIndex.length; i++) {
        const key = atomsIndex[i];
        this.subscribe(
          // eslint-disable-next-line
          newValue => {
            const accumulator = isList
              ? combinedAtom().slice(0)
              : Object.assign({}, combinedAtom());
            accumulator[key] = newValue;
            combinedAtom(accumulator);
          },
          atoms[key].eventType,
          maxComputedLevel,
        );
      }

      const atom = this.createAtomPlain(mapper(combinedAtom()));

      atom[COMPUTED_LEVEL] = combinedAtom[COMPUTED_LEVEL] + 1;

      this.subscribe(
        value => {
          const newValue = mapper(value);
          if (newValue !== MEMORIZED) atom(newValue);
        },
        combinedAtom.eventType,
        combinedAtom[COMPUTED_LEVEL],
      );

      return this._omitSetterSignature(atom);
    }

    createAtom<T, M: Function>(value: T, mapper?: M) {
      return mapper === undefined
        ? this.createAtomPlain(value)
        : this.combineAtoms(value, mapper);
    }
  };
}

module.exports = withAtoms;
