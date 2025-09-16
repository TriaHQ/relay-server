import { Mutex } from "async-mutex";
import redisClient from "../../lib/redisClient";

export class RoundRobin {
    addresses: string[];
    index: number;
    environment: string;
    mutex: Mutex;

    constructor(addresses: string[], environment: string) {
        this.addresses = addresses;
        this.environment = environment;
        this.index = environment === "production" ? 0 : 15;
        this.mutex = new Mutex(); // Local mutex for critical sections
    }

    async init() {
        const rr_pointer = await redisClient.get(`${this.environment}_rr_pointer`);
        if (rr_pointer) {
            this.index = parseInt(rr_pointer);
        } else {
            await redisClient.set(`${this.environment}_rr_pointer`, this.index.toString());
        }
    }

    async next() {
        const release = await this.mutex.acquire(); // Local mutex for this instance
        try {
            let address;
            // Use Redis INCR operation to atomically increment index across instances
            const rr_pointer_key = `${this.environment}_rr_pointer`;

            const rr_pointer = await redisClient.incr(rr_pointer_key);
            
            if (this.environment === "production") {
                // Wrap around between 0 and 14 for production (15 wallets)
                this.index = rr_pointer % 15;
            } else if (this.environment === "staging") {
                // Wrap around between 15 and 29 for staging (15 wallets)
                this.index = (rr_pointer % 15) + 15;
            }

            address = this.addresses[this.index];

            console.log(`🛑🛑 ${this.environment} index`, this.index);
            // No need to manually set the index since Redis INCR handles that

            return address;
        } finally {
            release();
        }
    }
}
