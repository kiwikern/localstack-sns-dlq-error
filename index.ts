import {SQS} from '@aws-sdk/client-sqs';
import {SNS} from '@aws-sdk/client-sns'

const awsConfig = {
    credentials: {
        accessKeyId: 'key',
        secretAccessKey: 'secret',
    },
    endpoint: 'http://localhost:4566',
    region: 'eu-central-1'
};
const sqs = new SQS(awsConfig);
const sns = new SNS(awsConfig);

const fetchMessages = async (QueueUrl: string) => {
    const messages = await sqs.receiveMessage({QueueUrl, MaxNumberOfMessages: 10});
    return messages?.Messages;
}

const delay = () => new Promise(resolve => setTimeout(resolve, 500));

const run = async () => {
    // Create an SNS topic, subscribe the target SQS queue to the topic and redrive failed messages to dead letter queue
    const {QueueUrl: targetQueueUrl} = await sqs.createQueue({QueueName: 'sns_target_queue'});
    const {Attributes: {QueueArn: targetQueueArn}} = await sqs.getQueueAttributes({
        QueueUrl: targetQueueUrl,
        AttributeNames: ['QueueArn']
    });
    const {QueueUrl: deadLetterQueueUrl} = await sqs.createQueue({QueueName: 'dead_letter_queue'});
    const {Attributes: {QueueArn: deadLetterQueueArn}} = await sqs.getQueueAttributes({
        QueueUrl: deadLetterQueueUrl,
        AttributeNames: ['QueueArn']
    });
    const {TopicArn} = await sns.createTopic({Name: 'my-topic'});
    await sns.subscribe({
        Protocol: 'sqs',
        TopicArn,
        Attributes: {RedrivePolicy: JSON.stringify({deadLetterTargetArn: deadLetterQueueArn})},
        Endpoint: targetQueueArn
    })
    await delay();

    await sns.publish({TopicArn, Message: 'will be delivered to target'})
    await delay();
    const messages1 = await fetchMessages(targetQueueUrl);
    // Prints the first message
    console.log('target queue message', messages1);

    // Delete target queue. Next messages go to dead letter queue.
    await sqs.deleteQueue({QueueUrl: targetQueueUrl});
    await delay();

    await sns.publish({TopicArn, Message: 'will fail, will be delivered to DLQ'})
    await delay();
    const messages2 = await fetchMessages(deadLetterQueueUrl);
    // Prints the failed message
    console.log('first DLQ message', messages2);
    await delay();

    await sns.publish({TopicArn, Message: 'will fail, will be delivered to DLQ'})
    await delay();
    const messages3 = await fetchMessages(deadLetterQueueUrl);
    // Prints undefined
    console.log('second DLQ message', messages3);

    // Cleanup
    await sns.deleteTopic({TopicArn})
    await sqs.deleteQueue({QueueUrl: deadLetterQueueUrl});
}

run().catch(e => console.error(e))
