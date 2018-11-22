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

type CreateAtomFrom = <State, PublisherState>(
  pub: Atom<PublisherState>,
  map: (s: PublisherState) => State,
) => (() => State) & AtomStatic<State>;

type CombineAtoms = <T: $ReadOnlyArray<Atom<*>>>(
  atoms: T,
) => Atom<$TupleMap<T, <A>(a: A) => $Call<A>>>;

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

    createAtomFrom: CreateAtomFrom;

    combineAtoms: CombineAtoms;

    createAtom: CreateAtomPlain | CreateAtomFrom | CombineAtoms;

    constructor(...a: [] | [string]) {
      super(...a);

      this._atomsCount = 0;
      // $off
      this.createAtomPlain = this.createAtomPlain.bind(this);
      // $off
      this.createAtomFrom = this.createAtomFrom.bind(this);
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
    createAtomFrom<State, PublisherState>(
      pub: Atom<PublisherState>,
      map: (s: PublisherState) => State,
    ): (() => State) & AtomStatic<State> {
      if (!isAtom(pub)) throw new Error('Publisher is not atom');

      const atom = this.createAtomPlain(map(pub()));

      atom[COMPUTED_LEVEL] = pub[COMPUTED_LEVEL] + 1;

      this.subscribe(
        (value: PublisherState) => {
          const newValue = map(value);
          if (newValue !== MEMORIZED) atom(newValue);
        },
        pub.eventType,
        pub[COMPUTED_LEVEL],
      );

      return this._omitSetterSignature(atom);
    }

    combineAtoms<T: $ReadOnlyArray<Atom<*>>>(
      // eslint-disable-next-line
      atoms: T,
    ): Atom<$TupleMap<T, <A>(a: A) => $Call<A>>> {
      let maxComputedLevel = 0;
      // eslint-disable-next-line
      const atomsValue: $TupleMap<T, <A>(a: A) => $Call<A>> = atoms.map(
        atom => {
          if (!isAtom(atom)) throw new Error('Atom is not atom');
          maxComputedLevel = Math.max(atom[COMPUTED_LEVEL], maxComputedLevel);
          return atom();
        },
      );

      const combinedAtom = this.createAtomPlain(atomsValue);

      for (let i = 0; i < atoms.length; i++) {
        this.subscribe(
          newValue => {
            const accumulator = combinedAtom().slice(0);
            accumulator[i] = newValue;
            combinedAtom(accumulator);
          },
          atoms[i].eventType,
          maxComputedLevel,
        );
      }

      combinedAtom[COMPUTED_LEVEL] = maxComputedLevel + 1;
      return this._omitSetterSignature(combinedAtom);
    }

    // TODO:
    // $off
    createAtom<T, T1, T21, T22, T31, T32, T33, T41, T42, T43, T44>(
      // eslint-disable-next-line
      ...a:
        | [T]
        | [Atom<T1>, Function]
        | [Atom<T21>, Atom<T22>]
        | [Atom<T21>, Atom<T22>, Function]
        | [Atom<T31>, Atom<T32>, Atom<T33>]
        | [Atom<T31>, Atom<T32>, Atom<T33>, Function]
        | [Atom<T41>, Atom<T42>, Atom<T43>, Atom<T44>, Function]
        | [Atom<T41>, Atom<T42>, Atom<T43>, Atom<T44>]
    ) {
      switch (a.length) {
        case 0:
          throw new Error('Please, specify arguments');
        case 1:
          if (isAtom(a[0])) throw new Error('Please, specify mapper function');
          // $off
          return this.createAtomPlain<T>(a[0]);
        case 2:
          // $off
          if (isAtom(a[a.length - 1])) return this.combineAtoms<[T21, T22]>(a);
          // $off
          return this.createAtomFrom<T1>(a[0], a[1]);
        case 3:
          if (isAtom(a[a.length - 1]))
            // $off
            return this.combineAtoms<[T31, T32, T33]>(a);
          // $off
          return this.createAtomFrom(
            // $off
            this.combineAtoms<[T31, T32]>([a[0], a[1]]),
            // $off
            a[2],
          );
        case 4:
          if (isAtom(a[a.length - 1]))
            // $off
            return this.combineAtoms<[T41, T42, T43, T44]>(a);
          // $off
          return this.createAtomFrom(
            // $off
            this.combineAtoms<[T41, T42, T43]>([a[0], a[1], a[2]]),
            // $off
            a[3],
          );
        default:
          throw new Error('flow...............');
      }
    }
  };
}

module.exports = withAtoms;
