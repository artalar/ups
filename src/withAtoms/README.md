> status: **PoC**

> possible problems: unrealized memory garbage

Friendly API for reactive programming. Automatically expand rhombus and circular dependencies.

> ### You can find API example it tests

```
npm i @artalar/ups
```

### Usage

```javascript
import { PubSub, withAtoms } from '@artalar/ups';
const PubSubWithAtoms = withAtoms(PubSub);
const { createAtom, combineAtoms, multiAtom } = new PubSubWithAtoms();
```
