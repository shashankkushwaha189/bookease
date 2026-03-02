import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Check, 
  X, 
  RotateCcw, 
  AlertTriangle, 
  Info,
  Clock
} from 'lucide-react';
import Button from './ui/Button';
import { useToastStore } from '../stores/toast.store';

// Types
interface AiSummary {
  id: string;
  summary: string;
  customerIntent: string;
  suggestedFollowUp: string;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'pending' | 'accepted' | 'discarded';
  generatedAt: string;
}

type LoadingState = 'idle' | 'loading' | 'error';

// API Hooks (mock implementations - replace with actual API calls)
const useAiSummary = (appointmentId: string) => {
  const [summary, setSummary] = React.useState<AiSummary | null>(null);
  const [loadingState, setLoadingState] = React.useState<LoadingState>('idle');
  const [loadingTime, setLoadingTime] = React.useState(0);

  const generateSummary = async () => {
    setLoadingState('loading');
    setLoadingTime(0);
    
    // Timer for patience message
    const patienceTimer = setInterval(() => {
      setLoadingTime(prev => prev + 1);
    }, 1000);

    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 7000));
      
      const mockSummary: AiSummary = {
        id: `summary-${Date.now()}`,
        summary: 'Customer had a standard haircut appointment. They mentioned being satisfied with the service and asked about beard grooming options for their next visit. Customer arrived on time and was friendly throughout the appointment.',
        customerIntent: 'Customer is satisfied with current service and interested in expanding to additional grooming services.',
        suggestedFollowUp: 'Follow up in 2-3 weeks to schedule beard trim appointment. Mention the beard grooming package deal when they call.',
        confidence: 'HIGH',
        status: 'pending',
        generatedAt: new Date().toISOString()
      };
      
      setSummary(mockSummary);
      setLoadingState('idle');
    } catch (error) {
      console.error('Failed to generate AI summary:', error);
      setLoadingState('error');
    } finally {
      clearInterval(patienceTimer);
      setLoadingTime(0);
    }
  };

  const acceptSummary = async () => {
    if (!summary) return;

    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSummary(prev => prev ? { ...prev, status: 'accepted' as const } : null);
    } catch (error) {
      console.error('Failed to accept summary:', error);
      setLoadingState('error');
    }
  };

  const discardSummary = async () => {
    if (!summary) return;

    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSummary(prev => prev ? { ...prev, status: 'discarded' as const } : null);
    } catch (error) {
      console.error('Failed to discard summary:', error);
      setLoadingState('error');
    }
  };

  return { 
    summary, 
    loadingState, 
    loadingTime, 
    generateSummary, 
    acceptSummary, 
    discardSummary 
  };
};

