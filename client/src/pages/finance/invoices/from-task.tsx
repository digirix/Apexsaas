import React from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Header } from "@/components/ui/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

const CreateInvoiceFromTaskPage = () => {
  const [, navigate] = useLocation();
  
  return (
    <AppLayout title="Create Invoice from Task">
      <div className="container py-6">
        <Header 
          title="Create Invoice from Task" 
          subtitle="Generate an invoice based on a completed revenue task" 
        />
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Simplified Invoice Form</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is a placeholder for the invoice from task form.</p>
            <Button 
              onClick={() => navigate("/finance")}
              className="mt-4"
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default CreateInvoiceFromTaskPage;