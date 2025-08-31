import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import React from "react";

interface CompanyAccessValidation {
  isAuthorized: boolean;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

export function useCompanyAccess(
  companyId: string,
  resourceType: "task" | "board" | "document" | "ai_query",
  resourceId?: string,
  action: string = "read",
): CompanyAccessValidation {
  const { data: session, status } = useSession();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const validateAccess = useCallback(async () => {
    // Don't validate if session is still loading
    if (status === "loading") {
      return;
    }

    // If no session, deny access
    if (status === "unauthenticated" || !session?.user?.id) {
      setIsAuthorized(false);
      setIsLoading(false);
      setError("User not authenticated");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        companyId,
        resourceType,
        action,
      });

      if (resourceId) {
        params.append("resourceId", resourceId);
      }

      const response = await fetch(`/api/company/validate-access?${params}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        setIsAuthorized(data.authorized);
        setError(data.error);
      } else {
        setIsAuthorized(false);
        setError(data.error || "Access validation failed");
      }
    } catch (err) {
      console.error("Company access validation error:", err);
      setIsAuthorized(false);
      setError("Failed to validate access");
    } finally {
      setIsLoading(false);
    }
  }, [companyId, resourceType, resourceId, action, session?.user?.id, status]);

  const retry = useCallback(() => {
    validateAccess();
  }, [validateAccess]);

  useEffect(() => {
    if (companyId && resourceType) {
      validateAccess();
    }
  }, [validateAccess, companyId, resourceType]);

  return {
    isAuthorized,
    isLoading,
    error,
    retry,
  };
}

// Higher-order component for protecting components with company access
export function withCompanyAccess<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  resourceType: "task" | "board" | "document" | "ai_query",
  action: string = "read",
) {
  return function CompanyAccessWrapper(
    props: P & { params: { cid: string }; resourceId?: string },
  ) {
    const { params, resourceId, ...otherProps } = props;
    const { isAuthorized, isLoading, error } = useCompanyAccess(
      params.cid,
      resourceType,
      resourceId,
      action,
    );

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Validating access...</p>
          </div>
        </div>
      );
    }

    if (!isAuthorized) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              {error || "You do not have permission to access this resource."}
            </p>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }

    return <WrappedComponent {...(otherProps as P)} params={params} />;
  };
}
