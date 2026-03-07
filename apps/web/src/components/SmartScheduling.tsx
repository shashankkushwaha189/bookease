import React, { useState, useEffect } from 'react';
import { Brain, Clock, Users, TrendingUp, Lightbulb } from 'lucide-react';
import { smartSchedulingApi } from '../api/smart-scheduling';
import { useToastStore } from '../stores/toast.store';

interface SmartSchedulingProps {
  serviceId: string;
  selectedDate: string;
  onTimeSlotSelect?: (timeSlot: any) => void;
  onStaffSelect?: (staff: any) => void;
}

const SmartScheduling: React.FC<SmartSchedulingProps> = ({
  serviceId,
  selectedDate,
  onTimeSlotSelect,
  onStaffSelect,
}) => {
  const [optimizedSlots, setOptimizedSlots] = useState<any[]>([]);
  const [staffRecommendations, setStaffRecommendations] = useState<any[]>([]);
  const [peakHours, setPeakHours] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { success, error } = useToastStore();

  useEffect(() => {
    if (serviceId && selectedDate) {
      loadSmartRecommendations();
    }
  }, [serviceId, selectedDate]);

  const loadSmartRecommendations = async () => {
    setIsLoading(true);
    try {
      // Load optimized time slots
      const slotsResponse = await smartSchedulingApi.getOptimizedTimeSlots(serviceId, selectedDate);
      setOptimizedSlots(slotsResponse.data.data.availableSlots);

      // Load staff recommendations
      const staffResponse = await smartSchedulingApi.getStaffRecommendations(serviceId);
      setStaffRecommendations(staffResponse.data.data.recommendations);

      // Load peak hours analysis
      const peakResponse = await smartSchedulingApi.getPeakHours({ serviceId, days: 30 });
      setPeakHours(peakResponse.data.data);
    } catch (err: any) {
      console.error('Failed to load smart recommendations:', err);
      error('Failed to load smart scheduling recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeSlotClick = (slot: any) => {
    if (onTimeSlotSelect) {
      onTimeSlotSelect(slot);
    }
  };

  const handleStaffClick = (staff: any) => {
    if (onStaffSelect) {
      onStaffSelect(staff);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Brain className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Smart Scheduling</h3>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Optimized Time Slots */}
      {optimizedSlots.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Optimized Time Slots</h3>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              AI-Powered
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {optimizedSlots
              .filter(slot => slot.optimization.score > 70)
              .slice(0, 6)
              .map((slot, index) => (
                <div
                  key={index}
                  onClick={() => handleTimeSlotClick(slot)}
                  className="border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      {slot.optimization.score}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {slot.optimization.gapBefore > 30 && "Fills gap before"}
                    {slot.optimization.gapAfter > 30 && "Fills gap after"}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Staff Recommendations */}
      {staffRecommendations.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Recommended Staff</h3>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              Skills-Based
            </span>
          </div>
          <div className="space-y-3">
            {staffRecommendations.slice(0, 3).map((recommendation, index) => (
              <div
                key={index}
                onClick={() => handleStaffClick(recommendation.staff)}
                className="border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{recommendation.staff.name}</div>
                      <div className="text-xs text-gray-600">
                        Performance: {recommendation.reasons.performance}% | 
                        Availability: {recommendation.reasons.availability}%
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">{recommendation.score}%</div>
                    <div className="text-xs text-gray-600">Match Score</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Peak Hours Analysis */}
      {peakHours && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Peak Hours Analysis</h3>
            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
              Last 30 days
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Peak Hours */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Busiest Hours</h4>
              <div className="space-y-2">
                {peakHours.insights.peakHours.slice(0, 3).map((hour: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{hour.hour}:00</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">{hour.appointments} bookings</span>
                      {hour.peak && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Peak</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Peak Days */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Busiest Days</h4>
              <div className="space-y-2">
                {peakHours.insights.peakDays.slice(0, 3).map((day: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{day.day}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">{day.appointments} bookings</span>
                      {day.peak && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Peak</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {peakHours.insights.recommendations.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center space-x-2 mb-3">
                <Lightbulb className="w-4 h-4 text-yellow-600" />
                <h4 className="font-medium text-gray-900">Smart Recommendations</h4>
              </div>
              <div className="space-y-2">
                {peakHours.insights.recommendations.slice(0, 2).map((rec: any, index: number) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${
                      rec.priority === 'high' ? 'bg-red-500' :
                      rec.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                    <p className="text-sm text-gray-600">{rec.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartScheduling;
