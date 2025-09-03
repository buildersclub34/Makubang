import { Razorpay } from 'razorpay';

declare class RazorpayService {
  private client: Razorpay;
  
  constructor();
  
  createOrder(amount: number, currency: string, receipt: string, notes?: Record<string, string>): Promise<{
    id: string;
    entity: string;
    amount: number;
    amount_paid: number;
    amount_due: number;
    currency: string;
    receipt: string;
    offer_id: string | null;
    status: string;
    attempts: number;
    notes: Record<string, string>;
    created_at: number;
  }>;
  
  capturePayment(paymentId: string, amount: number, currency: string): Promise<{
    id: string;
    entity: string;
    amount: number;
    currency: string;
    status: string;
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
    email: string | null;
    contact: string | null;
    notes: Record<string, string>;
    fee: number | null;
    tax: number | null;
    error_code: string | null;
    error_description: string | null;
    error_source: string | null;
    error_step: string | null;
    error_reason: string | null;
    acquirer_data: Record<string, unknown> | null;
    created_at: number;
  }>;
  
  createRefund(paymentId: string, amount: number, notes?: Record<string, string>): Promise<{
    id: string;
    entity: string;
    amount: number;
    currency: string;
    payment_id: string;
    notes: Record<string, string>;
    receipt: string | null;
    acquirer_data: Record<string, unknown> | null;
    created_at: number;
    batch_id: string | null;
    status: string;
    speed_processed: string;
    speed_requested: string;
  }>;
  
  getPayment(paymentId: string): Promise<{
    id: string;
    entity: string;
    amount: number;
    currency: string;
    status: string;
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
    email: string | null;
    contact: string | null;
    notes: Record<string, string>;
    fee: number | null;
    tax: number | null;
    error_code: string | null;
    error_description: string | null;
    error_source: string | null;
    error_step: string | null;
    error_reason: string | null;
    acquirer_data: Record<string, unknown> | null;
    created_at: number;
  }>;
}

export = RazorpayService;
