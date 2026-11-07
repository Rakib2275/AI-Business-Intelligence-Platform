import { createClient } from 'redis';
import config from '../config/index.js';

export const redisClient = createClient({
    username: config.redis_user,
    password: config.redis_password,
    disableOfflineQueue: true,
    socket: {
        host: config.redis_host,
        port: Number(config.redis_port)
    }
});

let hasLoggedConnectionError = false;

redisClient.on("error", (error) => {
    if (!hasLoggedConnectionError) {
        console.error("Redis client error:", error.message);
        hasLoggedConnectionError = true;
    }
});

redisClient.on("ready", () => {
    hasLoggedConnectionError = false;
});