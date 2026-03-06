import React, { useState } from 'react';
import { Building, Users, Calendar, Shield, ArrowRight, Check } from 'lucide-react';

interface AuthLandingProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

export const AuthLanding: React.FC<AuthLandingProps> = ({ onLoginClick, onRegisterClick }) => {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  const features = [
    {
      icon: Building,
      title: 'Multi-Tenant Platform',
      description: 'Manage multiple locations or businesses from a single platform with complete data isolation.',
      color: 'blue'
    },
    {
      icon: Users,
      title: 'Smart Scheduling',
      description: 'Intelligent appointment scheduling with automated reminders and conflict detection.',
      color: 'green'
    },
    {
      icon: Calendar,
      title: 'Comprehensive Management',
      description: 'Complete appointment, customer, staff, and service management with advanced reporting.',
      color: 'purple'
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Bank-level security with role-based access control and audit logging.',
      color: 'orange'
    }
  ];

  const stats = [
    { label: 'Active Businesses', value: '1,000+' },
    { label: 'Appointments Managed', value: '500K+' },
    { label: 'Customer Satisfaction', value: '98%' },
    { label: 'Uptime', value: '99.9%' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative z-10 pt-20 pb-32">
            <div className="text-center">
              <div className="flex justify-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
                  <Calendar className="w-10 h-10 text-white" />
                </div>
              </div>
              <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
                Professional Appointment
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                  Management System
                </span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Streamline your business with intelligent scheduling, comprehensive management tools, 
                and enterprise-grade security. Perfect for healthcare, consulting, and service-based businesses.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <button
                  onClick={onLoginClick}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center"
                >
                  Sign In to Your Account
                  <ArrowRight className="ml-2 w-5 h-5" />
                </button>
                <button
                  onClick={onRegisterClick}
                  className="px-8 py-4 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl border border-gray-200"
                >
                  Start Free Trial
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-100 rounded-full filter blur-3xl opacity-30 -translate-x-48 -translate-y-48"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-100 rounded-full filter blur-3xl opacity-30 translate-x-48 -translate-y-48"></div>
          <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-green-100 rounded-full filter blur-3xl opacity-30 -translate-x-1/2 translate-y-48"></div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Manage Your Business
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powerful features designed to streamline your workflow and enhance customer experience.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`relative p-8 rounded-2xl bg-white border transition-all duration-300 cursor-pointer ${
                  hoveredFeature === index
                    ? 'border-gray-300 shadow-xl transform -translate-y-2'
                    : 'border-gray-200 shadow-md hover:shadow-lg'
                }`}
                onMouseEnter={() => setHoveredFeature(index)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-${feature.color}-100`}>
                  <feature.icon className={`w-6 h-6 text-${feature.color}-600`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
                
                {hoveredFeature === index && (
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 opacity-5"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Trusted by Thousands of Businesses
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              See what our customers have to say about their experience with BookEase.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Dr. Sarah Johnson',
                role: 'Medical Director',
                business: 'HealthFirst Clinic',
                content: 'BookEase has transformed how we manage patient appointments. The automated reminders alone have reduced no-shows by 40%.',
                rating: 5
              },
              {
                name: 'Michael Chen',
                role: 'Managing Partner',
                business: 'Chen Consulting',
                content: 'The multi-tenant feature allows us to manage multiple office locations seamlessly. Incredible time saver!',
                rating: 5
              },
              {
                name: 'Emily Rodriguez',
                role: 'Salon Owner',
                business: 'Beauty Plus Salon',
                content: 'The reporting features help us understand our business patterns and make data-driven decisions.',
                rating: 5
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Check key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-6 italic">"{testimonial.content}"</p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gray-200 rounded-full mr-4"></div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                    <div className="text-sm text-gray-500">{testimonial.business}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-white">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Ready to Transform Your Business?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of businesses that have streamlined their operations with BookEase.
              Start your free trial today - no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={onRegisterClick}
                className="px-8 py-4 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 transition-all duration-200 flex items-center justify-center"
              >
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </button>
              <button
                onClick={onLoginClick}
                className="px-8 py-4 bg-transparent text-white rounded-xl font-semibold hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-200 border border-white/30"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
