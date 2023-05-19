import { Readable, Transform } from 'node:stream'
import type { SuperTest, Test } from 'supertest'
import supertest from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import type { App } from '../src'
import {
   createApp,
   eventHandler,
   fromNodeMiddleware,
   toNodeListener,
} from '../src'

describe('app', () => {
   let app: App
   let request: SuperTest<Test>

   beforeEach(() => {
      app = createApp({ debug: false })
      request = supertest(toNodeListener(app))
   })

   it('can return JSON directly', async () => {
      app.use(
         '/api',
         eventHandler(event => ({ url: event.node.req.url })),
      )
      const res = await request.get('/api')

      expect(res.body).toEqual({ url: '/' })
   })

   it('can return a 204 response', async () => {
      app.use(
         '/api',
         eventHandler(() => null),
      )
      const res = await request.get('/api')

      expect(res.statusCode).toBe(204)
      expect(res.text).toEqual('')
      expect(res.ok).toBeTruthy()
   })

   it('can return primitive values', async () => {
      const values = [true, false, 42, 0, 1]
      for (const value of values) {
         app.use(
        `/${value}`,
        eventHandler(() => value),
         )
         expect(await request.get(`/${value}`).then(r => r.body)).toEqual(value)
      }
   })

   it('can return Buffer directly', async () => {
      app.use(eventHandler(() => Buffer.from('<h1>Hello world!</h1>', 'utf8')))
      const res = await request.get('/')

      expect(res.text).toBe('<h1>Hello world!</h1>')
   })

   it.todo('can return Readable stream directly', async () => {
      app.use(
         eventHandler(() => {
            const readable = new Readable()
            readable.push(Buffer.from('<h1>Hello world!</h1>', 'utf8'))
            return readable
         }),
      )
      const res = await request.get('/')

      expect(res.text).toBe('<h1>Hello world!</h1>')
      expect(res.header['transfer-encoding']).toBe('chunked')
   })

   it.todo('can return Readable stream that may throw', async () => {
      app.use(
         eventHandler(() => {
            const readable = new Readable()
            const willThrow = new Transform({
               transform(_chunk, _encoding, callback) {
                  setTimeout(() => callback(new Error('test')), 0)
               },
            })
            readable.push(Buffer.from('<h1>Hello world!</h1>', 'utf8'))

            return readable.pipe(willThrow)
         }),
      )
      const res = await request.get('/')

      expect(res.status).toBe(500)
   })

   it('can return HTML directly', async () => {
      app.use(eventHandler(() => '<h1>Hello world!</h1>'))
      const res = await request.get('/')

      expect(res.text).toBe('<h1>Hello world!</h1>')
      expect(res.header['content-type']).toBe('text/html')
   })

   it('allows overriding Content-Type', async () => {
      app.use(
         eventHandler((event) => {
            event.node.res.setHeader('content-type', 'text/xhtml')
            return '<h1>Hello world!</h1>'
         }),
      )
      const res = await request.get('/')

      expect(res.header['content-type']).toBe('text/xhtml')
   })

   it('can match simple prefixes', async () => {
      app.use(
         '/1',
         eventHandler(() => 'prefix1'),
      )
      app.use(
         '/2',
         eventHandler(() => 'prefix2'),
      )
      const res = await request.get('/2')

      expect(res.text).toBe('prefix2')
   })

   it('can chain .use calls', async () => {
      app
         .use(
            '/1',
            eventHandler(() => 'prefix1'),
         )
         .use(
            '/2',
            eventHandler(() => 'prefix2'),
         )
      const res = await request.get('/2')

      expect(res.text).toBe('prefix2')
   })

   it('can use async routes', async () => {
      app.use(
         '/promise',
         eventHandler(async () => {
            return await Promise.resolve('42')
         }),
      )
      app.use(eventHandler(async () => {}))

      const res = await request.get('/promise')
      expect(res.text).toBe('42')
   })

   it('can use route arrays', async () => {
      app.use(
         ['/1', '/2'],
         eventHandler(() => 'valid'),
      )

      const responses = [await request.get('/1'), await request.get('/2')].map(
         r => r.text,
      )
      expect(responses).toEqual(['valid', 'valid'])
   })

   it('can use handler arrays', async () => {
      app.use('/', [
         eventHandler(() => {}),
         eventHandler(() => {}),
         eventHandler(() => {}),
         eventHandler(eventHandler(() => 'valid')),
      ])

      const response = await request.get('/')
      expect(response.text).toEqual('valid')
   })

   it('prohibits use of next() in non-promisified handlers', () => {
      app.use(
         '/',
         eventHandler(() => {}),
      )
   })

   it('handles next() call with no routes matching', async () => {
      app.use(
         '/',
         eventHandler(() => {}),
      )
      app.use(
         '/',
         eventHandler(() => {}),
      )

      const response = await request.get('/')
      expect(response.status).toEqual(404)
   })

   it('can take an object', async () => {
      app.use({ route: '/', handler: eventHandler(() => 'valid') })

      const response = await request.get('/')
      expect(response.text).toEqual('valid')
   })

   it('can short-circuit route matching', async () => {
      app.use(
         eventHandler((event) => {
            event.node.res.end('done')
         }),
      )
      app.use(eventHandler(() => 'valid'))

      const response = await request.get('/')
      expect(response.text).toEqual('done')
   })

   it('can use a custom matcher', async () => {
      app.use(
         '/odd',
         eventHandler(() => 'Is odd!'),
         { match: url => Boolean(Number(url.slice(1)) % 2) },
      )

      const res = await request.get('/odd/41')
      expect(res.text).toBe('Is odd!')

      const notFound = await request.get('/odd/2')
      expect(notFound.status).toBe(404)
   })

   it('can normalise route definitions', async () => {
      app.use(
         '/test/',
         eventHandler(() => 'valid'),
      )

      const res = await request.get('/test')
      expect(res.text).toBe('valid')
   })

   it('wait for middleware (req, res, next)', async () => {
      app.use(
         '/',
         fromNodeMiddleware((_req, res, next) => {
            setTimeout(() => {
               res.setHeader('content-type', 'application/json')
               res.end(JSON.stringify({ works: 1 }))
               next()
            }, 10)
         }),
      )
      const res = await request.get('/')
      expect(res.body).toEqual({ works: 1 })
   })
})
