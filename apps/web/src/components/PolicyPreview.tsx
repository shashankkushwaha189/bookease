import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Clock, RotateCcw, AlertTriangle, Phone, Mail } from 'lucide-react';

// Types
interface PolicyData {
  cancellationWindowHours: number;
  maxReschedulesAllowed: number;
  noShowGracePeriodMinutes: number;
  policyText: string;
  businessPhone?: string;
  businessEmail?: string;
}

interface PolicyPreviewProps {
  policy: string;
}

// API Hook (mock implementation - replace with actual API call)
const usePolicyData = () => {
  const [policyData, setPolicyData] = React.useState<PolicyData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    const fetchPolicyData = async () => {
      try {
        // Mock API call - replace with actual API
        // GET /api/public/policy
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const mockPolicyData: PolicyData = {
          cancellationWindowHours: 24,
          maxReschedulesAllowed: 3,
          noShowGracePeriodMinutes: 15,
          policyText: `Welcome to our salon! We're committed to providing you with the best possible experience. Please review our booking policies below.

Cancellation Policy:
We understand that plans change. If you need to cancel your appointment, please provide at least 24 hours notice. Cancellations made less than 24 hours before the appointment time may be subject to a cancellation fee.

Rescheduling Policy:
You can reschedule your appointment up to 3 times. Each reschedule must be made at least 24 hours before the original appointment time. After 3 reschedules, a new appointment will need to be booked.

No-Show Policy:
If you arrive more than 15 minutes late for your appointment, it may be marked as a no-show. No-shows may be subject to a fee and may affect your ability to book future appointments.

Late Arrivals:
If you arrive late, we will do our best to accommodate you, but your service time may need to be shortened to respect the next scheduled appointment.

Payment Policy:
Payment is due at the time of service. We accept cash, credit cards, and digital payments. A 50% deposit may be required for new clients or appointments over 2 hours.

Health & Safety:
Please arrive on time and in good health. If you are feeling unwell, please reschedule your appointment. We maintain high standards of cleanliness and sanitation.

Thank you for choosing us! We look forward to serving you.`,
          businessPhone: '+1 (555) 123-4567',
          businessEmail: 'contact@salon.com'
        };
        
        setPolicyData(mockPolicyData);
      } catch (error) {
        console.error('Failed to fetch policy data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPolicyData();
  }, []);

  return { policyData, isLoading };
};

// Main Component
const PolicyPreview: React.FC<PolicyPreviewProps> = ({ policy }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const { policyData, isLoading } = usePolicyData();

  if (isLoading || !policyData) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-neutral-200 rounded w-48"></div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {!isExpanded ? (
        /* Collapsed State */
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center text-primary hover:text-primary-600 text-sm font-medium transition-colors"
        >
          View cancellation & booking policy
          <ChevronDown className="w-4 h-4 ml-1" />
        </button>
      ) : (
        /* Expanded State */
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6 mt-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-900">Booking Policy</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          </div>

          {/* Key Points */}
          <div className="space-y-3 mb-6">
            <div className="flex items-start space-x-3">
              <Clock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium text-neutral-900">Cancellation:</span>
                <span className="text-neutral-700 ml-1">
                  up to {policyData.cancellationWindowHours} hours before your appointment
                </span>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <RotateCcw className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium text-neutral-900">Rescheduling:</span>
                <span className="text-neutral-700 ml-1">
                  allowed up to {policyData.maxReschedulesAllowed} {policyData.maxReschedulesAllowed === 1 ? 'time' : 'times'}
                </span>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium text-neutral-900">No-show:</span>
                <span className="text-neutral-700 ml-1">
                  marked if you don't arrive within {policyData.noShowGracePeriodMinutes} minutes
                </span>
              </div>
            </div>
          </div>

          {/* Full Policy Text */}
          <div className="mb-6">
            <h4 className="font-medium text-neutral-900 mb-3">Full Policy</h4>
            <div className="bg-white border border-neutral-200 rounded-lg p-4">
              <div className="prose prose-sm max-w-none">
                {policyData.policyText.split('\n').map((paragraph, index) => (
                  <p key={index} className="text-sm text-neutral-700 mb-3 last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* Business Contact */}
          <div className="border-t border-neutral-200 pt-4">
            <h4 className="font-medium text-neutral-900 mb-3">Business Contact</h4>
            <div className="flex flex-wrap gap-4 text-sm">
              {policyData.businessPhone && (
                <div className="flex items-center space-x-2 text-neutral-700">
                  <Phone className="w-4 h-4" />
                  <span>{policyData.businessPhone}</span>
                </div>
              )}
              {policyData.businessEmail && (
                <div className="flex items-center space-x-2 text-neutral-700">
                  <Mail className="w-4 h-4" />
                  <span>{policyData.businessEmail}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PolicyPreview;
