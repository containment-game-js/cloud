const app = require('express')()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { findBy, set, get } = require('./users')
const log = require('./log')
const { eventType } = require('./events')
const {
  topic,
  subscription,
  initializeSubscription,
  closeSubscription,
} = require('./pubsub')

const MAX_CONNECTIONS =
  process.env.NODE_ENV === 'development'
    ? undefined
    : process.env.MAX_CONNECTIONS || 100

const updateSocket = socket => event => data => {
  set({ socket, id: data.id, name: data.name })
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
  log(toSend)
  const dataBuffer = Buffer.from(JSON.stringify(toSend))
  const messageId = await topic.publish(dataBuffer)
  log('send', messageId)
}

io.on('connection', socket => {
  log(socket.id)
  socket.on(eventType.CREATE_ROOM, updateSocket(socket)(eventType.CREATE_ROOM))
  socket.on(eventType.ENTER_ROOM, updateSocket(socket)(eventType.ENTER_ROOM))
  socket.on(eventType.CLOSE_ROOM, send(eventType.CLOSE_ROOM))
  socket.on(eventType.LEAVE_ROOM, send(eventType.LEAVE_ROOM))
  socket.on(eventType.DISCONNECT, send(eventType.DISCONNECT))
  socket.on(eventType.ACTION, send(eventType.ACTION))
  socket.on(eventType.STATE, send(eventType.STATE))
  socket.on(eventType.KICK, send(eventType.KICK))
})

const messageHandler = message => {
  const messageContent = JSON.parse(message.data.toString('utf8'))
  log(messageContent)
  const user = get(messageContent.uid)
  if (user && user.socket.connected) {
    user.socket.emit(messageContent.type, messageContent.data)
    log('to client', messageContent.type, messageContent.data)
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
