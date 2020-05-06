const faker = require('faker')
const uuidv4 = require('uuid').v4
const { subscription, topic } = require('./pubsub')
const log = require('./log')
const { eventType } = require('./events')
const helpers = require('./helpers')
const rooms = require('./rooms')

const messageHandler = async message => {
  log('[messageHandler]:', message.id)
  const messageContent = JSON.parse(message.data.toString('utf8'))
  await respond(messageContent)
  message.ack()
}

const sendData = async toSend => {
  const dataBuffer = Buffer.from(JSON.stringify(toSend))
  const messageId = await topic.publish(dataBuffer)
  log('[sendData]:', toSend)
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
    const room = await rooms.get(rid)
    if (room) {
      await rooms.addPlayer(rid, { uid, name })
    }
    await userChanged({ rid })
  }
}

const leaveRoom = async ({ uid, data }) => {
  const { rid } = data
  if (helpers.validateUUID(uid)) {
    const room = await rooms.get(rid)
    const player = rooms.getPlayer(room, uid)
    if (room && player) {
      await rooms.removePlayer(room, player)
      if (room.host === uid) {
        await rooms.close(room)
      }
      await userChanged({ rid })
    }
  }
}

const broadcastAction = async ({ uid, data }) => {
  const { rid, action } = data
  if (helpers.validateUUID(uid)) {
    const room = await rooms.get(rid)
    const player = rooms.getPlayer(room, uid)
    if (room && player) {
      const host = rooms.getPlayer(room, room.host)
      if (host) {
        sendData({ type: 'action', uid: room.host, data: { id: uid, action } })
      }
    }
  }
}

const broadcastState = async ({ uid, data }) => {
  const { to, rid, state } = data
  if (helpers.validateUUID(uid)) {
    const room = await rooms.get(rid)
    const host = rooms.getPlayer(room, uid)
    if (room && host && room.host === uid) {
      // if (state === 'start') {
      //   const sids = Object.keys(io.in(rid).connected)
      //   logInfo.startGame({ rid, sids })
      // }
      // if (state === 'end') {
      //   const sids = Object.keys(io.in(rid).connected)
      //   logInfo.endGame({ rid, sids })
      // }
      if (to) {
        const receiver = rooms.getPlayer(room, to)
        if (receiver) {
          sendData({ type: 'state', uid: to, data: { state } })
        } else {
          console.error('[broadcastState]: receiver not found. to:', to)
        }
      } else {
        const { players } = room
        players.forEach(({ uid }) => {
          sendData({ type: 'state', uid, data: { state } })
        })
      }
    }
  }
}

const kick = async ({ uid, data }) => {
  const { rid, kid } = data
  if (helpers.validateUUID(uid)) {
    const room = await rooms.get(rid)
    if (room.host === uid) {
      const user = rooms.getPlayer(room, kid)
      if (user) {
        await leaveRoom({ uid: kid, data: { rid } })
        await sendData({ type: 'kicked-user', uid, data: { id: kid } })
        await sendData({ type: 'kicked', uid: kid, data: null })
      }
    }
  }
}

const closeRoom = async ({ uid, data }) => {
  const { rid } = data
  if (helpers.validateUUID(uid)) {
    const room = await rooms.get(rid)
    if (room && room.host === uid) {
      room.players.forEach(async ({ uid }) => {
        await leaveRoom({ uid, data: { rid } })
        await sendData({ type: 'kicked', uid, data: null })
      })
      await sendData({ type: 'closed-room', uid, data: null })
    }
  }
}

const disconnectUser = async ({ uid, data }) => {
  // logInfo.socketDisconnect({ sid: socket.id })
  // const fiveMinutes = 300000
  // const canceller = setTimeout(() => {
  //   user.rooms.forEach(rid => {
  //     leaveRoom({ socket, io })({ id: user.id, rid })
  //   })
  // }, fiveMinutes)
  // Users.addCanceller(user.id, canceller)
}

const respond = async ({ type, uid, data }) => {
  log('[respond]:', { type, uid, data })
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
    case eventType.LEAVE_ROOM: {
      await leaveRoom({ uid, data })
      break
    }
    case eventType.ACTION: {
      await broadcastAction({ uid, data })
      break
    }
    case eventType.STATE: {
      await broadcastState({ uid, data })
      break
    }
    case eventType.KICK: {
      await kick({ uid, data })
      break
    }
    case eventType.CLOSE_ROOM: {
      await closeRoom({ uid, data })
      break
    }
    case eventType.DISCONNECT: {
      await disconnectUser({ uid, data })
      break
    }
    default:
      log('unknown type:', type)
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
