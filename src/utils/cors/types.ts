import type { HTTPMethod } from '../../types'

export interface LeanCorsOptions {
   origin?: '*' | 'null' | (string | RegExp)[] | ((origin: string) => boolean)
   methods?: '*' | HTTPMethod[]
   allowHeaders?: '*' | string[]
   exposeHeaders?: '*' | string[]
   credentials?: boolean
   maxAge?: string | false
   preflight?: {
      statusCode?: number
   }
}

// TODO: Define `ResolvedCorsOptions` as "deep required nonnullable" type of `CorsOptions`
export interface LeanResolvedCorsOptions {
   origin: '*' | 'null' | (string | RegExp)[] | ((origin: string) => boolean)
   methods: '*' | HTTPMethod[]
   allowHeaders: '*' | string[]
   exposeHeaders: '*' | string[]
   credentials: boolean
   maxAge: string | false
   preflight: {
      statusCode: number
   }
}

export type LeanEmptyHeader = Record<string, never>

export type LeanAccessControlAllowOriginHeader =
  | {
     'access-control-allow-origin': '*'
  }
  | {
     'access-control-allow-origin': 'null' | string
     vary: 'origin'
  }
  | LeanEmptyHeader

export type LeanAccessControlAllowMethodsHeader =
  | {
     'access-control-allow-methods': '*' | string
  }
  | LeanEmptyHeader

export type LeanAccessControlAllowCredentialsHeader =
  | {
     'access-control-allow-credentials': 'true'
  }
  | LeanEmptyHeader

export type LeanAccessControlAllowHeadersHeader =
  | {
     'access-control-allow-headers': '*' | string
     vary: 'access-control-request-headers'
  }
  | LeanEmptyHeader

export type LeanAccessControlExposeHeadersHeader =
  | {
     'access-control-expose-headers': '*' | string
  }
  | LeanEmptyHeader

export type LeanAccessControlMaxAgeHeader =
  | {
     'access-control-max-age': string
  }
  | LeanEmptyHeader

export type LeanCorsHeaders =
  | LeanAccessControlAllowOriginHeader
  | LeanAccessControlAllowMethodsHeader
  | LeanAccessControlAllowCredentialsHeader
  | LeanAccessControlAllowHeadersHeader
  | LeanAccessControlExposeHeadersHeader
  | LeanAccessControlMaxAgeHeader
