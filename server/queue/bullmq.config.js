// backend/queue/bullmq.config.js
const { Queue, Worker, QueueEvents } = require('bullmq');
const IORedis = require('ioredis');
const redis = new IORedis(process.env.REDIS_URL);

const queue = new Queue('matrix-prewarm', { connection: redis });
const events = new QueueEvents('matrix-prewarm', { connection: redis });

// Producer example
async function enqueuePrewarm(payload) {
  await queue.add('prewarm', payload, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 500 },
    removeOnComplete: 1000,
    removeOnFail: 500
  });
}

// Worker example
const worker = new Worker('matrix-prewarm', async (job) => {
  const { territory, timeBucket } = job.data;
  // TODO: call your prewarm service with (territory, timeBucket)
  // Example: await prewarmMatrices(territory, timeBucket);
  return { ok: true };
}, { connection: redis, concurrency: 4 });

module.exports = { enqueuePrewarm };