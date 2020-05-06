const app = require('express')()
const cors = require('cors')
const Rooms = require('./rooms')

app.use(cors())

app.get('/', async (req, res) => {
  const numberOfRooms = await Rooms.length()
  const rooms = await Rooms.toSerializable()
  res.send({ numberOfRooms, rooms })
})

app.get('/get-rooms', async (req, res) => {
  const { id } = req.query
  const rooms = await Rooms.toSerializable(id)
  res.send(rooms)
})

app.get('/get-room-info/:rid', async (req, res) => {
  const room = await Rooms.get(req.params.rid)
  if (room) {
    res.send(room)
  } else {
    res.status(404)
    res.end()
  }
})

app.listen(process.env.PORT)
