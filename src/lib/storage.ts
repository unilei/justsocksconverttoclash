import type { SavedSubscription } from '../../shared';
import { authHeaders } from './auth';

const API_BASE = '/api';

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export async function getSubscriptions(): Promise<SavedSubscription[]> {
  try {
    const response = await fetch(`${API_BASE}/subscriptions`, {
      headers: authHeaders(),
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch subscriptions:', error);
  }
  return [];
}

export async function saveSubscription(sub: SavedSubscription): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(sub),
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to save subscription:', error);
    return false;
  }
}

export async function deleteSubscription(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/subscriptions/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to delete subscription:', error);
    return false;
  }
}

export async function getSubscription(id: string): Promise<SavedSubscription | null> {
  try {
    const response = await fetch(`${API_BASE}/subscriptions/${id}`, {
      headers: authHeaders(),
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch subscription:', error);
  }
  return null;
}

export function getSubscriptionUrl(id: string): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${baseUrl}/api/sub/${id}`;
}
