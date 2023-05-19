export { handleCors } from './handler'
export {
   isPreflightRequest,
   isCorsOriginAllowed,
   appendCorsHeaders,
   appendCorsPreflightHeaders,
} from './utils'

export type { LeanCorsOptions } from './types'
