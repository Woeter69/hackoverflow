import axios from 'axios';
import { auth, getAuthToken } from './firebase';

const API_BASE_URL = '/api/v1'; // Relies on Vite proxy in dev, Nginx in prod

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add the Firebase Token
apiClient.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await getAuthToken(user);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export interface TravelPlanRequest {
  user_id: string; // Firebase UID
  route_geom: string; // WKT LineString
}

export interface ErrandRequest {
  user_id: string;
  title: string;
  description: string;
  pickup_geom: string; // WKT Point
  dropoff_geom: string; // WKT Point
  reward_estimate: number;
}

export interface MatchResponse {
  errand: {
    id: string;
    title: string;
    description: string;
    reward_estimate: number;
    // Add other fields as needed based on backend response
  };
  distance_from_route: number;
}

export interface ErrandResponse {
  id: string;
  title: string;
  description: string;
  reward_estimate: number;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
}

export const api = {
  // Travel Plans
  createTravelPlan: (data: TravelPlanRequest) => apiClient.post('/travel-plans', data),
  getMatches: (planId: string) => apiClient.get(`/travel-plans/${planId}/matches`),

  // Errands
  createErrand: (data: ErrandRequest) => apiClient.post('/errand-requests', data),
  getPendingErrands: () => apiClient.get<ErrandResponse[]>('/errand-requests'),
  updateErrandStatus: (id: string, status: 'completed' | 'cancelled') => apiClient.put(`/errand-requests/${id}/status`, { status }),
  
  // System
  toggleEmergency: (active: boolean, message: string = "", buildingId: number = -1) => 
    apiClient.post('/emergency', { active, message, building_id: buildingId }),

  // Health
  checkHealth: () => apiClient.get('/../health'), // Go up one level from /api/v1
};
