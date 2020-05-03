const {subscription, topic} = require('./pubsub')
const log = require('./log')
const {eventType} = require('./events')
const uuidv4 = require('uuid').v4

const messageHandler = async message => {
  log(message.id)
  const messageContent = JSON.parse(message.data.toString('utf8'))
  respond(messageContent)
  message.ack();
}

const sendData = async toSend => {
  const dataBuffer = Buffer.from(JSON.stringify(toSend));
  const messageId = await topic.publish(dataBuffer);
  log('send', toSend)
}

const respond = ({type, uid, data}) => {
  log({type, uid, data})
  switch (type) {
    case eventType.CREATE_ROOM:
      sendData({type: 'created-room', uid, data: uuidv4()})
      break
    case eventType.ENTER_ROOM:
      break
    default:
      log('unkown type:', type)
      break
  }
}

subscription.on('message', messageHandler)

process.on('SIGINT', function() {
  console.log('closing...');
  subscription.removeListener('message', messageHandler);
  console.log('closed');
  process.exit();
});
