import { getQuery as _getQuery } from 'url-ops'
import { createError } from '../error'
import type { HTTPMethod, RequestHeaders } from '../types'
import type { LEANEvent } from '../event'

export function getQuery(event: LEANEvent) {
   return _getQuery(event.node.req.url || '')
}

export function getRouterParams(event: LEANEvent): LEANEvent['context'] {
   // Fallback object needs to be returned in case router is not used (#149)
   return event.context.params || {}
}

export function getRouterParam(
   event: LEANEvent,
   name: string,
): LEANEvent['context'][string] {
   const params = getRouterParams(event)

   return params[name]
}

export function getMethod(
   event: LEANEvent,
   defaultMethod: HTTPMethod = 'GET',
): HTTPMethod {
   return (event.node.req.method || defaultMethod).toUpperCase() as HTTPMethod
}

export function isMethod(
   event: LEANEvent,
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
   event: LEANEvent,
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

export function getRequestHeaders(event: LEANEvent): RequestHeaders {
   const _headers: RequestHeaders = {}
   for (const key in event.node.req.headers) {
      const val = event.node.req.headers[key]
      _headers[key] = Array.isArray(val) ? val.filter(Boolean).join(', ') : val
   }
   return _headers
}

export const getHeaders = getRequestHeaders

export function getRequestHeader(
   event: LEANEvent,
   name: string,
): RequestHeaders[string] {
   const headers = getRequestHeaders(event)
   const value = headers[name.toLowerCase()]
   return value
}

export const getHeader = getRequestHeader

export function getRequestHost(
   event: LEANEvent,
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
   event: LEANEvent,
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

export function getRequestPath(event: LEANEvent): string {
   const path = (event.node.req.url || '/').replace(DOUBLE_SLASH_RE, '/')
   return path
}

export function getRequestURL(
   event: LEANEvent,
   opts: { xForwardedHost?: boolean; xForwardedProto?: boolean } = {},
) {
   const host = getRequestHost(event, opts)
   const protocol = getRequestProtocol(event)
   const path = getRequestPath(event)
   return new URL(path, `${protocol}://${host}`)
}
