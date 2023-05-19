import nyxjson from 'nyxjson'
import type { Encoding, HTTPMethod } from '../types'
import type { LeanEvent } from '../event'
import { parse as parseMultipartData } from './internal/multipart'
import { assertMethod, getRequestHeader } from './request'

export type { MultiPartData } from './internal/multipart'

const RawBodySymbol = Symbol.for('leanRawBody')
const ParsedBodySymbol = Symbol.for('leanParsedBody')

const PayloadMethods: HTTPMethod[] = ['PATCH', 'POST', 'PUT', 'DELETE']

/**
 * Reads body of the request and returns encoded raw string (default) or `Buffer` if encoding if falsy.
 * @param event {LEANEvent} http-lean event or req passed by http-lean handler
 * @param encoding {Encoding} encoding="utf-8" - The character encoding to use.
 *
 * @return {String|Buffer} Encoded raw string or raw Buffer of the body
 */
export function readRawBody<E extends Encoding = 'utf8'>(
   event: LeanEvent,
   encoding = 'utf8' as E,
): E extends false ? Promise<Buffer | undefined> : Promise<string | undefined> {
   // Ensure using correct HTTP method before attempt to read payload
   assertMethod(event, PayloadMethods)

   // Reuse body if already read
   const _rawBody
    = (event.node.req as any)[RawBodySymbol]
    || (event.node.req as any).body /* unjs/unenv #8 */
   if (_rawBody) {
      const promise = Promise.resolve(_rawBody).then(_resolved =>
         Buffer.isBuffer(_resolved) ? _resolved : Buffer.from(_resolved),
      )
      return encoding
         ? promise.then(buff => buff.toString(encoding))
         : (promise as Promise<any>)
   }

   if (!Number.parseInt(event.node.req.headers['content-length'] || ''))
      return Promise.resolve(undefined)

   const promise = ((event.node.req as any)[RawBodySymbol] = new Promise<Buffer>(
      (resolve, reject) => {
         const bodyData: any[] = []
         event.node.req
            .on('error', (err) => {
               reject(err)
            })
            .on('data', (chunk) => {
               bodyData.push(chunk)
            })
            .on('end', () => {
               resolve(Buffer.concat(bodyData))
            })
      },
   ))

   const result = encoding
      ? promise.then(buff => buff.toString(encoding))
      : promise
   return result as E extends false
      ? Promise<Buffer | undefined>
      : Promise<string | undefined>
}

/**
 * Reads request body and try to safely parse using [destr](https://github.com/unjs/destr)
 * @param event {LEANEvent} http-lean event or req passed by http-lean handler
 * @param encoding {Encoding} encoding="utf-8" - The character encoding to use.
 *
 * @return {*} The `Object`, `Array`, `String`, `Number`, `Boolean`, or `null` value corresponding to the request JSON body
 *
 * ```ts
 * const body = await readBody(req)
 * ```
 */
export async function readBody<T = any>(event: LeanEvent): Promise<T> {
   if (ParsedBodySymbol in event.node.req)
      return (event.node.req as any)[ParsedBodySymbol]

   const body = await readRawBody(event, 'utf8')

   if (
      event.node.req.headers['content-type']
    === 'application/x-www-form-urlencoded'
   ) {
      const form = new URLSearchParams(body)
      const parsedForm: Record<string, any> = Object.create(null)
      for (const [key, value] of form.entries()) {
         if (key in parsedForm) {
            if (!Array.isArray(parsedForm[key]))
               parsedForm[key] = [parsedForm[key]]

            parsedForm[key].push(value)
         }
         else {
            parsedForm[key] = value
         }
      }
      return parsedForm as unknown as T
   }

   const json = nyxjson(body) as T;
   (event.node.req as any)[ParsedBodySymbol] = json
   return json
}

export async function readMultipartFormData(event: LeanEvent) {
   const contentType = getRequestHeader(event, 'content-type')
   if (!contentType || !contentType.startsWith('multipart/form-data'))
      return

   const boundary = contentType.match(/boundary=([^;]*)(;|$)/i)?.[1]
   if (!boundary)
      return

   const body = await readRawBody(event, false)
   if (!body)
      return

   return parseMultipartData(body, boundary)
}
