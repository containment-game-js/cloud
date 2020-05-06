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

const addCanceller = (uid, canceller) => {
  const user = users[uid]
  user.canceller = canceller
  return user
}

const removeCanceller = id => {
  const user = users[id]
  clearTimeout(user.canceller)
  delete user.canceller
  return user
}

module.exports = {
  findBy,
  set,
  get,
  addCanceller,
  removeCanceller,
}
