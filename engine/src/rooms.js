const firestore = require('./firestore')

const all = async () => {
  const { docs } = await firestore.rooms.get()
  return docs.map(room => room.data())
}

const length = async () => {
  const rooms = await firestore.rooms.get()
  return rooms.size
}

const toSerializable = async id => {
  const allRooms = await all()
  const publicRooms = allRooms.filter(
    room => room.host === id || !room.privateRoom
  )
  return publicRooms
}

const set = (rid, data) => {
  return firestore.room(rid).set(data)
}

const get = async rid => {
  const result = await firestore.room(rid).get()
  return result.data()
}

const addPlayer = async (rid, player) => {
  await firestore.room(rid).update({ players: firestore.union(player) })
}

const getPlayer = (room, id) => {
  if (room) {
    return room.players.find(player => player.uid === id)
  } else {
    return null
  }
}

const removePlayer = (room, player) => {
  const players = room.players.filter(({ uid }) => uid !== player.uid)
  return firestore.room(room.id).update({ players })
}

const close = room => {
  return firestore.room(room.id).delete()
}

module.exports = {
  set,
  get,
  length,
  all,
  toSerializable,
  addPlayer,
  getPlayer,
  removePlayer,
  close,
}
