// @flow

type EventProperties = {
  payload?: *,
  prioritySubscribers: { [string | number]: Set<Function> },
  subscribers: Set<Function>,
};

class PubSub {
  /* ::
    _title: string
    _priorityQueues: Array<Set<string>>
    _finalQueue: Set<string>
    _eventsProperties: {
      [string]: EventProperties
    }
    _isPublishing: boolean
    _startOver: boolean
    _payloads: { [string]: * }
  */
  constructor(title?: string) {
    this._title = `@@UPS/${title || 'CORE'}`;
    this._priorityQueues = [this._createSet()];
    this._finalQueue = this._createSet();
    this._eventsProperties = {};
    this._isPublishing = false;
    this._startOver = false;
    // new subscribers delayed to end of dispatch
    this._newSubscribers = this._createSet();
  }

  // For old browsers `Set` can be replaced by minimal `Set` polyfill
  // required methods: `{ add(){} delete(){} size: number }`
  _createSet(): Set<string> | Set<Function> {
    return new Set();
  }

  _publish() {
    const priorityQueues = this._priorityQueues;

    do {
      this._startOver = false;
      for (
        let priorityQueueIndex = 0, isLastQueue = false;
        priorityQueueIndex < priorityQueues.length || isLastQueue;
        priorityQueueIndex++,
          isLastQueue = priorityQueueIndex === priorityQueues.length
      ) {
        this._startOver = false;

        const eventTypes = isLastQueue
          ? this._finalQueue
          : priorityQueues[priorityQueueIndex];
        if (eventTypes.size === 0) continue;
        if (isLastQueue) this._finalQueue = this._createSet();
        else priorityQueues[priorityQueueIndex] = this._createSet();

        eventTypes.forEach(eventType => {
          const eventsProperties = this._eventsProperties[eventType];
          // was unsubscribes at the time of dispatching
          if (eventsProperties === undefined) return;

          const subscribers = isLastQueue
            ? eventsProperties.subscribers
            : eventsProperties.prioritySubscribers[priorityQueueIndex];

          if (subscribers === undefined || subscribers.size === 0) return;

          if ('payload' in eventsProperties) {
            this._payloads[eventType] = eventsProperties.payload;
            delete eventsProperties.payload;
          }

          const value = this._payloads[eventType];

          subscribers.forEach(subscriber => subscriber(value));
        });

        if (this._startOver) {
          priorityQueueIndex = -1;
        }
      }
    } while (this._startOver);

    this._newSubscribers.forEach(updateSubscribers => updateSubscribers());
    this._newSubscribers = this._createSet();
  }

  _startPublish() {
    if (this._isPublishing === false) {
      this._isPublishing = true;
      this._payloads = {};
      try {
        this._publish();
      } catch (e) {
        this._isPublishing = false;
        this._payloads = {};
        if (e instanceof Error) throw e;
        if (typeof e === 'string') throw new Error(e);
        const error = new Error(
          '@@UPS: error when notifying subscribers.' +
            '\nSee error data in `data` property of this Error instance',
        );
        // $off
        error.data = e;
        throw error;
      }

      this._isPublishing = false;
      this._payloads = {};
    } else {
      this._startOver = true;
    }
  }

  _createEventProperties(): EventProperties {
    return {
      subscribers: this._createSet(),
      prioritySubscribers: {},
    };
  }

  _bindSubscriber(
    subscribers: Set<Function>,
    listener: Function,
    eventType: string,
  ) {
    const eventsProperties = this._eventsProperties;
    const eventProperties = eventsProperties[eventType];
    const { prioritySubscribers } = eventProperties;

    if (this._isPublishing) {
      const updateSubscribers = () => subscribers.add(listener);
      this._newSubscribers.add(updateSubscribers);
    } else {
      subscribers.add(listener);
    }

    return function unsubscribe() {
      subscribers.delete(listener);
      if (eventProperties.subscribers.size !== 0) return;
      const keys = Object.keys(prioritySubscribers);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (prioritySubscribers[key] !== undefined) {
          if (prioritySubscribers[key].size === 0) {
            delete prioritySubscribers[key];
          } else {
            return;
          }
        }
      }
      // there is no one subscriber, we don't need eventProperties
      // for prevent empty dispatch
      delete eventsProperties[eventType];
    };
  }

  subscribe(
    listener: Function,
    eventType: string,
    priorityIndex?: number,
  ): () => void {
    if (typeof listener !== 'function') {
      throw new TypeError(
        `@@UPS: expected the listener to be a function, but got: ${typeof listener}.`,
      );
    }
    if (typeof eventType !== 'string') {
      throw new TypeError(
        `@@UPS: expected the eventType to be a string, but got: ${typeof eventType}.`,
      );
    }

    const priorityQueuesLength = this._priorityQueues.length;
    const eventProperties =
      this._eventsProperties[eventType] ||
      (this._eventsProperties[eventType] = this._createEventProperties());

    // `this._finalQueue`
    if (priorityIndex === undefined) {
      return this._bindSubscriber.call(
        this,
        eventProperties.subscribers,
        listener,
        eventType,
      );
    }

    // `this._priorityQueues`
    if (priorityQueuesLength < priorityIndex) {
      throw new Error(
        '@@UPS: too big "priorityIndex". ' +
          `Current: ${priorityQueuesLength}, requested: ${priorityIndex}`,
      );
    }
    if (priorityQueuesLength === priorityIndex) {
      this._priorityQueues.push(this._createSet());
    }
    return this._bindSubscriber.call(
      // prettier-ignore
      this,
      eventProperties.prioritySubscribers[priorityIndex] ||
        (eventProperties.prioritySubscribers[priorityIndex] = this._createSet()),
      listener,
      eventType,
    );
  }

  dispatch(eventType: string, payload?: *) {
    if (typeof eventType !== 'string') {
      throw new TypeError(
        `@@UPS: expected the eventType to be a string, but got: ${typeof eventType}.`,
      );
    }

    const eventProperties = this._eventsProperties[eventType];

    // No one has subscribe for the event yet
    if (eventProperties === undefined) return;

    eventProperties.payload = payload;

    for (let i = 0; i < this._priorityQueues.length; i++) {
      this._priorityQueues[i].add(eventType);
    }
    this._finalQueue.add(eventType);

    this._startPublish();
  }
}

module.exports = PubSub;
