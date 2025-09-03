
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calculator, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface GSTCalculation {
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  total: number;
  gstRate: number;
}

interface GSTCalculatorProps {
  amount: number;
  isInterState?: boolean;
  onCalculationChange?: (calculation: GSTCalculation) => void;
  className?: string;
}

export function GSTCalculator({ 
  amount, 
  isInterState = false, 
  onCalculationChange,
  className 
}: GSTCalculatorProps) {
  const [calculation, setCalculation] = useState<GSTCalculation | null>(null);

  // GST rates for food delivery (5% for most food items)
  const GST_RATE = 5;

  useEffect(() => {
    calculateGST(amount);
  }, [amount, isInterState]);

  const calculateGST = (subtotal: number) => {
    const gstAmount = (subtotal * GST_RATE) / 100;
    
    const newCalculation: GSTCalculation = {
      subtotal,
      gstRate: GST_RATE,
      totalGst: gstAmount,
      total: subtotal + gstAmount,
      cgst: isInterState ? 0 : gstAmount / 2,
      sgst: isInterState ? 0 : gstAmount / 2,
      igst: isInterState ? gstAmount : 0,
    };

    setCalculation(newCalculation);
    onCalculationChange?.(newCalculation);
  };

  if (!calculation) return null;

  return (
    <Card className={cn("border-dashed", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4" />
          <CardTitle className="text-base">GST Breakdown</CardTitle>
          <Badge variant="outline" className="text-xs">
            {GST_RATE}% GST
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>₹{calculation.subtotal.toFixed(2)}</span>
          </div>
          
          {!isInterState ? (
            <>
              <div className="flex justify-between text-muted-foreground">
                <span>CGST (2.5%):</span>
                <span>₹{calculation.cgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>SGST (2.5%):</span>
                <span>₹{calculation.sgst.toFixed(2)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-muted-foreground">
              <span>IGST (5%):</span>
              <span>₹{calculation.igst.toFixed(2)}</span>
            </div>
          )}
          
          <div className="border-t pt-2">
            <div className="flex justify-between font-semibold">
              <span>Total Amount:</span>
              <span>₹{calculation.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
          <Info className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-700">
            <div className="font-medium mb-1">GST Information</div>
            <div>
              {isInterState 
                ? 'IGST applies for inter-state delivery'
                : 'CGST + SGST applies for intra-state delivery'
              }
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Utility function for GST calculation that can be used throughout the app
export function calculateGST(amount: number, isInterState: boolean = false) {
  const GST_RATE = 5;
  const gstAmount = (amount * GST_RATE) / 100;
  
  return {
    subtotal: amount,
    gstRate: GST_RATE,
    totalGst: gstAmount,
    total: amount + gstAmount,
    cgst: isInterState ? 0 : gstAmount / 2,
    sgst: isInterState ? 0 : gstAmount / 2,
    igst: isInterState ? gstAmount : 0,
  };
}
