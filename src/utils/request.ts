import { getQuery as _getQuery } from 'url-ops'
import { createError } from '../error'
import type { HTTPMethod, RequestHeaders } from '../types'
import type { LeanEvent } from '../event'

export function getQuery(event: LeanEvent) {
   return _getQuery(event.node.req.url || '')
}

export function getRouterParams(event: LeanEvent): LeanEvent['context'] {
   // Fallback object needs to be returned in case router is not used (#149)
   return event.context.params || {}
}

export function getRouterParam(
   event: LeanEvent,
   name: string,
): LeanEvent['context'][string] {
   const params = getRouterParams(event)

   return params[name]
}

export function getMethod(
   event: LeanEvent,
   defaultMethod: HTTPMethod = 'GET',
): HTTPMethod {
   return (event.node.req.method || defaultMethod).toUpperCase() as HTTPMethod
}

export function isMethod(
   event: LeanEvent,
   expected: HTTPMethod | HTTPMethod[],
   allowHead?: boolean,
) {
   const method = getMethod(event)

   if (allowHead && method === 'HEAD')
      return true

   if (typeof expected === 'string') {
      if (method === expected)
         return true
   }
   else if (expected.includes(method)) {
      return true
   }

   return false
}

export function assertMethod(
   event: LeanEvent,
   expected: HTTPMethod | HTTPMethod[],
   allowHead?: boolean,
) {
   if (!isMethod(event, expected, allowHead)) {
      throw createError({
         statusCode: 405,
         statusMessage: 'HTTP method is not allowed.',
      })
   }
}

export function getRequestHeaders(event: LeanEvent): RequestHeaders {
   const _headers: RequestHeaders = {}
   for (const key in event.node.req.headers) {
      const val = event.node.req.headers[key]
      _headers[key] = Array.isArray(val) ? val.filter(Boolean).join(', ') : val
   }
   return _headers
}

export const getHeaders = getRequestHeaders

export function getRequestHeader(
   event: LeanEvent,
   name: string,
): RequestHeaders[string] {
   const headers = getRequestHeaders(event)
   const value = headers[name.toLowerCase()]
   return value
}

export const getHeader = getRequestHeader

export function getRequestHost(
   event: LeanEvent,
   opts: { xForwardedHost?: boolean } = {},
) {
   if (opts.xForwardedHost) {
      const xForwardedHost = event.node.req.headers['x-forwarded-host'] as string
      if (xForwardedHost)
         return xForwardedHost
   }
   return event.node.req.headers.host || 'localhost'
}

export function getRequestProtocol(
   event: LeanEvent,
   opts: { xForwardedProto?: boolean } = {},
) {
   if (
      opts.xForwardedProto !== false
    && event.node.req.headers['x-forwarded-proto'] === 'https'
   )
      return 'https'

   return (event.node.req.connection as any).encrypted ? 'https' : 'http'
}

const DOUBLE_SLASH_RE = /[/\\]{2,}/g

export function getRequestPath(event: LeanEvent): string {
   const path = (event.node.req.url || '/').replace(DOUBLE_SLASH_RE, '/')
   return path
}

export function getRequestURL(
   event: LeanEvent,
   opts: { xForwardedHost?: boolean; xForwardedProto?: boolean } = {},
) {
   const host = getRequestHost(event, opts)
   const protocol = getRequestProtocol(event)
   const path = getRequestPath(event)
   return new URL(path, `${protocol}://${host}`)
}
