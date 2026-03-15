import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.removeToken();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('heidi_token');
    }
    return null;
  }

  private setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('heidi_token', token);
    }
  }

  private removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('heidi_token');
    }
  }

  // Auth endpoints
  async signup(data: { email: string; password: string; role: string }) {
    const response = await this.client.post('/auth/signup', data);
    if (response.data.token) {
      this.setToken(response.data.token);
    }
    return response.data;
  }

  async login(data: { email: string; password: string }) {
    const response = await this.client.post('/auth/login', data);
    if (response.data.token) {
      this.setToken(response.data.token);
    }
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.client.get('/auth/me');
    return response.data.user;
  }

  logout() {
    this.removeToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }

  // Client endpoints
  async getClientProfile() {
    const response = await this.client.get('/client/profile');
    return response.data.profile;
  }

  async saveClientProfile(data: any) {
    const response = await this.client.post('/client/profile', data);
    return response.data;
  }

  async getMembershipPlans() {
    const response = await this.client.get('/client/membership/plans');
    return response.data.plans;
  }

  async subscribeToPlan(planId: string) {
    const response = await this.client.post('/client/membership/subscribe', { planId });
    return response.data;
  }

  async searchProviders(params: any) {
    const response = await this.client.get('/client/providers/search', { params });
    return response.data;
  }

  async getProvider(id: string) {
    const response = await this.client.get(`/client/providers/${id}`);
    return response.data.provider;
  }

  async getClientBookings() {
    const response = await this.client.get('/client/bookings');
    return response.data.bookings;
  }

  // Provider endpoints
  async getProviderProfile() {
    const response = await this.client.get('/provider/profile');
    return response.data.profile;
  }

  async saveProviderProfile(data: any) {
    const response = await this.client.post('/provider/profile', data);
    return response.data;
  }

  async addAvailability(data: any) {
    const response = await this.client.post('/provider/availability', data);
    return response.data;
  }

  async deleteAvailability(id: string) {
    await this.client.delete(`/provider/availability/${id}`);
  }

  async getProviderBookings(status?: string) {
    const response = await this.client.get('/provider/bookings', {
      params: status ? { status } : {},
    });
    return response.data.bookings;
  }

  async updateBookingStatus(bookingId: string, data: any) {
    const response = await this.client.patch(`/provider/bookings/${bookingId}/status`, data);
    return response.data;
  }

  async getEarnings() {
    const response = await this.client.get('/provider/earnings');
    return response.data;
  }

  // Booking endpoints
  async createBooking(data: any) {
    const response = await this.client.post('/bookings', data);
    return response.data;
  }

  async getBooking(id: string) {
    const response = await this.client.get(`/bookings/${id}`);
    return response.data.booking;
  }

  async saveBoundarySummary(bookingId: string, data: any) {
    const response = await this.client.post(`/bookings/${bookingId}/boundary-summary`, data);
    return response.data;
  }

  async sendMessage(data: any) {
    const response = await this.client.post('/bookings/messages', data);
    return response.data;
  }

  async getMessages(bookingId: string) {
    const response = await this.client.get(`/bookings/${bookingId}/messages`);
    return response.data.messages;
  }

  async createReview(data: any) {
    const response = await this.client.post(`/bookings/${data.bookingId}/review`, data);
    return response.data;
  }

  // Safety endpoints
  async createSafetyReport(data: any) {
    const response = await this.client.post('/safety/reports', data);
    return response.data;
  }

  async getSafetyReports() {
    const response = await this.client.get('/safety/reports');
    return response.data.reports;
  }

  // Public endpoints
  async getServiceTypes() {
    const response = await this.client.get('/public/service-types');
    return response.data.serviceTypes;
  }

  async getPolicies() {
    const response = await this.client.get('/public/policies');
    return response.data.policies;
  }

  async getPolicy(slug: string) {
    const response = await this.client.get(`/public/policies/${slug}`);
    return response.data.policy;
  }

  // Admin endpoints
  async getPendingProviders() {
    const response = await this.client.get('/admin/providers/pending');
    return response.data.providers;
  }

  async approveProvider(id: string) {
    const response = await this.client.patch(`/admin/providers/${id}/approve`);
    return response.data;
  }

  async rejectProvider(id: string, reason: string) {
    const response = await this.client.patch(`/admin/providers/${id}/reject`, { reason });
    return response.data;
  }

  async getAllSafetyReports(status?: string) {
    const response = await this.client.get('/admin/safety/reports', {
      params: status ? { status } : {},
    });
    return response.data.reports;
  }

  async updateSafetyReport(id: string, data: any) {
    const response = await this.client.patch(`/admin/safety/reports/${id}`, data);
    return response.data;
  }

  async getAdminStats() {
    const response = await this.client.get('/admin/stats');
    return response.data.stats;
  }

  async updateUserStatus(userId: string, data: any) {
    const response = await this.client.patch(`/admin/users/${userId}/status`, data);
    return response.data;
  }
}

export const api = new ApiClient();
