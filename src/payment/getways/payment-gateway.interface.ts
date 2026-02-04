export interface PaymentGateway {
    createPayment(data: any): Promise<any>;
    // verifyPayment(data: any): Promise<any>;
}