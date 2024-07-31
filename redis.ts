import Redis from 'redis';

const redisClient = Redis.createClient();

redisClient.on('error', (err) => {
  console.log('Redis Client Error', err);
});

await redisClient.connect();

export default redisClient;