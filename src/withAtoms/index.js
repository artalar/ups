const IS_ATOM = '@@UPS/ATOM/IS_ATOM';
const COMPUTED_LEVEL = '@@UPS/ATOM/COMPUTED_LEVEL';
const MEMORIZED = '@@UPS/ATOM/MEMORIZED';

function getStack() {
  // Save original Error.prepareStackTrace
  const origPrepareStackTrace = Error.prepareStackTrace;

  // Override with function that just returns `stack`
  Error.prepareStackTrace = (_, stack) => stack;

  // Create a new `Error`, which automatically gets `stack`
  // Evaluate `err.stack`, which calls our new `Error.prepareStackTrace`
  const { stack } = new Error();

  // Restore original `Error.prepareStackTrace`
  Error.prepareStackTrace = origPrepareStackTrace;

  // Remove superfluous function call on stack
  stack.shift(); // getStack --> Error

  return stack;
}

function getCaller() {
  const stack = getStack();

  stack.shift(); // getStack
  stack.shift(); // getCaller

  // Return caller's caller
  return stack;
}

function isAtom(atom) {
  return Boolean(atom && atom[IS_ATOM] === true);
}

function withAtoms(PubSub) {
  return class PubSubWithAtoms extends PubSub {
    constructor(...a) {
      super(...a);

      this._atomsCount = 0;
      this.createAtomPlain = this.createAtomPlain.bind(this);
      this.combineAtoms = this.combineAtoms.bind(this);
      this.createAtom = this.createAtom.bind(this);
    }

    _omitSetterSignature(originalAtom) {
      function atom() {
        if (arguments.length === 0) return originalAtom();
        throw new TypeError('@@UPS: combined atom can not be setter');
      }
      return Object.assign(atom, originalAtom);
    }

    createAtomPlain(initialState, description = getCaller()[0]) {
      let state = initialState;

      function atom(newState?) {
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
    combineAtoms(...atoms) {
      const mapper = atoms.splice(-1)[0];
      let maxComputedLevel = 0;
      const atomsValue = atoms.map((atom, i) => {
        if (!isAtom(atom)) {
          throw new Error(`@@UPS: argument №${i} is not atom`);
        }
        maxComputedLevel = Math.max(atom[COMPUTED_LEVEL], maxComputedLevel);
        return atom();
      });

      const combinedAtom = this.createAtomPlain(atomsValue);

      combinedAtom[COMPUTED_LEVEL] = maxComputedLevel + 1;

      for (let i = 0; i < atoms.length; i++) {
        this.subscribe(
          // eslint-disable-next-line
          newValue => {
            const accumulator = combinedAtom().slice(0);
            accumulator[i] = newValue;
            combinedAtom(accumulator);
          },
          atoms[i].eventType,
          maxComputedLevel,
        );
      }

      const atom = this.createAtomPlain(mapper(...combinedAtom()));

      atom[COMPUTED_LEVEL] = combinedAtom[COMPUTED_LEVEL] + 1;

      this.subscribe(
        value => {
          const newValue = mapper(...value);
          if (newValue !== MEMORIZED) atom(newValue);
        },
        combinedAtom.eventType,
        combinedAtom[COMPUTED_LEVEL],
      );

      return this._omitSetterSignature(atom);
    }

    createAtom(...a) {
      return a.length === 1
        ? this.createAtomPlain(a[0])
        : this.combineAtoms(...a);
    }
  };
}

module.exports = withAtoms;