// Components
const ConfidenceBadge: React.FC<{ confidence: 'LOW' | 'MEDIUM' | 'HIGH' }> = ({ confidence }) => {
  const getBadgeConfig = () => {
    switch (confidence) {
      case 'LOW':
        return {
          color: 'bg-warning-soft text-warning border-warning',
          text: 'Low confidence — review carefully'
        };
      case 'MEDIUM':
        return {
          color: 'bg-primary-soft text-primary border-primary',
          text: 'Medium confidence'
        };
      case 'HIGH':
        return {
          color: 'bg-success-soft text-success border-success',
          text: 'High confidence'
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
      {config.text}
    </span>
  );
};

const LoadingSkeleton: React.FC<{ loadingTime: number }> = ({ loadingTime }) => {
  return (
    <div className="bg-surface border border-neutral-200 rounded-lg p-6">
      <div className="space-y-4">
        {/* Header skeleton */}
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 bg-neutral-200 rounded-full animate-pulse"></div>
          <div className="h-4 bg-neutral-200 rounded w-32 animate-pulse"></div>
        </div>
        
        {/* Content skeletons */}
        <div className="space-y-3">
          <div className="h-3 bg-neutral-200 rounded w-full animate-pulse"></div>
          <div className="h-3 bg-neutral-200 rounded w-5/6 animate-pulse"></div>
          <div className="h-3 bg-neutral-200 rounded w-4/5 animate-pulse"></div>
        </div>
      </div>
      
      {/* Patience message */}
      {loadingTime >= 5 && (
        <div className="mt-4 p-3 bg-neutral-50 rounded-lg">
          <div className="flex items-center space-x-2 text-sm text-neutral-600">
            <Clock className="w-4 h-4" />
            <span>This may take a few seconds...</span>
          </div>
        </div>
      )}
    </div>
  );
};

const ErrorState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => {
  return (
    <div className="bg-surface border border-neutral-200 rounded-lg p-6">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 bg-warning-soft rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6 text-warning" />
        </div>
        
        <div>
          <h3 className="text-lg font-medium text-neutral-900 mb-2">
            AI service is currently unavailable
          </h3>
          <p className="text-sm text-neutral-600">
            Please try again later
          </p>
        </div>
        
        <Button variant="primary" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </div>
  );
};

// Main Component
const AiSummaryPanel: React.FC<{
  appointmentId: string;
  isEnabled: boolean;
}> = ({ appointmentId, isEnabled }) => {
  const { success, error } = useToastStore();
  const { 
    summary, 
    loadingState, 
    loadingTime, 
    generateSummary, 
    acceptSummary, 
    discardSummary 
  } = useAiSummary(appointmentId);

  // Don't render if AI is not enabled
  if (!isEnabled) {
    return null;
  }

  // STATE 1: No summary yet
  if (!summary && loadingState === 'idle') {
    return (
      <div className="bg-surface border border-neutral-200 rounded-lg p-6">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-primary-soft rounded-full flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-neutral-900 mb-2">AI Summary</h3>
            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-soft text-primary mb-4">
              AI-Assisted — Review before using
            </div>
          </div>
          
          <p className="text-sm text-neutral-600 mb-4">
            Generate a structured summary of this appointment
          </p>
          
          <Button
            variant="primary"
            onClick={generateSummary}
            className="w-full"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate AI Summary
          </Button>
        </div>
      </div>
    );
  }

  // STATE 2: Loading
  if (loadingState === 'loading') {
    return <LoadingSkeleton loadingTime={loadingTime} />;
  }

  // ERROR STATE
  if (loadingState === 'error') {
    return <ErrorState onRetry={generateSummary} />;
  }

  // STATE 4: Accepted
  if (summary?.status === 'accepted') {
    return (
      <div className="bg-success-soft border border-success rounded-lg p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 bg-success rounded-full flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
            <h3 className="text-lg font-medium text-success">Summary accepted</h3>
          </div>
          
          {/* Summary content */}
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium text-neutral-600 mb-1">Summary</div>
              <p className="text-sm text-neutral-900">{summary.summary}</p>
            </div>
            
            <div>
              <div className="text-sm font-medium text-neutral-600 mb-1">Customer Intent</div>
              <p className="text-sm text-neutral-900">{summary.customerIntent}</p>
            </div>
            
            <div>
              <div className="text-sm font-medium text-neutral-600 mb-1">Suggested Follow-up</div>
              <p className="text-sm text-neutral-900">{summary.suggestedFollowUp}</p>
            </div>
          </div>
          
          {/* AI-generated label */}
          <div className="flex items-center space-x-2 pt-2 border-t border-success-200">
            <Info className="w-4 h-4 text-success" />
            <span className="text-xs text-success">AI-generated</span>
          </div>
        </div>
      </div>
    );
  }

  // STATE 5: Discarded
  if (summary?.status === 'discarded') {
    return (
      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6 opacity-75">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <X className="w-5 h-5 text-neutral-400" />
            <h3 className="text-lg font-medium text-neutral-500 line-through">
              Summary discarded
            </h3>
          </div>
          
          <Button
            variant="secondary"
            onClick={generateSummary}
            className="w-full"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Regenerate
          </Button>
        </div>
      </div>
    );
  }

  // STATE 3: Summary displayed (pending)
  if (summary && summary.status === 'pending') {
    return (
      <div className="bg-surface border border-neutral-200 rounded-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 bg-primary-soft rounded-full flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-neutral-900">AI Summary</h3>
          </div>
          
          <ConfidenceBadge confidence={summary.confidence} />
        </div>
        
        {/* Content sections */}
        <div className="space-y-4">
          {/* Summary */}
          <div>
            <div className="text-sm font-medium text-neutral-600 mb-1">Summary</div>
            <p className="text-sm text-neutral-900">{summary.summary}</p>
          </div>
          
          {/* Customer Intent */}
          <div>
            <div className="text-sm font-medium text-neutral-600 mb-1">Customer Intent</div>
            <p className="text-sm text-neutral-900">{summary.customerIntent}</p>
          </div>
          
          {/* Suggested Follow-up */}
          <div>
            <div className="text-sm font-medium text-neutral-600 mb-1">Suggested Follow-up</div>
            <div className="p-3 bg-warning-soft border border-warning rounded-lg">
              <p className="text-sm text-neutral-900">{summary.suggestedFollowUp}</p>
            </div>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center space-x-3 pt-4 border-t border-neutral-200">
          <Button
            variant="primary"
            onClick={acceptSummary}
            className="flex-1"
          >
            <Check className="w-4 h-4 mr-2" />
            Accept
          </Button>
          
          <Button
            variant="ghost"
            onClick={discardSummary}
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
            Discard
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default AiSummaryPanel;
