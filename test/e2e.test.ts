import { Server } from 'node:http'
import type { SuperTest, Test } from 'supertest'
import supertest from 'supertest'
import getPort from 'get-port'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { App } from '../src'
import { createApp, eventHandler, toNodeListener } from '../src';

(global.console.error as any) = vi.fn()

describe('server', () => {
   let app: App
   let request: SuperTest<Test>
   let server: Server

   beforeEach(async () => {
      app = createApp({ debug: false })
      server = new Server(toNodeListener(app))
      const port = await getPort()
      server.listen(port)
      request = supertest(`http://localhost:${port}`)
   })

   afterEach(() => {
      server.close()
   })

   it('can serve requests', async () => {
      app.use(eventHandler(() => 'sample'))
      const result = await request.get('/')
      expect(result.text).toBe('sample')
   })

   it('can return 404s', async () => {
      const result = await request.get('/')
      expect(result.status).toBe(404)
   })

   it('can return 500s', async () => {
      app.use(
         eventHandler(() => {
            throw new Error('Unknown')
         }),
      )
      const result = await request.get('/')
      expect(result.status).toBe(500)
   })
})
