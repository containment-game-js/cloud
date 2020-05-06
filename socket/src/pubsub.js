const { PubSub } = require('@google-cloud/pubsub')
const uuidv4 = require('uuid').v4
const log = require('./log')

const pubsub = new PubSub()
const topic = pubsub.topic(
  'projects/containment-game-js/topics/gke-broker-socket-to-engine'
)
const topicToSub = pubsub.topic(
  'projects/containment-game-js/topics/gke-broker-engine-to-socket'
)
let subscription

const initializeSubscription = async messageHandler => {
  if (process.env.NODE_ENV !== 'development') {
    const subName = 'socket' + uuidv4()
    const [sub, res] = await topicToSub.createSubscription(subName)
    log(subName, 'created')
    subscription = sub
    subscription.on('message', messageHandler)
  } else {
    subscription = pubsub.subscription(
      'projects/containment-game-js/subscriptions/socket'
    )
  }
}

const closeSubscription = async () => {
  if (process.env.NODE_ENV !== 'development') {
    const name = subscription.name
    await subscription.delete()
    console.log(`subscription ${name} deleted`)
  }
}

module.exports = {
  topic,
  subscription,
  initializeSubscription,
  closeSubscription,
}
