import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, CheckCircle, Calendar, User, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface Invoice {
  id: number;
  invoiceNumber: string;
  amountDue: string;
  currencyCode: string;
  status: string;
  clientId?: number;
  clientName?: string;
  issueDate?: string;
  dueDate?: string;
  description?: string;
  tenantId: number;
}

interface TenantSetting {
  id: number;
  tenantId: number;
  key: string;
  value: string;
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

  // Fetch tenant settings for branding
  const { data: tenantSettings } = useQuery<TenantSetting[]>({
    queryKey: [`/api/v1/tenant-settings/${invoice?.tenantId}`],
    enabled: !!invoice?.tenantId,
  });

  // Extract firm branding from tenant settings using correct keys
  const firmBranding = {
    firmName: tenantSettings?.find(s => s.key === 'header_logo_text')?.value || 
             tenantSettings?.find(s => s.key === 'general-settings.firmName')?.value || 'Accounting Firm',
    firmTagline: tenantSettings?.find(s => s.key === 'header_subtitle')?.value || '',
    firmLogo: tenantSettings?.find(s => s.key === 'general-settings.firmLogo')?.value || '',
    footerCopyright: tenantSettings?.find(s => s.key === 'footer_copyright')?.value || '',
    supportEmail: tenantSettings?.find(s => s.key === 'footer_support_email')?.value || ''
  };

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
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Firm Branding Header */}
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {firmBranding.firmLogo && (
                <img 
                  src={firmBranding.firmLogo} 
                  alt={`${firmBranding.firmName} Logo`}
                  className="h-12 w-12 rounded-full object-cover"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold text-blue-900">{firmBranding.firmName}</h1>
                {firmBranding.firmTagline && (
                  <p className="text-blue-700">{firmBranding.firmTagline}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-blue-700 font-medium">Secure Payment Portal</p>
              <p className="text-sm text-blue-600">Professional Invoice Management</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Invoice Details Card */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-500">Invoice Number:</span>
                  <p className="font-semibold">{invoice.invoiceNumber}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Amount Due:</span>
                  <p className="font-semibold text-lg text-green-600">
                    {invoice.currencyCode} {invoice.amountDue}
                  </p>
                </div>
                {invoice.clientName && (
                  <div>
                    <span className="font-medium text-gray-500 flex items-center gap-1">
                      <User className="h-4 w-4" />
                      Client:
                    </span>
                    <p className="font-semibold">{invoice.clientName}</p>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-500">Status:</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    {invoice.status}
                  </span>
                </div>
                {invoice.issueDate && (
                  <div>
                    <span className="font-medium text-gray-500 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Issue Date:
                    </span>
                    <p>{new Date(invoice.issueDate).toLocaleDateString()}</p>
                  </div>
                )}
                {invoice.dueDate && (
                  <div>
                    <span className="font-medium text-gray-500 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Due Date:
                    </span>
                    <p>{new Date(invoice.dueDate).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
              
              {/* Invoice Description */}
              {(invoice.description || invoice.notes) && (
                <div className="pt-4 border-t">
                  <span className="font-medium text-gray-500 flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    Service Description:
                  </span>
                  <p className="text-gray-700 mt-2 p-3 bg-gray-50 rounded-lg">
                    {invoice.description || invoice.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Form Card */}
          <div>
            <Elements stripe={stripePromise} options={stripeOptions}>
              <CheckoutForm invoice={invoice} />
            </Elements>
          </div>
        </div>

        {/* Footer Information */}
        <div className="mt-8 p-6 bg-white rounded-lg border border-gray-200">
          <div className="text-center space-y-2">
            {firmBranding.footerCopyright && (
              <p className="text-sm text-gray-600">{firmBranding.footerCopyright}</p>
            )}
            {firmBranding.supportEmail && (
              <p className="text-sm text-gray-600">
                Support: <a href={`mailto:${firmBranding.supportEmail}`} className="text-blue-600 hover:underline">
                  {firmBranding.supportEmail}
                </a>
              </p>
            )}
            <p className="text-xs text-gray-500">
              Secure payment processing powered by Stripe
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}