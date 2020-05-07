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
  const room = await firestore.room(rid).get()
  const oldPlayers = room.data().players.filter(({ uid }) => uid !== player.uid)
  const players = [...oldPlayers, { ...player, id: player.uid }]
  await firestore.room(rid).update({ players })
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

const getUserAll = async ({ uid, data }) => {
  const { name } = data
  const { docs } = await firestore.rooms
    .where('players', 'array-contains', { name, id: uid, uid })
    .get()
  return docs.map(doc => doc.ref.id)
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
  getUserAll,
}
