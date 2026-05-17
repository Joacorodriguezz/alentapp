import { FastifyInstance } from 'fastify';
import { SportController } from '../controllers/SportController.js';

export function registerSportRouter(
    server: FastifyInstance,
    sportController: SportController,
): void {
    server.post('/api/v1/sports', sportController.create.bind(sportController));
}
