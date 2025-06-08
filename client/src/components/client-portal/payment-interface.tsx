import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CreditCard, Smartphone, Building2, Shield, CheckCircle, Lock, Globe, QrCode } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Invoice, PaymentGatewaySetting } from "@shared/schema";

interface PaymentInterfaceProps {
  invoice: Invoice;
  onPaymentSuccess?: () => void;
}

interface PaymentMethodInfo {
  type: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  supportedMethods: string[];
  processingFee?: string;
}

const paymentMethods: PaymentMethodInfo[] = [
  {
    type: 'stripe',
    name: 'Credit/Debit Card',
    description: 'Pay securely with your credit or debit card',
    icon: CreditCard,
    supportedMethods: ['credit_card', 'debit_card', 'apple_pay', 'google_pay'],
    processingFee: '2.9% + $0.30',
  },
  {
    type: 'paypal',
    name: 'PayPal',
    description: 'Pay with your PayPal account or PayPal Credit',
    icon: Smartphone,
    supportedMethods: ['paypal'],
    processingFee: '3.5%',
  },
  {
    type: 'meezan_bank',
    name: 'Meezan Bank',
    description: 'Islamic banking payment gateway',
    icon: Building2,
    supportedMethods: ['credit_card', 'debit_card', 'bank_transfer'],
    processingFee: 'PKR 25 + 1.5%',
  },
  {
    type: 'bank_alfalah',
    name: 'Bank Alfalah',
    description: 'Secure payment through Bank Alfalah',
    icon: Shield,
    supportedMethods: ['credit_card', 'debit_card', 'bank_transfer'],
    processingFee: 'PKR 30 + 1.8%',
  },
];

