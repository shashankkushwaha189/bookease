import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/EnhancedAuthContext';
import { User, Upload, Camera, Mail, Phone, Shield, User as UserIcon, Settings, Lock, Check } from 'lucide-react';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  avatarUrl?: string;
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      sms: boolean;
      security: boolean;
      marketing: boolean;
    };
  };
  security: {
    mfaEnabled: boolean;
    emailVerified: boolean;
    phoneVerified: boolean;
    twoFactorRequired: boolean;
  };
}

export const EnhancedProfile: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email,
        phoneNumber: user.phoneNumber || '',
        avatarUrl: user.avatarUrl || '',
        preferences: user.preferences || {
          theme: 'auto',
          language: 'en',
          timezone: 'UTC',
          notifications: {
            email: true,
            sms: false,
            security: true,
            marketing: false,
          },
        },
        security: {
          mfaEnabled: user.mfaEnabled || false,
          emailVerified: user.emailVerified || false,
          phoneVerified: user.phoneVerified || false,
          twoFactorRequired: user.twoFactorRequired || false,
        },
      });
    }
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (result && typeof result === 'string') {
          setAvatarPreview(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = async () => {
    if (!profileData) return;

    setIsSaving(true);
    try {
      await updateProfile(profileData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const verifyEmail = async () => {
    // This would call API to send verification email
    console.log('Sending email verification...');
  };

  const verifyPhone = async () => {
    // This would call API to send SMS verification
    console.log('Sending phone verification...');
  };

  const enableMFA = async () => {
    // This would call API to enable MFA
    console.log('Enabling MFA...');
  };

  if (!profileData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
        <div className="bg-white shadow sm:rounded-lg sm:overflow-hidden">
          <div className="px-4 py-8 sm:px-10">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">
                Profile Settings
              </h1>
              <p className="text-gray-600">
                Manage your account information and preferences
              </p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'profile'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'security'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Security
                </button>
                <button
                  onClick={() => setActiveTab('preferences')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'preferences'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Preferences
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'profile' && (
              <div className="space-y-6 mt-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Profile Information
                    </h2>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {isEditing ? 'Cancel' : 'Edit'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Avatar Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-center">
                        <div className="relative">
                          {profileData.avatarUrl || avatarPreview ? (
                            <img
                              src={avatarPreview || profileData.avatarUrl}
                              alt="Profile"
                              className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                            />
                          ) : (
                            <div className="w-32 h-32 rounded-full bg-gray-200 border-4 border-gray-200 flex items-center justify-center">
                              <UserIcon className="w-16 h-16 text-gray-400" />
                            </div>
                          )}
                          
                          {isEditing && (
                            <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700">
                              <Camera className="w-4 h-4" />
                              <input
                                type="file"
                                onChange={handleAvatarChange}
                                accept="image/*"
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-2">
                          Click the camera icon to upload a new photo
                        </p>
                        <p className="text-sm text-gray-500">
                          JPG, PNG or GIF. Max size 2MB.
                        </p>
                      </div>
                    </div>

                    {/* Profile Fields */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={profileData.firstName}
                          onChange={(e) => setProfileData(prev => prev ? { ...prev, firstName: e.target.value } : null)}
                          disabled={!isEditing}
                          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={profileData.lastName}
                          onChange={(e) => setProfileData(prev => prev ? { ...prev, lastName: e.target.value } : null)}
                          disabled={!isEditing}
                          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="email"
                            value={profileData.email}
                            onChange={(e) => setProfileData(prev => prev ? { ...prev, email: e.target.value } : null)}
                            disabled={!isEditing}
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {profileData.security.emailVerified ? (
                            <Check className="w-5 h-5 text-green-500" />
                          ) : (
                            <button
                              onClick={verifyEmail}
                              className="text-blue-600 hover:text-blue-500 text-sm"
                            >
                              Verify
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="tel"
                            value={profileData.phoneNumber}
                            onChange={(e) => setProfileData(prev => prev ? { ...prev, phoneNumber: e.target.value } : null)}
                            disabled={!isEditing}
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {profileData.security.phoneVerified ? (
                            <Check className="w-5 h-5 text-green-500" />
                          ) : (
                            <button
                              onClick={verifyPhone}
                              className="text-blue-600 hover:text-blue-500 text-sm"
                            >
                              Verify
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={saveProfile}
                        disabled={isSaving}
                        className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                      >
                        {isSaving ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white border-t-transparent mr-2"></div>
                            Saving...
                          </div>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {activeTab === 'security' && (
              <div className="space-y-6 mt-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">
                    Security Settings
                  </h2>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-medium text-gray-900">
                          Multi-Factor Authentication
                        </h3>
                        <p className="text-sm text-gray-600">
                          Add an extra layer of security to your account
                        </p>
                      </div>
                      <button
                        onClick={enableMFA}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${
                          profileData.security.mfaEnabled
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {profileData.security.mfaEnabled ? 'Disable MFA' : 'Enable MFA'}
                      </button>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-base font-medium text-gray-900 mb-4">
                        Security Status
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Email Verification:</span>
                          <span className={`text-sm font-medium ${
                            profileData.security.emailVerified ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {profileData.security.emailVerified ? 'Verified' : 'Not Verified'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Phone Verification:</span>
                          <span className={`text-sm font-medium ${
                            profileData.security.phoneVerified ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {profileData.security.phoneVerified ? 'Verified' : 'Not Verified'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Two-Factor Required:</span>
                          <span className={`text-sm font-medium ${
                            profileData.security.twoFactorRequired ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {profileData.security.twoFactorRequired ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {activeTab === 'preferences' && (
              <div className="space-y-6 mt-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">
                    User Preferences
                  </h2>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Theme
                      </label>
                      <select
                        value={profileData.preferences.theme}
                        onChange={(e) => setProfileData(prev => prev ? { 
                          ...prev, 
                          preferences: { ...prev.preferences, theme: e.target.value as any }
                        } : null)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="auto">Auto</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Language
                      </label>
                      <select
                        value={profileData.preferences.language}
                        onChange={(e) => setProfileData(prev => prev ? { 
                          ...prev, 
                          preferences: { ...prev.preferences, language: e.target.value }
                        } : null)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                        <option value="de">Deutsch</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timezone
                      </label>
                      <select
                        value={profileData.preferences.timezone}
                        onChange={(e) => setProfileData(prev => prev ? { 
                          ...prev, 
                          preferences: { ...prev.preferences, timezone: e.target.value }
                        } : null)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="Europe/London">London</option>
                        <option value="Asia/Tokyo">Tokyo</option>
                      </select>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-base font-medium text-gray-900 mb-4">
                        Email Notifications
                      </h3>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={profileData.preferences.notifications.email}
                            onChange={(e) => setProfileData(prev => prev ? { 
                              ...prev, 
                              preferences: { ...prev.preferences, notifications: { 
                                ...prev.preferences.notifications, email: e.target.checked 
                              }}
                            } : null)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            Security alerts and account updates
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
