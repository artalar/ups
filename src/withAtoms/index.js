// @flow
import PubSubType from '../core';

type AtomStatic<T> = {
  eventType: string,
  subscribe: (cb: (state: T) => any) => () => void,
  '@@UPS/ATOM/IS_ATOM': true,
  '@@UPS/ATOM/COMPUTED_LEVEL': number,
};

type Atom<T> = {
  (newState?: T): T,
  ...AtomStatic<T>,
};

type AtomWithoutSet<T> = {
  (): T,
  ...(() => T) & AtomStatic<T>,
};

const IS_ATOM = '@@UPS/ATOM/IS_ATOM';
const COMPUTED_LEVEL = '@@UPS/ATOM/COMPUTED_LEVEL';
const MEMORIZED = '@@UPS/ATOM/MEMORIZED';

function withAtoms(PubSub: typeof PubSubType) {
  return class PubSubWithAtoms extends PubSub {
    /* ::
      _atomsCount: number
    */
    constructor(...a) {
      super(...a);

      this._atomsCount = 0;
      this.createAtomPlain = this.createAtomPlain.bind(this);
      this.createAtomFrom = this.createAtomFrom.bind(this);
      this.combineAtoms = this.combineAtoms.bind(this);
      this.createAtom = this.createAtom.bind(this);
    }

    _isAtom<T>(atom: ?Atom<T>): boolean {
      return Boolean(atom && atom[IS_ATOM] === true);
    }

    _omitSetterSignature<T>(originalAtom: Atom<T>): AtomWithoutSet<T> {
      function atom(...a) {
        if (a.length === 0) return originalAtom();
        throw new TypeError('Combined atom can not set the value');
      }
      return Object.assign(atom, originalAtom);
    }

    createAtomPlain<State>(
      initialState: State,
      description?: string = '',
    ): Atom<State> {
      let state: State = initialState;

      function atom(newState?: State): State {
        if (arguments.length !== 0) {
          state = newState;
          this.dispatch(atom.eventType, state);
        }
        return state;
      }
      atom = atom.bind(this);

      atom.eventType = `@@UPS/ATOM/[${++this._atomsCount}] ${description}`;

      atom.subscribe = cb => this.subscribe(cb, atom.eventType);

      atom[IS_ATOM] = true;
      atom[COMPUTED_LEVEL] = 0;

      return atom;
    }

    // TODO: GC
    createAtomFrom<State, PublisherState>(
      pub: Atom<PublisherState>,
      map: (s: PublisherState) => State,
    ): (() => State) & AtomStatic<State> {
      if (!this._isAtom(pub)) throw new Error('Publisher is not atom');

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

    combineAtoms<T>(
      // eslint-disable-next-line
      atoms: T,
    ) {
      if (atoms.length < 2 || atoms.length > 4) {
        throw new TypeError('TODO: flow...');
      }

      let maxComputedLevel = 0;
      // eslint-disable-next-line
      const atomsValue: $TupleMap<T, <A>(a: A) => $Call<A>> = atoms.map(
        atom => {
          if (!this._isAtom(atom)) throw new Error('Atom is not atom');
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
          if (this._isAtom(a[0]))
            throw new Error('Please, specify mapper function');
          return this.createAtomPlain<T>(a[0]);
        case 2:
          if (this._isAtom(a[a.length - 1]))
            return this.combineAtoms<[T21, T22]>(a);
          return this.createAtomFrom<T1>(a[0], a[1]);
        case 3:
          if (this._isAtom(a[a.length - 1]))
            return this.combineAtoms<[T31, T32, T33]>(a);
          return this.createAtomFrom(
            this.combineAtoms<[T31, T32]>([a[0], a[1]]),
            a[2],
          );
        case 4:
          if (this._isAtom(a[a.length - 1]))
            return this.combineAtoms<[T41, T42, T43, T44]>(a);
          return this.createAtomFrom(
            this.combineAtoms<[T41, T42, T43]>([a[0], a[1], a[2]]),
            a[3],
          );
        default:
          throw new Error('flow...............');
      }
    }
  };
}

module.exports = withAtoms;