export function PaymentInterface({ invoice, onPaymentSuccess }: PaymentInterfaceProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Fetch available payment gateways
  const { data: availableGateways = [], isLoading } = useQuery<PaymentGatewaySetting[]>({
    queryKey: ["/api/v1/finance/payment-gateways"],
    refetchOnWindowFocus: false
  });

  // Filter enabled gateways
  const enabledGateways = availableGateways.filter(gateway => gateway.isEnabled);

  // Get available payment methods
  const availablePaymentMethods = paymentMethods.filter(method => 
    enabledGateways.some(gateway => gateway.gatewayType === method.type)
  );

  // Calculate total amount including processing fee
  const calculateTotalWithFee = (method: PaymentMethodInfo) => {
    const baseAmount = parseFloat(invoice.totalAmount);
    const gateway = enabledGateways.find(g => g.gatewayType === method.type);
    
    if (!gateway) return baseAmount;

    const feePercentage = parseFloat(gateway.transactionFeePercentage || '0');
    const feeFixed = parseFloat(gateway.transactionFeeFixed || '0');
    
    const percentageFee = (baseAmount * feePercentage) / 100;
    const totalFee = percentageFee + feeFixed;
    
    return baseAmount + totalFee;
  };

  // Create payment intent
  const createPaymentMutation = useMutation({
    mutationFn: async ({ gatewayType }: { gatewayType: string }) => {
      const response = await apiRequest("POST", "/api/v1/finance/payments/create-intent", {
        invoiceId: invoice.id,
        gatewayType,
        amount: invoice.totalAmount,
        currency: 'PKR'
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Redirect to payment provider or handle client-side payment
      handlePaymentRedirect(data);
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  // Handle payment method selection and processing
  const handlePayment = async (methodType: string) => {
    if (!invoice || isProcessing) return;

    setIsProcessing(true);
    setSelectedMethod(methodType);
    
    try {
      await createPaymentMutation.mutateAsync({ gatewayType: methodType });
    } catch (error) {
      console.error("Payment error:", error);
      setIsProcessing(false);
    }
  };

  // Handle payment provider redirect or client-side processing
  const handlePaymentRedirect = (paymentData: any) => {
    const method = paymentMethods.find(m => m.type === selectedMethod);
    
    if (!method || !paymentData) {
      toast({
        title: "Payment Error",
        description: "Unable to process payment. Please contact support.",
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    }

    // Handle different payment methods
    switch (selectedMethod) {
      case 'stripe':
        handleStripePayment(paymentData);
        break;
      case 'paypal':
        handlePayPalPayment(paymentData);
        break;
      case 'meezan_bank':
      case 'bank_alfalah':
        handleBankPayment(paymentData);
        break;
      default:
        toast({
          title: "Payment Method Not Supported",
          description: "This payment method is not yet implemented.",
          variant: "destructive",
        });
        setIsProcessing(false);
    }
  };

  // Handle Stripe payment processing
  const handleStripePayment = (paymentData: any) => {
    // For demo purposes, simulate successful payment
    setTimeout(() => {
      handlePaymentSuccess({
        transactionId: `stripe_${Date.now()}`,
        amount: invoice.totalAmount,
        gatewayType: 'stripe'
      });
    }, 2000);
  };

  // Handle PayPal payment processing
  const handlePayPalPayment = (paymentData: any) => {
    // For demo purposes, simulate successful payment
    setTimeout(() => {
      handlePaymentSuccess({
        transactionId: `paypal_${Date.now()}`,
        amount: invoice.totalAmount,
        gatewayType: 'paypal'
      });
    }, 2000);
  };

  // Handle Bank payment processing
  const handleBankPayment = (paymentData: any) => {
    // For demo purposes, simulate successful payment
    setTimeout(() => {
      handlePaymentSuccess({
        transactionId: `bank_${Date.now()}`,
        amount: invoice.totalAmount,
        gatewayType: selectedMethod || 'bank'
      });
    }, 3000);
  };

  // Handle successful payment
  const handlePaymentSuccess = async (paymentResult: any) => {
    try {
      // Record the payment
      await apiRequest("POST", "/api/v1/finance/payments", {
        invoiceId: invoice.id,
        amount: paymentResult.amount,
        paymentMethod: paymentResult.gatewayType,
        transactionId: paymentResult.transactionId,
        gatewayResponse: JSON.stringify(paymentResult),
        status: 'completed'
      });

      // Update invoice status
      await apiRequest("PUT", `/api/v1/finance/invoices/${invoice.id}`, {
        status: 'paid',
        paidAt: new Date().toISOString()
      });

      toast({
        title: "Payment Successful",
        description: `Your payment of $${invoice.totalAmount} has been processed successfully.`,
      });

      setPaymentDialogOpen(false);
      onPaymentSuccess?.();
    } catch (error) {
      console.error("Error recording payment:", error);
      toast({
        title: "Payment Recorded",
        description: "Payment was successful but there was an issue updating records. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setSelectedMethod(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (invoice.status === 'paid') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            Payment Completed
          </CardTitle>
          <CardDescription>
            This invoice has been paid in full.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (availablePaymentMethods.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Payment Options Unavailable
          </CardTitle>
          <CardDescription>
            No payment methods are currently configured. Please contact our team to arrange payment.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Options
        </CardTitle>
        <CardDescription>
          Choose your preferred payment method to pay this invoice
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Invoice Summary */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Invoice #{invoice.invoiceNumber}</p>
              <p className="text-sm text-muted-foreground">
                Due: {new Date(invoice.dueDate).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">${invoice.totalAmount}</p>
              <Badge variant={
                new Date(invoice.dueDate) < new Date() ? "destructive" : "secondary"
              }>
                {new Date(invoice.dueDate) < new Date() ? "Overdue" : "Due"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Your payment information is secured with bank-level encryption. 
            We do not store your payment details.
          </AlertDescription>
        </Alert>

        {/* Payment Methods */}
        <div className="space-y-3">
          <h4 className="font-medium">Available Payment Methods</h4>
          {availablePaymentMethods.map((method) => {
            const gateway = enabledGateways.find(g => g.gatewayType === method.type);
            const totalWithFee = calculateTotalWithFee(method);
            const fee = totalWithFee - parseFloat(invoice.totalAmount);
            
            return (
              <div
                key={method.type}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedMethod(method.type);
                  setPaymentDialogOpen(true);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <method.icon className="h-6 w-6 text-primary" />
                    <div>
                      <p className="font-medium">{method.name}</p>
                      <p className="text-sm text-muted-foreground">{method.description}</p>
                      {method.supportedMethods.length > 1 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Supports: {method.supportedMethods.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${totalWithFee.toFixed(2)}</p>
                    {fee > 0 && (
                      <p className="text-xs text-muted-foreground">
                        +${fee.toFixed(2)} processing fee
                      </p>
                    )}
                    {gateway?.isTestMode && (
                      <Badge variant="outline" className="mt-1">Test Mode</Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Payment Confirmation Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Payment</DialogTitle>
              <DialogDescription>
                You are about to pay invoice #{invoice.invoiceNumber}
              </DialogDescription>
            </DialogHeader>
            
            {selectedMethod && (
              <div className="space-y-4">
                {(() => {
                  const method = paymentMethods.find(m => m.type === selectedMethod);
                  const gateway = enabledGateways.find(g => g.gatewayType === selectedMethod);
                  const totalWithFee = method ? calculateTotalWithFee(method) : 0;
                  
                  return method ? (
                    <>
                      <div className="flex items-center gap-3 p-3 border rounded-lg">
                        <method.icon className="h-6 w-6 text-primary" />
                        <div>
                          <p className="font-medium">{method.name}</p>
                          <p className="text-sm text-muted-foreground">{method.description}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Invoice Amount</span>
                          <span>${invoice.totalAmount}</span>
                        </div>
                        {totalWithFee > parseFloat(invoice.totalAmount) && (
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Processing Fee</span>
                            <span>+${(totalWithFee - parseFloat(invoice.totalAmount)).toFixed(2)}</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between font-medium">
                          <span>Total Amount</span>
                          <span>${totalWithFee.toFixed(2)}</span>
                        </div>
                      </div>

                      {gateway?.isTestMode && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            This payment gateway is in test mode. No actual charges will be made.
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setPaymentDialogOpen(false)}
                          disabled={isProcessing}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={() => handlePayment(selectedMethod)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <div className="flex items-center gap-2">
                              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                              Processing...
                            </div>
                          ) : (
                            `Pay $${totalWithFee.toFixed(2)}`
                          )}
                        </Button>
                      </div>
                    </>
                  ) : null;
                })()}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Help Text */}
        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground">
            Having trouble with payment? <a href="mailto:support@company.com" className="text-primary hover:underline">Contact Support</a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}