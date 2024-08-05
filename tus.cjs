const { Server } = require('@tus/server')
const { FileStore } = require('@tus/file-store')
const jwt = require('jsonwebtoken')
require('dotenv').config();
const host = '0.0.0.0'
const port = 1088

const server = new Server({
  path: '/files',
  datastore: new FileStore({ directory: './uploads' }),
  async onIncomingRequest(req, res) {
    const token = req.headers.authorization

    if (!token) {
      throw { status_code: 401, body: 'Unauthorized' }
    }

    try {
      const decodedToken = jwt.verify(token, process.env.JWTSECRET);
      req.user = decodedToken.id;
    } catch (error) {
      throw { status_code: 401, body: 'Invalid token' }
    }

    // if (req.user.type !== 'admin') {
    //   throw { status_code: 403, body: 'Access denied' }
    // }
  },
})
server.listen({ host, port })