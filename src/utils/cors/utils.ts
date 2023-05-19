import nyxdefaults from 'nyxdefaults'
import { appendHeaders } from '../response'
import type { getRequestHeaders } from '../request'
import { getMethod, getRequestHeader } from '../request'
import type { LeanEvent } from '../../event'
import type {
   LeanAccessControlAllowCredentialsHeader,
   LeanAccessControlAllowHeadersHeader,
   LeanAccessControlAllowMethodsHeader,
   LeanAccessControlAllowOriginHeader,
   LeanAccessControlExposeHeadersHeader,
   LeanAccessControlMaxAgeHeader,
   LeanCorsOptions,
   LeanResolvedCorsOptions,
} from './types'

export function resolveCorsOptions(
   options: LeanCorsOptions = {},
): LeanResolvedCorsOptions {
   const defaultOptions: LeanResolvedCorsOptions = {
      origin: '*',
      methods: '*',
      allowHeaders: '*',
      exposeHeaders: '*',
      credentials: false,
      maxAge: false,
      preflight: {
         statusCode: 204,
      },
   }

   return nyxdefaults(options, defaultOptions)
}

export function isPreflightRequest(event: LeanEvent): boolean {
   const method = getMethod(event)
   const origin = getRequestHeader(event, 'origin')
   const accessControlRequestMethod = getRequestHeader(
      event,
      'access-control-request-method',
   )

   return method === 'OPTIONS' && !!origin && !!accessControlRequestMethod
}

export function isCorsOriginAllowed(
   origin: ReturnType<typeof getRequestHeaders>['origin'],
   options: LeanCorsOptions,
): boolean {
   const { origin: originOption } = options

   if (
      !origin
    || !originOption
    || originOption === '*'
    || originOption === 'null'
   )
      return true

   if (Array.isArray(originOption)) {
      return originOption.some((_origin) => {
         if (_origin instanceof RegExp)
            return _origin.test(origin)

         return origin === _origin
      })
   }

   return originOption(origin)
}

export function createOriginHeaders(
   event: LeanEvent,
   options: LeanCorsOptions,
): LeanAccessControlAllowOriginHeader {
   const { origin: originOption } = options
   const origin = getRequestHeader(event, 'origin')

   if (!origin || !originOption || originOption === '*')
      return { 'access-control-allow-origin': '*' }

   if (typeof originOption === 'string')
      return { 'access-control-allow-origin': originOption, 'vary': 'origin' }

   return isCorsOriginAllowed(origin, options)
      ? { 'access-control-allow-origin': origin, 'vary': 'origin' }
      : {}
}

export function createMethodsHeaders(
   options: LeanCorsOptions,
): LeanAccessControlAllowMethodsHeader {
   const { methods } = options

   if (!methods)
      return {}

   if (methods === '*')
      return { 'access-control-allow-methods': '*' }

   return methods.length > 0
      ? { 'access-control-allow-methods': methods.join(',') }
      : {}
}

export function createCredentialsHeaders(
   options: LeanCorsOptions,
): LeanAccessControlAllowCredentialsHeader {
   const { credentials } = options

   if (credentials)
      return { 'access-control-allow-credentials': 'true' }

   return {}
}

export function createAllowHeaderHeaders(
   event: LeanEvent,
   options: LeanCorsOptions,
): LeanAccessControlAllowHeadersHeader {
   const { allowHeaders } = options

   if (!allowHeaders || allowHeaders === '*' || allowHeaders.length === 0) {
      const header = getRequestHeader(event, 'access-control-request-headers')

      return header
         ? {
               'access-control-allow-headers': header,
               'vary': 'access-control-request-headers',
            }
         : {}
   }

   return {
      'access-control-allow-headers': allowHeaders.join(','),
      'vary': 'access-control-request-headers',
   }
}

export function createExposeHeaders(
   options: LeanCorsOptions,
): LeanAccessControlExposeHeadersHeader {
   const { exposeHeaders } = options

   if (!exposeHeaders)
      return {}

   if (exposeHeaders === '*')
      return { 'access-control-expose-headers': exposeHeaders }

   return { 'access-control-expose-headers': exposeHeaders.join(',') }
}

export function createMaxAgeHeader(
   options: LeanCorsOptions,
): LeanAccessControlMaxAgeHeader {
   const { maxAge } = options

   if (maxAge)
      return { 'access-control-max-age': maxAge }

   return {}
}

// TODO: Implemente e2e tests to improve code coverage
/* c8 ignore start */
export function appendCorsPreflightHeaders(
   event: LeanEvent,
   options: LeanCorsOptions,
) {
   appendHeaders(event, createOriginHeaders(event, options))
   appendHeaders(event, createCredentialsHeaders(options))
   appendHeaders(event, createExposeHeaders(options))
   appendHeaders(event, createMethodsHeaders(options))
   appendHeaders(event, createAllowHeaderHeaders(event, options))
}
/* c8 ignore end */

// TODO: Implemente e2e tests to improve code coverage
/* c8 ignore start */
export function appendCorsHeaders(event: LeanEvent, options: LeanCorsOptions) {
   appendHeaders(event, createOriginHeaders(event, options))
   appendHeaders(event, createCredentialsHeaders(options))
   appendHeaders(event, createExposeHeaders(options))
}
/* c8 ignore end */
