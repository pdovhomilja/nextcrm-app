'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAiBoardRequests } from '@/actions/tasks/get-ai-board-requests';
import { retryBoardGeneration } from '@/actions/tasks/retry-board-generation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface AIRequest {
  id: string;
  status: string;
  refinedPrompt: string;
  role: string;
  createdAt: Date;
  failureReason?: string | null;
  generatedBoard?: {
    id: string;
    name: string;
    createdAt: Date;
  } | null;
}

export function DebugAiRequests() {
  const router = useRouter();
  const [requests, setRequests] = useState<AIRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const [previousCompletedIds, setPreviousCompletedIds] = useState<Set<string>>(new Set());

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAiBoardRequests();
      
      if (result.success) {
        // Check for newly completed boards
        const currentCompletedIds = new Set(
          result.requests
            .filter(req => req.status === 'COMPLETED' && req.generatedBoard)
            .map(req => req.id)
        );
        
        // Find newly completed boards
        const newlyCompleted = [...currentCompletedIds].filter(
          id => !previousCompletedIds.has(id)
        );
        
        // If there are newly completed boards, refresh the router to show new boards
        if (newlyCompleted.length > 0) {
          console.log(`Detected ${newlyCompleted.length} newly completed boards. Refreshing page...`);
          router.refresh();
          toast.success(`${newlyCompleted.length} new board${newlyCompleted.length > 1 ? 's' : ''} created successfully!`);
        }
        
        setPreviousCompletedIds(currentCompletedIds);
        setRequests(result.requests);
      } else {
        console.error('Failed to load AI board requests:', result.error);
        toast.error(result.error || 'Failed to load AI board requests');
        setRequests([]); // Set empty array to show "No requests found"
      }
    } catch (error) {
      console.error('Error loading AI board requests:', error);
      toast.error('Failed to load AI board requests');
      setRequests([]); // Set empty array to show "No requests found"
    } finally {
      setLoading(false);
    }
  }, [router, previousCompletedIds]);

  const handleRetry = async (requestId: string) => {
    setRetryingIds(prev => new Set(prev).add(requestId));
    
    try {
      const result = await retryBoardGeneration(requestId);
      if (result.success) {
        toast.success(result.success);
        // Refresh the requests list
        await loadRequests();
      } else {
        toast.error(result.error || 'Failed to retry board generation');
      }
    } catch {
      toast.error('Failed to retry board generation');
    } finally {
      setRetryingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  useEffect(() => {
    loadRequests();
    
    // Set up auto-reload every 1 minute (60 seconds)
    const intervalId = setInterval(() => {
      loadRequests();
    }, 60000);
    
    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, [loadRequests]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-500';
      case 'PROCESSING': return 'bg-blue-500';
      case 'COMPLETED': return 'bg-green-500';
      case 'FAILED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>AI Board Generation Status</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Auto-refreshes every minute</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadRequests} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p>Loading...</p>
        ) : requests.length === 0 ? (
          <p>No AI board requests found.</p>
        ) : (
          requests.map((request) => (
            <div key={request.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(request.status)}>
                    {request.status}
                  </Badge>
                  {request.status === 'FAILED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRetry(request.id)}
                      disabled={retryingIds.has(request.id)}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      {retryingIds.has(request.id) ? 'Retrying...' : 'Continue'}
                    </Button>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(request.createdAt).toLocaleString()}
                </span>
              </div>
              
              <p className="text-sm">
                <strong>Role:</strong> {request.role}
              </p>
              
              {request.generatedBoard && (
                <p className="text-sm text-green-600">
                  <strong>Generated Board:</strong> {request.generatedBoard.name}
                </p>
              )}
              
              {request.failureReason && (
                <p className="text-sm text-red-600">
                  <strong>Error:</strong> {request.failureReason}
                </p>
              )}
              
              <details className="text-sm">
                <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                  View Brief
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded">
                  {request.refinedPrompt}
                </p>
              </details>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}