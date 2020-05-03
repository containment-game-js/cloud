const app = require('express')()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const {findBy, set, get} = require('./users')
const log = require('./log')
const {topic, subscription, initializeSubscription, closeSubscription} = require('./pubsub')

const MAX_CONNECTIONS = process.env.NODE_ENV === 'development'
  ? undefined
  : process.env.MAX_CONNECTIONS || 100

const updateSocket = socket => event => data => {
  set({socket, id: data.id, name: data.name})
  send(event)(data)
}

const send = event => data => {
  const toSend = {
    type: event,
    uid: data.id,
    data
  }
  sendData(toSend)
}

const sendData = async toSend => {
  log(toSend)
  const dataBuffer = Buffer.from(JSON.stringify(toSend));
  const messageId = await topic.publish(dataBuffer);
  log('send', messageId)
}

io.on('connection', socket => {
  log(socket.id)
  socket.on('create-room', updateSocket(socket)('create-room'))
  socket.on('enter-room', updateSocket(socket)('enter-room'))
  socket.on('close-room', send('close-room'))
  socket.on('leave-room', send('leave-room'))
  socket.on('disconnect', send('disconnect'))
  socket.on('action', send('action'))
  socket.on('state', send('state'))
  socket.on('kick', send('kick'))
})

const messageHandler = message => {
  const messageContent = JSON.parse(message.data.toString('utf8'))
  log(messageContent)
  const user = get(messageContent.uid)
  if (user && user.socket.connected) {
    user.socket.emit(messageContent.type, messageContent.data)
    log('to client', messageContent.type, messageContent.data)
    message.ack();
  } else {
    log('NACK!', messageContent.uid)
    message.nack();
  }
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
  log('closed');
  process.exit();
});
