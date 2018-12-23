const _UPS_CONTEXT_DISPATCH = '@@UPS/redux/UPS_CONTEXT_DISPATCH'
export const UPS_CONTEXT_DISPATCH =
  typeof Symbol === 'function'
    ? Symbol(_UPS_CONTEXT_DISPATCH)
    : _UPS_CONTEXT_DISPATCH

const _UPS_CONTEXT_SUBSCRIBE = '@@UPS/redux/UPS_CONTEXT_SUBSCRIBE'
export const UPS_CONTEXT_SUBSCRIBE =
  typeof Symbol === 'function'
    ? Symbol(_UPS_CONTEXT_SUBSCRIBE)
    : _UPS_CONTEXT_SUBSCRIBE

const _IS_REDUCER = '@@UPS/redux/reducer/IS_REDUCER'
export const IS_REDUCER =
  typeof Symbol === 'function' ? Symbol(_IS_REDUCER) : _IS_REDUCER

const _REDUCER_PRIORITY_LEVEL = '@@UPS/redux/reducer/REDUCER_PRIORITY_LEVEL'
export const REDUCER_PRIORITY_LEVEL =
  typeof Symbol === 'function'
    ? Symbol(_REDUCER_PRIORITY_LEVEL)
    : _REDUCER_PRIORITY_LEVEL
