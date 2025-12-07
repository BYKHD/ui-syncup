import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface UseTransferOwnershipOptions {
  teamId: string;
  onSuccess?: () => void;
}

export function useTransferOwnership({ teamId, onSuccess }: UseTransferOwnershipOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const transferOwnership = async (newOwnerId: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/transfer-ownership`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newOwnerId, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to transfer ownership");
      }

      toast.success("Ownership transferred successfully");
      router.refresh();
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    transferOwnership,
    isLoading,
  };
}
