const app = require('express')()
const cors = require('cors')
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { findBy, set, get, addCanceller, removeCanceller } = require('./users')
const log = require('./log')
const { eventType } = require('./events')
const {
  topic,
  // subscription,
  initializeSubscription,
  closeSubscription,
} = require('./pubsub')

app.use(cors())

const MAX_CONNECTIONS =
  process.env.NODE_ENV === 'development'
    ? undefined
    : process.env.MAX_CONNECTIONS || 100

const updateSocket = (socket, event) => data => {
  set({ socket, id: data.id, name: data.name })
  removeCanceller(data.id)
  send(event)(data)
}

const send = event => data => {
  const toSend = {
    type: event,
    uid: data.id,
    data,
  }
  sendData(toSend)
}

const sendData = async toSend => {
  log('[sendData]:', toSend)
  const dataBuffer = Buffer.from(JSON.stringify(toSend))
  const messageId = await topic.publish(dataBuffer)
  log('[sendData]-messageId:', messageId)
}

const disconnectUser = ({ socket }) => () => {
  // logInfo.socketDisconnect({ sid: socket.id })
  const user = findBy({ socket })
  if (user) {
    const fiveMinutes = 300000
    const canceller = setTimeout(() => {
      const { name, id } = user
      send(eventType.DISCONNECT)({ name, id })
    }, fiveMinutes)
    addCanceller(user.id, canceller)
  }
}

io.on('connection', socket => {
  log('[connection]:', socket.id)
  socket.on(eventType.CREATE_ROOM, updateSocket(socket, eventType.CREATE_ROOM))
  socket.on(eventType.ENTER_ROOM, updateSocket(socket, eventType.ENTER_ROOM))
  socket.on(eventType.CLOSE_ROOM, send(eventType.CLOSE_ROOM))
  socket.on(eventType.LEAVE_ROOM, send(eventType.LEAVE_ROOM))
  socket.on(eventType.DISCONNECT, disconnectUser({ socket }))
  socket.on(eventType.ACTION, send(eventType.ACTION))
  socket.on(eventType.STATE, send(eventType.STATE))
  socket.on(eventType.KICK, send(eventType.KICK))
})

const messageHandler = message => {
  const messageContent = JSON.parse(message.data.toString('utf8'))
  log('[messageHandler]:', messageContent)
  const user = get(messageContent.uid)
  if (user && user.socket.connected) {
    user.socket.emit(messageContent.type, messageContent.data)
    log('[messageHandler]-sending:', messageContent.type, messageContent.data)
  }
  message.ack()
}

initializeSubscription(messageHandler)

const port = process.env.PORT || 3030

server.maxConnections = MAX_CONNECTIONS
server.listen(port, () => {
  log(`Listening on ${port}`)
})

process.on('SIGINT', async () => {
  log('closing...')
  await closeSubscription()
  server.close()
  log('closed')
  process.exit()
})
