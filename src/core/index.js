// @flow

type QueuesPriority = {
  [string]: string,
};

type Subscribe<S> = ((s: S) => any) => () => void;

// type AtomCallable<S> = S => S | (() => S);

// type AtomStatic<S, K> = {
//   subscribe: Subscribe<S>,
//   [K]: {
//     subscribe: Subscribe<S>,
//   },
// };

// type Atom<S, K> = AtomCallable<S> & AtomStatic<S, K>

type Atom<S, K> = {
  (...a: [] | [S]): S,
  subscribe: Subscribe<S>,
  [K]: {
    subscribe: Subscribe<S>,
  },
};

export type AtomCreator<Q> = <S>(s: S) => Atom<S, $Keys<Q>>;

function createAtomCreator<Q: QueuesPriority>(
  queuePriority: Q,
): AtomCreator<Q> {
  const queuePriorityNames: $Keys<Q>[] = Object.keys(queuePriority);
  const masterQueue: $ObjMap<
    Q,
    () => Map<Object, { value: mixed, subscribers: Iterator<Function> }>,
  > = queuePriorityNames.reduce(
    (acc, key) => ({ ...acc, [key]: new Map() }),
    {},
  );
  let isNotifying = false;

  function notify() {
    isNotifying = true;
    for (
      let currentQueueNameIndex = 0;
      currentQueueNameIndex < queuePriorityNames.length;
      currentQueueNameIndex++
    ) {
      const currentQueueName = queuePriorityNames[currentQueueNameIndex];
      const currentQueue = masterQueue[currentQueueName];

      if (currentQueue.size !== 0) {
        const iteratedQueue = [...currentQueue.values()];
        currentQueue.clear();

        for (const atomDescription of iteratedQueue) {
          const { value, subscribers } = atomDescription;
          subscribers.forEach(subscriber => subscriber(value));
        }
        // subscribers could updated some atoms
        // so we need start over
        currentQueueNameIndex = -1;
      }
    }
    isNotifying = false;
  }

  function createAtom<S>(initialState: S): $Call<AtomCreator<Q>, S> {
    const uid = {};
    let state = initialState;
    const masterQueueLocal: $ObjMap<
      Q,
      () => Set<Function>,
    > = queuePriorityNames.reduce(
      (acc, key) => ({ ...acc, [key]: new Set() }),
      {},
    );

    function update(newState: S) {
      state = newState;

      for (let i = 0; i < queuePriorityNames.length; i++) {
        const targetQueueName = queuePriorityNames[i];
        const targetQueue = masterQueue[targetQueueName];

        targetQueue.set(uid, {
          value: state,
          subscribers: masterQueueLocal[targetQueueName],
        });
      }

      if (isNotifying === false) notify();

      return state;
    }

    function atom(...a) {
      if (a.length === 0) return state;
      if (a.length === 1) {
        return update(a[0]);
      }
      // TODO:
      throw new Error();
    }

    atom.subscribe = function(callback) {
      const queueName = queuePriorityNames[queuePriorityNames.length - 1];
      masterQueueLocal[queueName].add(callback);
      return function() {
        masterQueueLocal[queueName].delete(callback);
      };
    };

    for (let i = 0; i < queuePriorityNames.length; i++) {
      const queueName = queuePriorityNames[i];
      atom[queueName] = {
        subscribe(callback) {
          masterQueueLocal[queueName].add(callback);
          return function() {
            masterQueueLocal[queueName].delete(callback);
          };
        },
      };
    }

    return atom;
  }

  return createAtom;
}

module.exports = createAtomCreator;
