import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Comment = {
  _id?: string;
  userId: string;
  text: string;
  createdAt: string | Date;
};

export default function CommentsPanel({ videoId }: { videoId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/engagement/videos/${videoId}/comments`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setComments(data.items || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (videoId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const res = await fetch(`/api/engagement/videos/${videoId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ text }),
    });
    if (res.ok) {
      setText('');
      load();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comments</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex gap-2 mb-3">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment" />
          <Button type="submit">Post</Button>
        </form>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-auto">
            {comments.map((c) => (
              <div key={(c as any)._id || Math.random()} className="text-sm border-b pb-2">
                <div className="font-medium">{(c as any).userId || 'User'}</div>
                <div>{c.text}</div>
                <div className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</div>
              </div>
            ))}
            {comments.length === 0 && <div className="text-sm text-muted-foreground">No comments yet</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


