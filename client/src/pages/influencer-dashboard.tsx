import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function InfluencerDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/dashboard/influencer/summary', { credentials: 'include' });
        if (res.ok) setData(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <Card>
        <CardHeader><CardTitle>Engagement</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div><div className="text-sm text-muted-foreground">Views</div><div className="text-2xl font-bold">{data?.engagement?.views || 0}</div></div>
            <div><div className="text-sm text-muted-foreground">Likes</div><div className="text-2xl font-bold">{data?.engagement?.likes || 0}</div></div>
            <div><div className="text-sm text-muted-foreground">Comments</div><div className="text-2xl font-bold">{data?.engagement?.comments || 0}</div></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Earnings</CardTitle></CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">₹{data?.earnings || 0}</div>
        </CardContent>
      </Card>
    </div>
  );
}


