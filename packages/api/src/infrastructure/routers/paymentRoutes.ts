import { FastifyInstance } from 'fastify';
import { PostgresPaymentRepository } from '../repositories/PostgresPaymentRepository.js';
import { PostgresMemberRepository } from '../repositories/PostgresMemberRepository.js';
import { CreatePaymentUseCase } from '../../application/useCases/CreatePaymentUseCase.js';
import { GetPaymentsUseCase } from '../../application/useCases/GetPaymentsUseCase.js';
import { PaymentController } from '../controllers/PaymentController.js';

export async function paymentRoutes(server: FastifyInstance) {
    const paymentRepo = new PostgresPaymentRepository();
    const memberRepo = new PostgresMemberRepository();
    
    const createPaymentUseCase = new CreatePaymentUseCase(paymentRepo, memberRepo);
    const getPaymentsUseCase = new GetPaymentsUseCase(paymentRepo);

    const paymentController = new PaymentController(
        createPaymentUseCase,
        getPaymentsUseCase
    );

    server.post('/api/v1/payments', paymentController.create.bind(paymentController));
    server.get('/api/v1/payments', paymentController.getAll.bind(paymentController));
}
