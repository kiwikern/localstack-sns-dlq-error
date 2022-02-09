# Localstack minimal reproducible example

## Description

When an SQS queue subscribes to an SNS topic and sets another SQS queue as dead letter queue (redrive policy),
the dead letter queue will receive messages that fail to be delivered (e.g. when the target queue is not available).

This does work with Localstack with the first message that cannot be delivered. Subsequent messages are not delivered
to the dead letter queue.

## How to run
0. Have node.js installed
1. Clone the repository and `cd` into it
2. Run `npm install`
3. Run `npm run start:localstack`
4. Run `npm start`

## Steps to reproduce
Also see [index.ts](https://github.com/kiwikern/localstack-sns-dlq-error/blob/main/index.ts)

1. Create an SNS topic
2. Create an SQS queue as target for the topic
3. Create another SQS queue as dead letter queue for the topic subscription
4. Subscribe target queue to topic and set dead letter queue with redrive policy
5. Publish message to topic -> Lands in target queue ✅ (Works multiple times)
6. Delete target queue
7. Publish second message to topic -> Lands in dead letter queue ✅
8. Publish third message to topic -> Dead letter queue is empty ❌
