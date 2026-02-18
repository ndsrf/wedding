/**
 * Location Management Page
 *
 * Allows wedding planners to manage their locations (ceremony venues, events, etc.)
 * with Google Maps integration
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MapPin, Plus, Edit2, Trash2, ExternalLink } from 'lucide-react';
import WeddingSpinner from '@/components/shared/WeddingSpinner';

interface Location {
  id: string;
  name: string;
  url?: string | null;
  notes?: string | null;
  google_maps_url?: string | null;
  address?: string | null;
  _count?: {
    weddings: number;
    itinerary_items: number;
  };
}

type LocationFormData = Omit<Location, 'id' | '_count'>;

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState<LocationFormData>({
    name: '',
    url: '',
    notes: '',
    google_maps_url: '',
    address: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/planner/locations');
      if (!response.ok) throw new Error('Failed to fetch locations');
      const data = await response.json();
      setLocations(data.data);
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError('Failed to load locations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const url = editingLocation
        ? `/api/planner/locations/${editingLocation.id}`
        : '/api/planner/locations';
      const method = editingLocation ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save location');
      }

      await fetchLocations();
      handleCancelForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save location');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      url: location.url || '',
      notes: location.notes || '',
      google_maps_url: location.google_maps_url || '',
      address: location.address || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (location: Location) => {
    if (location._count && (location._count.weddings > 0 || location._count.itinerary_items > 0)) {
      alert(
        `Cannot delete this location. It is currently used by ${location._count.weddings} wedding(s) and ${location._count.itinerary_items} itinerary item(s).`
      );
      return;
    }

    if (!confirm(`Are you sure you want to delete "${location.name}"?`)) return;

    try {
      const response = await fetch(`/api/planner/locations/${location.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete location');
      }

      await fetchLocations();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete location');
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingLocation(null);
    setFormData({
      name: '',
      url: '',
      notes: '',
      google_maps_url: '',
      address: '',
    });
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Link */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <Link
            href="/planner"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="h-6 w-6" />
                Locations
              </h1>
              <p className="mt-1 text-sm text-gray-600">Manage ceremony venues, event locations, and more</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Location
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="text-center py-12">
            <WeddingSpinner size="md" />
            <p className="mt-2 text-sm text-gray-600">Loading locations...</p>
          </div>
        )}

        {!loading && locations.length === 0 && (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <MapPin className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No locations</h3>
            <p className="mt-1 text-sm text-gray-600">Get started by creating a new location.</p>
            <div className="mt-6">
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Location
              </button>
            </div>
          </div>
        )}

        {!loading && locations.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {locations.map((location) => (
              <div key={location.id} className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{location.name}</h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(location)}
                      className="p-2 text-gray-400 hover:text-blue-600"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(location)}
                      className="p-2 text-gray-400 hover:text-red-600"
                      title="Delete"
                      disabled={location._count && (location._count.weddings > 0 || location._count.itinerary_items > 0)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {location.address && (
                  <p className="text-sm text-gray-600 mb-2">{location.address}</p>
                )}

                {location.notes && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{location.notes}</p>
                )}

                <div className="flex flex-col gap-2">
                  {location.google_maps_url && (
                    <a
                      href={location.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <MapPin className="h-3 w-3" />
                      View on Google Maps
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {location.url && (
                    <a
                      href={location.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Visit Website
                    </a>
                  )}
                </div>

                {location._count && (location._count.weddings > 0 || location._count.itinerary_items > 0) && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Used in {location._count.weddings} wedding(s) and {location._count.itinerary_items} itinerary item(s)
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingLocation ? 'Edit Location' : 'Add Location'}
            </h2>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateOrUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Grand Ballroom, Garden Terrace"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 123 Main St, City, State, ZIP"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Google Maps URL
                </label>
                <input
                  type="url"
                  value={formData.google_maps_url || ''}
                  onChange={(e) => setFormData({ ...formData, google_maps_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://maps.google.com/..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  Link to Google Maps location (right-click on map → Share → Copy link)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website URL
                </label>
                <input
                  type="url"
                  value={formData.url || ''}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional information about this location..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingLocation ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
