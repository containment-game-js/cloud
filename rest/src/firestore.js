const Firestore = require('@google-cloud/firestore')

const db = new Firestore()

const rooms = db.collection('rooms')
const room = rid => rooms.doc(rid)

const union = Firestore.FieldValue.arrayUnion

module.exports = {
  db,
  room,
  rooms,
  union,
}
