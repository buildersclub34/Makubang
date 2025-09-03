declare module 'razorpay' {
  interface RazorpayOrder {
    id: string;
    amount: number;
    amount_paid: number;
    amount_due: number;
    currency: string;
    receipt: string;
    status: string;
    attempts: number;
    notes: Record<string, any>;
    created_at: number;
  }

  interface RazorpayPayment {
    id: string;
    entity: string;
    amount: number;
    currency: string;
    status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
    order_id: string;
    invoice_id: string | null;
    international: boolean;
    method: string;
    amount_refunded: number;
    refund_status: string | null;
    captured: boolean;
    description: string | null;
    card_id: string | null;
    bank: string | null;
    wallet: string | null;
    vpa: string | null;
    email: string;
    contact: string;
    notes: Record<string, any>;
    fee: number | null;
    tax: number | null;
    error_code: string | null;
    error_description: string | null;
    error_source: string | null;
    error_step: string | null;
    error_reason: string | null;
    acquirer_data: Record<string, any>;
    created_at: number;
  }

  interface RazorpayOptions {
    key_id: string;
    key_secret: string;
  }

  interface RazorpayOrderCreateParams {
    amount: number;
    currency: string;
    receipt: string;
    payment_capture: number;
    notes?: Record<string, any>;
  }

  interface RazorpayPaymentCaptureParams {
    amount: number;
    currency: string;
  }

  class Razorpay {
    constructor(options: RazorpayOptions);
    orders: {
      create(params: RazorpayOrderCreateParams): Promise<RazorpayOrder>;
      fetch(orderId: string): Promise<RazorpayOrder>;
    };
    payments: {
      capture(
        paymentId: string, 
        amount: number, 
        currency: string
      ): Promise<RazorpayPayment>;
      fetch(paymentId: string): Promise<RazorpayPayment>;
      refund(paymentId: string, amount: number): Promise<any>;
    };
  }

  export = Razorpay;
}
