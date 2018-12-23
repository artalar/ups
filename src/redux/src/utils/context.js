const _UPS_CONTEXT_DISPATCH = '@@UPS/redux/UPS_CONTEXT_DISPATCH'

export const UPS_CONTEXT_DISPATCH =
  typeof Symbol === 'function'
    ? Symbol(_UPS_CONTEXT_DISPATCH)
    : _UPS_CONTEXT_DISPATCH
