'use strict'

const { createServer } = require('node:http')
const { createApp } = require('..')

const app = createApp()

app.use('/', () => ({ hello: 'world' }))

createServer(app).listen(process.env.PORT || 3000)
