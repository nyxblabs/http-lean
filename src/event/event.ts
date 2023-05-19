import type { LeanEventContext } from '../types'
import type { NodeIncomingMessage, NodeServerResponse } from '../node'
import {
   MIMES,
   getRequestPath,
   sanitizeStatusCode,
   sanitizeStatusMessage,
} from '../utils'
import { LEANResponse } from './response'

export interface NodeEventContext {
   req: NodeIncomingMessage
   res: NodeServerResponse
}

export class LeanEvent implements Pick<FetchEvent, 'respondWith'> {
   '__is_event__' = true
   node: NodeEventContext
   context: LeanEventContext = {}

   constructor(req: NodeIncomingMessage, res: NodeServerResponse) {
      this.node = { req, res }
   }

   get path() {
      return getRequestPath(this)
   }

   /** @deprecated Please use `event.node.req` instead. **/
   get req() {
      return this.node.req
   }

   /** @deprecated Please use `event.node.res` instead. **/
   get res() {
      return this.node.res
   }

   // Implementation of FetchEvent
   respondWith(r: LEANResponse | PromiseLike<LEANResponse>): void {
      Promise.resolve(r).then((_response) => {
         if (this.res.writableEnded)
            return

         const response
            = _response instanceof LEANResponse ? _response : new LEANResponse(_response)

         for (const [key, value] of response.headers.entries())
            this.res.setHeader(key, value)

         if (response.status) {
            this.res.statusCode = sanitizeStatusCode(
               response.status,
               this.res.statusCode,
            )
         }
         if (response.statusText)
            this.res.statusMessage = sanitizeStatusMessage(response.statusText)

         if (response.redirected)
            this.res.setHeader('location', response.url)

         if (!response._body)
            return this.res.end()

         if (
            typeof response._body === 'string'
        || 'buffer' in response._body
        || 'byteLength' in response._body
         )
            return this.res.end(response._body)

         if (!response.headers.has('content-type'))
            response.headers.set('content-type', MIMES.json)

         this.res.end(JSON.stringify(response._body))
      })
   }
}

export function isEvent(input: any): input is LeanEvent {
   return '__is_event__' in input
}

export function createEvent(
   req: NodeIncomingMessage,
   res: NodeServerResponse,
): LeanEvent {
   return new LeanEvent(req, res)
}
