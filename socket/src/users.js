const users = {}

const findBy = ({ socket }) => {
  const result = Object.entries(users).find(([_id, user_]) => {
    return user_.socket.id === socket.id
  })
  if (result) {
    const [id, user] = result
    return { ...user, id }
  }
}

const set = ({ socket, id, name }) => {
  users[id] = { name, socket }
  return name
}

const get = id => users[id]

module.exports = {
  findBy,
  set,
  get
}
