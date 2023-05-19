import type { LeanEvent } from './event'
import {
   MIMES,
   sanitizeStatusCode,
   sanitizeStatusMessage,
   setResponseStatus,
} from './utils'

/**
 * http-lean Runtime Error
 * @class
 * @extends Error
 * @property {Number} statusCode An Integer indicating the HTTP response status code.
 * @property {String} statusMessage A String representing the HTTP status message
 * @property {String} fatal Indicates if the error is a fatal error.
 * @property {String} unhandled Indicates if the error was unhandled and auto captured.
 * @property {Any} data An extra data that will includes in the response.<br>
 *  This can be used to pass additional information about the error.
 * @property {Boolean} internal Setting this property to <code>true</code> will mark error as an internal error
 */
export class LeanError extends Error {
   static __lean_error__ = true
   toJSON() {
      const obj: Pick<
         LeanError,
      'message' | 'statusCode' | 'statusMessage' | 'data'
    > = {
       message: this.message,
       statusCode: sanitizeStatusCode(this.statusCode, 500),
    }

      if (this.statusMessage)
         obj.statusMessage = sanitizeStatusMessage(this.statusMessage)

      if (this.data !== undefined)
         obj.data = this.data

      return obj
   }

   statusCode = 500
   fatal = false
   unhandled = false
   statusMessage?: string = undefined
   data?: any
}

/**
 * Creates new `Error` that can be used to handle both internal and runtime errors.
 *
 * @param input {Partial<LeanError>}
 * @return {LeanError} An instance of the LeanError
 */
export function createError(
   input: string | (Partial<LeanError> & { status?: number; statusText?: string }),
): LeanError {
   if (typeof input === 'string')
      return new LeanError(input)

   if (isError(input))
      return input

   const err = new LeanError(
      input.message ?? input.statusMessage,
      // @ts-expect-error is fine
      input.cause ? { cause: input.cause } : undefined,
   )

   if ('stack' in input) {
      try {
         Object.defineProperty(err, 'stack', {
            get() {
               return input.stack
            },
         })
      }
      catch {
         try {
            err.stack = input.stack
         }
         catch {}
      }
   }

   if (input.data)
      err.data = input.data

   if (input.statusCode)
      err.statusCode = sanitizeStatusCode(input.statusCode, err.statusCode)

   else if (input.status)
      err.statusCode = sanitizeStatusCode(input.status, err.statusCode)

   if (input.statusMessage)
      err.statusMessage = input.statusMessage

   else if (input.statusText)
      err.statusMessage = input.statusText

   if (err.statusMessage) {
      // TODO: Always sanitize status message in the next major releases
      const originalMessage = err.statusMessage
      const sanitizedMessage = sanitizeStatusMessage(err.statusMessage)
      if (sanitizedMessage !== originalMessage) {
         console.warn(
            '[http-lean] Please prefer using `message` for longer error messages instead of `statusMessage`. In the future `statusMessage` will be sanitized by default.',
         )
      }
   }

   if (input.fatal !== undefined)
      err.fatal = input.fatal

   if (input.unhandled !== undefined)
      err.unhandled = input.unhandled

   return err
}

/**
 * Receive an error and return the corresponding response.<br>
 *  http-lean internally uses this function to handle unhandled errors.<br>
 *  Note that calling this function will close the connection and no other data will be sent to client afterwards.
 *
 @param event {LeanEvent} http-lean event or req passed by http-lean handler
 * @param error {LeanError|Error} Raised error
 * @param debug {Boolean} Whether application is in debug mode.<br>
 *  In the debug mode the stack trace of errors will be return in response.
 */
export function sendError(
   event: LeanEvent,
   error: Error | LeanError,
   debug?: boolean,
) {
   if (event.node.res.writableEnded)
      return

   const leanError = isError(error) ? error : createError(error)

   const responseBody = {
      statusCode: leanError.statusCode,
      statusMessage: leanError.statusMessage,
      stack: [] as string[],
      data: leanError.data,
   }

   if (debug)
      responseBody.stack = (leanError.stack || '').split('\n').map(l => l.trim())

   if (event.node.res.writableEnded)
      return

   const _code = Number.parseInt(leanError.statusCode as unknown as string)
   setResponseStatus(event, _code, leanError.statusMessage)
   event.node.res.setHeader('content-type', MIMES.json)
   event.node.res.end(JSON.stringify(responseBody, undefined, 2))
}

export function isError(input: any): input is LeanError {
   return input?.constructor?.__lean_error__ === true
}
