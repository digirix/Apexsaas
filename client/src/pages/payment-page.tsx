import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Invoice {
  id: number;
  invoiceNumber: string;
  amountDue: string;
  currencyCode: string;
  status: string;
  clientId?: number;
  tenantId: number;
}

interface PaymentConfig {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  publicKey: string;
}

function CheckoutForm({ invoice }: { invoice: Invoice }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSucceeded, setPaymentSucceeded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        setPaymentSucceeded(true);
        toast({
          title: "Payment Successful",
          description: "Thank you for your payment!",
        });
      }
    } catch (err: any) {
      toast({
        title: "Payment Error",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }

    setIsProcessing(false);
  };

  if (paymentSucceeded) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <CardTitle className="text-green-700">Payment Successful!</CardTitle>
          <CardDescription>
            Your payment for Invoice #{invoice.invoiceNumber} has been processed successfully.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Invoice:</span>
              <span>#{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount:</span>
              <span>{invoice.currencyCode} {invoice.amountDue}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Pay Invoice
        </CardTitle>
        <CardDescription>
          Complete your payment for Invoice #{invoice.invoiceNumber}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Amount</span>
            <span className="text-2xl font-bold">
              {invoice.currencyCode} {invoice.amountDue}
            </span>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <PaymentElement />
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={!stripe || !elements || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ${invoice.currencyCode} ${invoice.amountDue}`
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function PaymentPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId) {
      setError("No invoice ID provided");
      setLoading(false);
      return;
    }

    const loadInvoiceAndCreatePayment = async () => {
      try {
        console.log("Loading payment for invoice:", invoiceId);
        
        // Create payment intent
        const response = await fetch(`/api/v1/invoices/${invoiceId}/payment/stripe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create payment');
        }

        const data = await response.json();
        console.log("Payment intent created:", data);
        
        setClientSecret(data.clientSecret);
        
        // Load Stripe with tenant-specific public key
        if (data.publicKey) {
          const stripe = loadStripe(data.publicKey);
          setStripePromise(stripe);
        }
        
        // Get invoice details
        const invoiceResponse = await fetch(`/api/v1/invoices/${invoiceId}/payment-link`);
        if (invoiceResponse.ok) {
          const invoiceData = await invoiceResponse.json();
          setInvoice(invoiceData.invoice);
        }
        
      } catch (err: any) {
        console.error("Error loading payment:", err);
        setError(err.message || 'Failed to load payment');
      } finally {
        setLoading(false);
      }
    };

    loadInvoiceAndCreatePayment();
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-red-600">Payment Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invoice || !clientSecret || !stripePromise) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Invoice Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">The requested invoice could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stripeOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Invoice Payment</h1>
          <p className="text-gray-600">Secure payment processing</p>
        </div>
        
        <Elements stripe={stripePromise} options={stripeOptions}>
          <CheckoutForm invoice={invoice} />
        </Elements>
      </div>
    </div>
  );
}