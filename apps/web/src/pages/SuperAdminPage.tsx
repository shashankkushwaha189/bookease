import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Building, Plus, Settings, BarChart3, UserCheck } from 'lucide-react';
import { useToastStore } from '../stores/toast.store';
import { useAuthStore } from '../stores/auth.store';
import { useTenantStore } from '../stores/tenant.store';
import Button from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

interface Tenant {
    id: string;
    name: string;
    slug: string;
    domain: string;
    timezone: string;
    isActive: boolean;
    createdAt: string;
    userCount: number;
}

interface SuperAdminStats {
    totalTenants: number;
    activeTenants: number;
    totalUsers: number;
    totalCustomers: number;
    totalAppointments: number;
}

const SuperAdminPage: React.FC = () => {
    const navigate = useNavigate();
    const toastStore = useToastStore();
    const { user, logout } = useAuthStore();
    const { tenantId, setTenantId } = useTenantStore();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [stats, setStats] = useState<SuperAdminStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'tenants' | 'stats'>('tenants');

    useEffect(() => {
        if (!user || user.role !== 'ADMIN') {
            navigate('/login');
            return;
        }
        loadTenants();
        loadStats();
    }, [user, tenantId]);

    const loadTenants = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/superadmin/tenants', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'X-Tenant-ID': tenantId
                }
            });
            const data = await response.json();
            if (data.success) {
                setTenants(data.data);
            } else {
                toastStore.addToast('Failed to load tenants', 'error');
            }
        } catch (error) {
            toastStore.addToast('Error loading tenants', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/superadmin/stats', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'X-Tenant-ID': tenantId
                }
            });
            const data = await response.json();
            if (data.success) {
                setStats(data.data);
            } else {
                toastStore.addToast('Failed to load stats', 'error');
            }
        } catch (error) {
            toastStore.addToast('Error loading stats', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        
        try {
            const response = await fetch('/api/superadmin/tenants', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'X-Tenant-ID': tenantId,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: formData.get('name'),
                    slug: formData.get('slug'),
                    domain: formData.get('domain'),
                    timezone: formData.get('timezone'),
                    adminEmail: formData.get('adminEmail'),
                    adminPassword: formData.get('adminPassword')
                })
            });

            const data = await response.json();
            if (data.success) {
                toastStore.addToast('Tenant created successfully', 'success');
                loadTenants();
            } else {
                toastStore.addToast('Failed to create tenant', 'error');
            }
        } catch (error) {
            toastStore.addToast('Error creating tenant', 'error');
        }
    };

    const handleAddStaff = async (tenantId: string, e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        
        try {
            const response = await fetch(`/api/superadmin/tenants/${tenantId}/staff`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'X-Tenant-ID': tenantId,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: formData.get('name'),
                    email: formData.get('email'),
                    password: formData.get('password'),
                    role: formData.get('role'),
                    phone: formData.get('phone'),
                    department: formData.get('department'),
                    title: formData.get('title')
                })
            });

            const data = await response.json();
            if (data.success) {
                toastStore.addToast('Staff added successfully', 'success');
            } else {
                toastStore.addToast('Failed to add staff', 'error');
            }
        } catch (error) {
            toastStore.addToast('Error adding staff', 'error');
        }
    };

    const handleAddCustomer = async (tenantId: string, e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        
        try {
            const response = await fetch(`/api/superadmin/tenants/${tenantId}/customers`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'X-Tenant-ID': tenantId,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: formData.get('name'),
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    address: JSON.parse(formData.get('address') || '{}'),
                    dateOfBirth: formData.get('dateOfBirth'),
                    gender: formData.get('gender')
                })
            });

            const data = await response.json();
            if (data.success) {
                toastStore.addToast('Customer added successfully', 'success');
            } else {
                toastStore.addToast('Failed to add customer', 'error');
            }
        } catch (error) {
            toastStore.addToast('Error adding customer', 'error');
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-200 border-t-gray-200"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <Shield className="h-8 w-8 text-blue-600" />
                            <h1 className="ml-3 text-2xl font-bold text-gray-900">Super Admin</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={handleLogout}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Stats Card */}
                    {stats && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <BarChart3 className="h-5 w-5 mr-2" />
                                    System Statistics
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-blue-600">{stats.totalTenants}</div>
                                        <div className="text-sm text-gray-500">Total Tenants</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-green-600">{stats.activeTenants}</div>
                                        <div className="text-sm text-gray-500">Active Tenants</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-purple-600">{stats.totalUsers}</div>
                                        <div className="text-sm text-gray-500">Total Users</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-orange-600">{stats.totalCustomers}</div>
                                        <div className="text-sm text-gray-500">Total Customers</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-pink-600">{stats.totalAppointments}</div>
                                        <div className="text-sm text-gray-500">Total Appointments</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Tenants Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Building className="h-5 w-5 mr-2" />
                                Manage Tenants
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold">All Tenants</h3>
                                    <Button
                                        onClick={() => setActiveTab('tenants')}
                                        variant={activeTab === 'tenants' ? 'default' : 'outline'}
                                    >
                                        View Tenants
                                    </Button>
                                    <Button
                                        onClick={() => setActiveTab('stats')}
                                        variant={activeTab === 'stats' ? 'default' : 'outline'}
                                    >
                                        View Stats
                                    </Button>
                                </div>
                                
                                {activeTab === 'tenants' && (
                                    <div className="space-y-4">
                                        {tenants.map((tenant) => (
                                            <div key={tenant.id} className="border rounded-lg p-4">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-semibold text-lg">{tenant.name}</h4>
                                                        <p className="text-sm text-gray-500">{tenant.slug}</p>
                                                        <p className="text-sm text-gray-500">{tenant.domain}</p>
                                                        <p className="text-sm text-gray-500">{tenant.timezone}</p>
                                                    </div>
                                                    <div className="flex space-x-2">
                                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                                            tenant.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                        }`}>
                                                            {tenant.isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeTab === 'stats' && stats && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-blue-50 p-4 rounded-lg">
                                                <h4 className="font-semibold text-blue-900 mb-2">Quick Actions</h4>
                                                <div className="space-y-2">
                                                    <button
                                                        onClick={() => {
                                                            const name = prompt('Enter tenant name:');
                                                            const slug = prompt('Enter tenant slug:');
                                                            if (name && slug) {
                                                                handleCreateTenant(new Event('submit') as any);
                                                            }
                                                        }}
                                                        className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                                                    >
                                                        Create New Tenant
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="bg-green-50 p-4 rounded-lg">
                                                <h4 className="font-semibold text-green-900 mb-2">Add Staff/Customer</h4>
                                                <div className="space-y-2">
                                                    <select
                                                        onChange={(e) => {
                                                            const select = e.target as HTMLSelectElement;
                                                            const tenantId = select.value;
                                                            if (tenantId) {
                                                                // Show form for selected tenant
                                                            }
                                                        }}
                                                        className="w-full p-2 border rounded"
                                                    >
                                                        <option value="">Select a tenant...</option>
                                                        {tenants.map((tenant) => (
                                                            <option key={tenant.id} value={tenant.id}>
                                                                {tenant.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {tenants.find(t => t.id === tenantId) && (
                                                        <div className="mt-4 space-y-4">
                                                            <div>
                                                                <h5 className="font-semibold mb-2">Add Staff to {tenants.find(t => t.id === tenantId)?.name}</h5>
                                                                <form onSubmit={(e) => handleAddStaff(tenantId, e)} className="space-y-4">
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700">Name</label>
                                                                        <input name="name" type="text" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700">Email</label>
                                                                        <input name="email" type="email" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700">Password</label>
                                                                        <input name="password" type="password" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700">Role</label>
                                                                        <select name="role" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2">
                                                                            <option value="STAFF">Staff</option>
                                                                            <option value="ADMIN">Admin</option>
                                                                        </select>
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                                                                        <input name="phone" type="tel" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700">Department</label>
                                                                        <input name="department" type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700">Title</label>
                                                                        <input name="title" type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                                                                    </div>
                                                                    <div className="flex justify-end">
                                                                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                                                                            Add Staff
                                                                        </button>
                                                                    </div>
                                                                </form>
                                                            </div>
                                                            <div>
                                                                <h5 className="font-semibold mb-2">Add Customer to {tenants.find(t => t.id === tenantId)?.name}</h5>
                                                                <form onSubmit={(e) => handleAddCustomer(tenantId, e)} className="space-y-4">
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700">Name</label>
                                                                        <input name="name" type="text" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700">Email</label>
                                                                        <input name="email" type="email" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                                                                        <input name="phone" type="tel" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                                                                        <input name="dateOfBirth" type="date" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700">Gender</label>
                                                                        <select name="gender" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2">
                                                                            <option value="MALE">Male</option>
                                                                            <option value="FEMALE">Female</option>
                                                                            <option value="OTHER">Other</option>
                                                                        </select>
                                                                    </div>
                                                                    <div className="flex justify-end">
                                                                        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
                                                                            Add Customer
                                                                        </button>
                                                                    </div>
                                                                </form>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SuperAdminPage;
