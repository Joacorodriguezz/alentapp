import { FastifyInstance } from 'fastify';
import { LockerController } from '../controllers/LockerController.js';

export async function registerLockerRouter(
    server: FastifyInstance,
    lockerController: LockerController,
) {
    server.post('/api/v1/lockers', lockerController.create.bind(lockerController));
}
