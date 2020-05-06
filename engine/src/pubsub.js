const { PubSub } = require('@google-cloud/pubsub')

const pubsub = new PubSub()

const subscription = pubsub.subscription(
  'projects/containment-game-js/subscriptions/engine'
)
const topic = pubsub.topic(
  'projects/containment-game-js/topics/gke-broker-engine-to-socket'
)

module.exports = {
  subscription,
  topic,
}
