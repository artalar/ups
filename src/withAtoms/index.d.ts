import PubSub from '../core';

export type Atom<State> = {
    (newState?: State): State,
    eventType: string,
    map: <NewState>(
        mapper: (state: State) => NewState,
        description?: string
    ) => Atom<NewState>,
    filter: (
        predicate: (state: State) => boolean,
        description?: string
    ) => Atom<State>,
    subscribe: (cb: (state: State) => any) => () => void,
};

declare function combineAtoms<A, State>(
    a: Atom<A>,
    mapper: (a: A) => State
): Atom<State>;
declare function combineAtoms<A1, A2, State>(
    a1: Atom<A1>,
    a2: Atom<A2>,
    mapper: (a1: A1, a2: A2) => State
): Atom<State>;
declare function combineAtoms<A1, A2, A3, State>(
    a1: Atom<A1>,
    a2: Atom<A2>,
    a3: Atom<A3>,
    mapper: (a1: A1, a2: A2, a3: A3) => State
): Atom<State>;
declare function combineAtoms<A1, A2, A3, A4, State>(
    a1: Atom<A1>,
    a2: Atom<A2>,
    a3: Atom<A3>,
    a4: Atom<A4>,
    mapper: (a1: A1, a2: A2, a3: A3, a4: A4) => State
): Atom<State>;

declare function multiAtom<State>(value: State): Atom<State>;
declare function multiAtom<A, State>(
    a: Atom<A>,
    mapper: (a: A) => State
): Atom<State>;
declare function multiAtom<A1, A2, State>(
    a1: Atom<A1>,
    a2: Atom<A2>,
    mapper: (a1: A1, a2: A2) => State
): Atom<State>;
declare function multiAtom<A1, A2, A3, State>(
    a1: Atom<A1>,
    a2: Atom<A2>,
    a3: Atom<A3>,
    mapper: (a1: A1, a2: A2, a3: A3) => State
): Atom<State>;
declare function multiAtom<A1, A2, A3, A4, State>(
    a1: Atom<A1>,
    a2: Atom<A2>,
    a3: Atom<A3>,
    a4: Atom<A4>,
    mapper: (a1: A1, a2: A2, a3: A3, a4: A4) => State
): Atom<State>;

export declare class PubSubWithAtoms extends PubSub {
    combineAtoms: typeof combineAtoms;
    multiAtom: typeof multiAtom;

    constructor(title?: string);

    createAtom<State>(
        initialState: State,
        descriptions?: string
    ): Atom<State>;

}

export declare function withAtoms(
    PB: PubSub
): PubSubWithAtoms;
