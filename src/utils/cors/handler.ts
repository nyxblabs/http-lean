import type { LeanEvent } from '../../event'
import { sendNoContent } from '../response'
import {
   appendCorsHeaders,
   appendCorsPreflightHeaders,
   isPreflightRequest,
   resolveCorsOptions,
} from './utils'
import type { LeanCorsOptions } from './types'

export function handleCors(event: LeanEvent, options: LeanCorsOptions): boolean {
   const _options = resolveCorsOptions(options)
   if (isPreflightRequest(event)) {
      appendCorsPreflightHeaders(event, options)
      sendNoContent(event, _options.preflight.statusCode)
      return true
   }
   appendCorsHeaders(event, options)
   return false
}
