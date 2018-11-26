const IS_ATOM = '@@UPS/ATOM/IS_ATOM';
const COMPUTED_LEVEL = '@@UPS/ATOM/COMPUTED_LEVEL';
const MEMORIZED = '@@UPS/ATOM/MEMORIZED';

// FIXME: replace
function getCaller() {
  // Save original Error.prepareStackTrace
  const origPrepareStackTrace = Error.prepareStackTrace;

  // Override with function that just returns `stack`
  Error.prepareStackTrace = (_, stack) => stack;

  // Create a new `Error`, which automatically gets `stack`
  // Evaluate `err.stack`, which calls our new `Error.prepareStackTrace`
  const { stack } = new Error();

  // Restore original `Error.prepareStackTrace`
  Error.prepareStackTrace = origPrepareStackTrace;

  if (!Array.isArray(stack)) return '';

  // Remove superfluous function call on stack
  // Error
  // getCaller
  // Return caller's caller
  return stack[2];
}

function isAtom(atom) {
  return Boolean(atom && atom[IS_ATOM] === true);
}

function withAtoms(PubSub) {
  return class PubSubWithAtoms extends PubSub {
    constructor(...a) {
      super(...a);

      this._atomsCount = 0;
      this.createAtom = this.createAtom.bind(this);
      this.combineAtoms = this.combineAtoms.bind(this);
      this.multiAtom = this.multiAtom.bind(this);
    }

    _omitSetterSignature(originalAtom) {
      function atom() {
        if (arguments.length === 0) return originalAtom();
        throw new TypeError('@@UPS: combined atom can not be setter');
      }
      return Object.assign(atom, originalAtom);
    }

    createAtom(initialState, description = getCaller()) {
      let state = initialState;

      function atom(newState?) {
        if (arguments.length !== 0) {
          state = newState;
          this.dispatch(atom.eventType, state);
        }
        return state;
      }
      // eslint-disable-next-line no-func-assign
      atom = atom.bind(this);

      atom.eventType = `@@UPS/ATOM/[${++this._atomsCount}] ${description}`;

      atom.map = function map(mapper, computedAtomDescription) {
        const computedAtom = this.createAtom(
          mapper(atom()),
          computedAtomDescription,
        );

        computedAtom[COMPUTED_LEVEL] = atom[COMPUTED_LEVEL] + 1;

        this.subscribe(
          value => {
            const newValue = mapper(value);
            if (newValue !== MEMORIZED) computedAtom(newValue);
          },
          atom.eventType,
          atom[COMPUTED_LEVEL],
        );

        return this._omitSetterSignature(computedAtom);
      }.bind(this);

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

      const combinedAtom = this.createAtom(atomsValue);

      combinedAtom[COMPUTED_LEVEL] = maxComputedLevel + 1;

      for (let i = 0; i < atoms.length; i++) {
        this.subscribe(
          // eslint-disable-next-line
          newValue => {
            const accumulator = combinedAtom();
            accumulator[i] = newValue;
            combinedAtom(accumulator);
          },
          atoms[i].eventType,
          maxComputedLevel,
        );
      }

      return combinedAtom.map(value => mapper(...value));
    }

    multiAtom(...a) {
      return a.length === 1 ? this.createAtom(a[0]) : this.combineAtoms(...a);
    }
  };
}

module.exports = withAtoms;
