import type { OutgoingMessage } from 'node:http'
import type { Socket } from 'node:net'
import { createError } from '../error'
import type { LeanEvent } from '../event'
import { MIMES } from './consts'
import { sanitizeStatusCode, sanitizeStatusMessage } from './sanitize'

const defer
  = typeof setImmediate !== 'undefined' ? setImmediate : (fn: () => any) => fn()

export function send(event: LeanEvent, data?: any, type?: string): Promise<void> {
   if (type)
      defaultContentType(event, type)

   return new Promise((resolve) => {
      defer(() => {
         event.node.res.end(data)
         resolve()
      })
   })
}

/**
 * Respond with an empty payload.<br>
 * Note that calling this function will close the connection and no other data can be sent to the client afterwards.
 *
 * @param event http-lean event
 * @param code status code to be send. By default, it is `204 No Content`.
 */
export function sendNoContent(event: LeanEvent, code = 204) {
   event.node.res.statusCode = sanitizeStatusCode(code, 204)
   // 204 responses MUST NOT have a Content-Length header field (https://www.rfc-editor.org/rfc/rfc7230#section-3.3.2)
   if (event.node.res.statusCode === 204)
      event.node.res.removeHeader('content-length')

   event.node.res.end()
}

export function setResponseStatus(
   event: LeanEvent,
   code?: number,
   text?: string,
): void {
   if (code) {
      event.node.res.statusCode = sanitizeStatusCode(
         code,
         event.node.res.statusCode,
      )
   }
   if (text)
      event.node.res.statusMessage = sanitizeStatusMessage(text)
}

export function getResponseStatus(event: LeanEvent): number {
   return event.node.res.statusCode
}

export function getResponseStatusText(event: LeanEvent): string {
   return event.node.res.statusMessage
}

export function defaultContentType(event: LeanEvent, type?: string) {
   if (type && !event.node.res.getHeader('content-type'))
      event.node.res.setHeader('content-type', type)
}

export function sendRedirect(event: LeanEvent, location: string, code = 302) {
   event.node.res.statusCode = sanitizeStatusCode(
      code,
      event.node.res.statusCode,
   )
   event.node.res.setHeader('location', location)
   const encodedLoc = location.replace(/"/g, '%22')
   const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${encodedLoc}"></head></html>`
   return send(event, html, MIMES.html)
}

export function getResponseHeaders(
   event: LeanEvent,
): ReturnType<LeanEvent['res']['getHeaders']> {
   return event.node.res.getHeaders()
}

export function getResponseHeader(
   event: LeanEvent,
   name: string,
): ReturnType<LeanEvent['node']['res']['getHeader']> {
   return event.node.res.getHeader(name)
}

export function setResponseHeaders(
   event: LeanEvent,
   headers: Record<string, Parameters<OutgoingMessage['setHeader']>[1]>,
): void {
   for (const [name, value] of Object.entries(headers))
      event.node.res.setHeader(name, value)
}

export const setHeaders = setResponseHeaders

export function setResponseHeader(
   event: LeanEvent,
   name: string,
   value: Parameters<OutgoingMessage['setHeader']>[1],
): void {
   event.node.res.setHeader(name, value)
}

export const setHeader = setResponseHeader

export function appendResponseHeaders(
   event: LeanEvent,
   headers: Record<string, string>,
): void {
   for (const [name, value] of Object.entries(headers))
      appendResponseHeader(event, name, value)
}

export const appendHeaders = appendResponseHeaders

export function appendResponseHeader(
   event: LeanEvent,
   name: string,
   value: string,
): void {
   let current = event.node.res.getHeader(name)

   if (!current) {
      event.node.res.setHeader(name, value)
      return
   }

   if (!Array.isArray(current))
      current = [current.toString()]

   event.node.res.setHeader(name, [...current, value])
}

export const appendHeader = appendResponseHeader

export function isStream(data: any) {
   return (
      data
    && typeof data === 'object'
    && typeof data.pipe === 'function'
    && typeof data.on === 'function'
   )
}

export function sendStream(event: LeanEvent, data: any): Promise<void> {
   return new Promise((resolve, reject) => {
      data.pipe(event.node.res)
      data.on('end', () => resolve())
      data.on('error', (error: Error) => reject(createError(error)))
   })
}

function noop() {}
export function writeEarlyHints(
   event: LeanEvent,
   hints: string | string[] | Record<string, string | string[]>,
   cb: () => void = noop,
) {
   if (!event.node.res.socket /* && !('writeEarlyHints' in event.node.res) */) {
      cb()
      return
   }

   // Normalize if string or string[] is provided
   if (typeof hints === 'string' || Array.isArray(hints))
      hints = { link: hints }

   if (hints.link)
      hints.link = Array.isArray(hints.link) ? hints.link : hints.link.split(',')

   if ('writeEarlyHints' in event.node.res)
      return event.node.res.writeEarlyHints(hints, cb)

   const headers: [string, string | string[]][] = Object.entries(hints).map(
      e => [e[0].toLowerCase(), e[1]],
   )
   if (headers.length === 0) {
      cb()
      return
   }

   let hint = 'HTTP/1.1 103 Early Hints'
   if (hints.link)
      hint += `\r\nLink: ${(hints.link as string[]).join(', ')}`

   for (const [header, value] of headers) {
      if (header === 'link')
         continue

      hint += `\r\n${header}: ${value}`
   }
   // @ts-expect-error is fine
   if (event.node.res.socket) {
      (event.node.res as { socket: Socket }).socket.write(
      `${hint}\r\n\r\n`,
      'utf8',
      cb,
      )
   }
   else {
      cb()
   }
}
