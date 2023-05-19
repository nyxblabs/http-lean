import type { LeanEvent } from './event'
import type { Session } from './utils/session'

// https://www.rfc-editor.org/rfc/rfc7231#section-4.1
export type HTTPMethod =
  | 'GET'
  | 'HEAD'
  | 'PATCH'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'CONNECT'
  | 'OPTIONS'
  | 'TRACE'

export type Encoding =
  | false
  | 'ascii'
  | 'utf8'
  | 'utf-8'
  | 'utf16le'
  | 'ucs2'
  | 'ucs-2'
  | 'base64'
  | 'latin1'
  | 'binary'
  | 'hex'

export interface LeanEventContext extends Record<string, any> {
   /* Matched router parameters */
   params?: Record<string, string>
   /* Cached session data */
   sessions?: Record<string, Session>
}

export type EventHandlerResponse<T = any> = T | Promise<T>

export interface EventHandler<T = any> {
   __is_handler__?: true
   (event: LeanEvent): EventHandlerResponse<T>
}

export type LazyEventHandler = () => EventHandler | Promise<EventHandler>

export interface RequestHeaders { [name: string]: string | undefined }
