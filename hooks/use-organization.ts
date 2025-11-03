"use client";

import { useEffect, useState } from "react";
import axios from "axios";

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  ownerId: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  users: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}

export function useOrganization() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const response = await axios.get("/api/organization");
        setOrganization(response.data);
      } catch (err) {
        setError("Failed to fetch organization");
      } finally {
        setLoading(false);
      }
    };

    fetchOrganization();
  }, []);

  return { organization, loading, error };
}
