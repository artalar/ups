// @flow

const logOptions: {
  disabled: boolean,
  groupCollapsed: boolean,
  persistent: false,
} = {
  disabled: typeof window === 'undefined',
  groupCollapsed: true,
  persistent: false,
}

const rootScope = typeof window !== 'undefined' ? window : {}

rootScope.logOptions = logOptions
rootScope.log = log

/** Log subject end show location of it
 * you can mange options of logging by `window.logOptions`
 */
export default function log<T>(
  subject: T,
  hint?: ?string,
  options?: $Shape<typeof logOptions> = logOptions,
): T {
  const {disabled = false, groupCollapsed = true, persistent = false} = options
  if (!__DEV__) return subject
  if (disabled) return subject

  const [callerPath] = getCaller()
  const groupStart = groupCollapsed ? console.groupCollapsed : console.group
  const isError = subject instanceof Error
  const title = hint ? hint : `${isError ? 'Error' : 'Log'} from: ${callerPath}`

  groupStart(title)

  if (hint) console.log(title)
  if (isError) console.error(subject)
  else console.log(persistent ? deepCopy(subject) : subject)

  console.groupEnd()

  return subject
}

// TODO: Map, Set or replace by outer lib
function deepCopy(obj) {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    acc[key] =
      typeof value === 'object' && value !== null ? deepCopy(value) : value
    return acc
  }, Array.isArray(obj) ? [] : {})
}

// https://stackoverflow.com/questions/13227489/how-can-one-get-the-file-path-of-the-caller-function-in-node-js
function getCaller() {
  const stack = getStack()

  stack.shift() // getStack
  stack.shift() // getCaller

  // Return caller's caller
  return stack
}

function getStack() {
  // Save original Error.prepareStackTrace
  const origPrepareStackTrace = Error.prepareStackTrace

  // Override with function that just returns `stack`
  Error.prepareStackTrace = (_, stack) => stack

  // Create a new `Error`, which automatically gets `stack`
  // Evaluate `err.stack`, which calls our new `Error.prepareStackTrace`
  const {stack} = new Error()

  // Restore original `Error.prepareStackTrace`
  Error.prepareStackTrace = origPrepareStackTrace

  // Remove superfluous function call on stack
  stack.shift() // getStack --> Error

  return stack
}
