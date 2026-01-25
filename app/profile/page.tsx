'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseClient } from '@/app/lib/supabaseClient';
import type { UserProfile } from '@/app/lib/recommend/types';

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | undefined>();

  useEffect(() => {
    supabaseClient.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        // Fetch profile
        supabaseClient
          .from('users_profile')
          .select('*')
          .eq('id', data.user.id)
          .single()
          .then(({ data: profileData, error }) => {
            if (error && error.code !== 'PGRST116') {
              console.error('Error fetching profile:', error);
            } else {
              setProfile(profileData as UserProfile);
            }
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in</h1>
          <Link href="/" className="text-blue-600 hover:underline">
            Back to search
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Back to search
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-6">Your Profile</h1>

          {profile ? (
            <div className="space-y-4">
              <div>
                <h2 className="font-semibold mb-2">Inferred Preferences</h2>
                <div className="space-y-2">
                  {profile.preferred_makes && profile.preferred_makes.length > 0 && (
                    <div>
                      <strong>Preferred Makes:</strong>{' '}
                      {profile.preferred_makes.join(', ')}
                    </div>
                  )}
                  {profile.preferred_body_types && profile.preferred_body_types.length > 0 && (
                    <div>
                      <strong>Preferred Body Types:</strong>{' '}
                      {profile.preferred_body_types.join(', ')}
                    </div>
                  )}
                  {profile.preferred_features && profile.preferred_features.length > 0 && (
                    <div>
                      <strong>Preferred Features:</strong>{' '}
                      {profile.preferred_features.join(', ')}
                    </div>
                  )}
                  {profile.budget_max_cents && (
                    <div>
                      <strong>Budget:</strong>{' '}
                      ${(profile.budget_max_cents / 100).toLocaleString()}
                    </div>
                  )}
                  {profile.max_distance_miles && (
                    <div>
                      <strong>Max Distance:</strong> {profile.max_distance_miles} miles
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600">
                  Preferences are inferred from your browsing history, favorites, and purchases.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-600">
                No profile data yet. Start browsing and favoriting cars to build your preferences!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

