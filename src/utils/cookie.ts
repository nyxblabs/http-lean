import { parse, serialize } from 'esnext-cookie'
import type { CookieSerializeOptions } from 'esnext-cookie'
import type { LeanEvent } from '../event'

/**
 * Parse the request to get HTTP Cookie header string and returning an object of all cookie name-value pairs.
 * @param event {LEANEvent} http-lean event or req passed by http-lean handler
 * @returns Object of cookie name-value pairs
 * ```ts
 * const cookies = parseCookies(event)
 * ```
 */
export function parseCookies(event: LeanEvent): Record<string, string> {
   return parse(event.node.req.headers.cookie || '')
}

/**
 * Get a cookie value by name.
 * @param event {LEANEvent} http-lean event or req passed by http-lean handler
 * @param name Name of the cookie to get
 * @returns {*} Value of the cookie (String or undefined)
 * ```ts
 * const authorization = getCookie(request, 'Authorization')
 * ```
 */
export function getCookie(event: LeanEvent, name: string): string | undefined {
   return parseCookies(event)[name]
}

/**
 * Set a cookie value by name.
 * @param event {LEANEvent} http-lean event or res passed by http-lean handler
 * @param name Name of the cookie to set
 * @param value Value of the cookie to set
 * @param serializeOptions {CookieSerializeOptions} Options for serializing the cookie
 * ```ts
 * setCookie(res, 'Authorization', '1234567')
 * ```
 */
export function setCookie(
   event: LeanEvent,
   name: string,
   value: string,
   serializeOptions?: CookieSerializeOptions,
) {
   const cookieStr = serialize(name, value, {
      path: '/',
      ...serializeOptions,
   })
   let setCookies = event.node.res.getHeader('set-cookie')
   if (!Array.isArray(setCookies))
      setCookies = [setCookies as any]

   setCookies = setCookies.filter((cookieValue: string) => {
      return cookieValue && !cookieValue.startsWith(`${name}=`)
   })
   event.node.res.setHeader('set-cookie', [...setCookies, cookieStr])
}

/**
 * Set a cookie value by name.
 * @param event {LEANEvent} http-lean event or res passed by http-lean handler
 * @param name Name of the cookie to delete
 * @param serializeOptions {CookieSerializeOptions} Cookie options
 * ```ts
 * deleteCookie(res, 'SessionId')
 * ```
 */
export function deleteCookie(
   event: LeanEvent,
   name: string,
   serializeOptions?: CookieSerializeOptions,
) {
   setCookie(event, name, '', {
      ...serializeOptions,
      maxAge: 0,
   })
}

/**
 * Set-Cookie header field-values are sometimes comma joined in one string. This splits them without choking on commas
 * that are within a single set-cookie field-value, such as in the Expires portion.
 * This is uncommon, but explicitly allowed - see https://tools.ietf.org/html/rfc2616#section-4.2
 * Node.js does this for every header *except* set-cookie - see https://github.com/nodejs/node/blob/d5e363b77ebaf1caf67cd7528224b651c86815c1/lib/_http_incoming.js#L128
 * Based on: https://github.com/google/j2objc/commit/16820fdbc8f76ca0c33472810ce0cb03d20efe25
 * Credits to: https://github.com/tomball for original and https://github.com/chrusart for JavaScript implementation
 * @source https://github.com/nfriedly/set-cookie-parser/blob/3eab8b7d5d12c8ed87832532861c1a35520cf5b3/lib/set-cookie.js#L144
 */
export function splitCookiesString(cookiesString: string): string[] {
   if (typeof cookiesString !== 'string')
      return []

   const cookiesStrings: string[] = []
   let pos = 0
   let start
   let ch
   let lastComma: number
   let nextStart
   let cookiesSeparatorFound

   function skipWhitespace() {
      while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos)))
         pos += 1

      return pos < cookiesString.length
   }

   function notSpecialChar() {
      ch = cookiesString.charAt(pos)

      return ch !== '=' && ch !== ';' && ch !== ','
   }

   while (pos < cookiesString.length) {
      start = pos
      cookiesSeparatorFound = false

      while (skipWhitespace()) {
         ch = cookiesString.charAt(pos)
         if (ch === ',') {
            // ',' is a cookie separator if we have later first '=', not ';' or ','
            lastComma = pos
            pos += 1

            skipWhitespace()
            nextStart = pos

            while (pos < cookiesString.length && notSpecialChar())
               pos += 1

            // currently special character
            if (pos < cookiesString.length && cookiesString.charAt(pos) === '=') {
               // we found cookies separator
               cookiesSeparatorFound = true
               // pos is inside the next cookie, so back up and return it.
               pos = nextStart
               cookiesStrings.push(cookiesString.slice(start, lastComma))
               start = pos
            }
            else {
               // in param ',' or param separator ';',
               // we continue from that comma
               pos = lastComma + 1
            }
         }
         else {
            pos += 1
         }
      }

      if (!cookiesSeparatorFound || pos >= cookiesString.length)
         cookiesStrings.push(cookiesString.slice(start, cookiesString.length))
   }

   return cookiesStrings
}
