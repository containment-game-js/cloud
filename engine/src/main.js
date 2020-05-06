const faker = require('faker')
const uuidv4 = require('uuid').v4
const { subscription, topic } = require('./pubsub')
const log = require('./log')
const { eventType } = require('./events')
const helpers = require('./helpers')
const rooms = require('./rooms')

const messageHandler = async message => {
  log(message.id)
  const messageContent = JSON.parse(message.data.toString('utf8'))
  await respond(messageContent)
  message.ack()
}

const sendData = async toSend => {
  const dataBuffer = Buffer.from(JSON.stringify(toSend))
  const messageId = await topic.publish(dataBuffer)
  log('send', toSend)
}

const userChanged = async ({ rid }) => {
  const room = await rooms.get(rid)
  if (room) {
    const { players } = room
    players.forEach(({ uid }) => {
      sendData({ type: 'users', uid, data: players })
    })
  }
}

const createRoom = async ({ uid, data }) => {
  if (helpers.validateUUID(uid)) {
    const rid = uuidv4()
    const roomName = faker.hacker.noun()
    const players = [{ uid, name: data.name }]
    rooms.set(rid, {
      id: rid,
      host: uid,
      name: roomName,
      privateRoom: data.privateRoom,
      players,
    })
    await userChanged({ rid })
    return rid
  }
}

const enterRoom = async ({ uid, data }) => {
  const { rid, name } = data
  if (helpers.validateUUID(uid)) {
    const room = rooms.get(rid)
    if (room) {
      await rooms.addPlayer(rid, { uid, name })
    }
    await userChanged({ rid })
  }
}

const respond = async ({ type, uid, data }) => {
  log({ type, uid, data })
  switch (type) {
    case eventType.CREATE_ROOM: {
      const rid = await createRoom({ uid, data })
      await sendData({ type: 'created-room', uid, data: rid })
      break
    }
    case eventType.ENTER_ROOM: {
      await enterRoom({ uid, data })
      break
    }
    default:
      log('unkown type:', type)
      break
  }
}

subscription.on('message', messageHandler)

process.on('SIGINT', function() {
  console.log('closing...')
  subscription.removeListener('message', messageHandler)
  console.log('closed')
  process.exit()
})
