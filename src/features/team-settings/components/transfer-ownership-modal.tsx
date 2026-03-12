import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTeamMembers } from "@/features/teams/hooks/use-team-members";
import { useTransferOwnership } from "../hooks/use-transfer-ownership";
import { AlertTriangle } from "lucide-react";

interface TransferOwnershipModalProps {
  teamId: string;
  teamName: string;
}

export function TransferOwnershipModal({ teamId, teamName }: TransferOwnershipModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [confirmationText, setConfirmationText] = useState("");
  const [password, setPassword] = useState("");
  
  const { data: membersData, isLoading: isLoadingMembers } = useTeamMembers(teamId, { limit: 100 });
  const { transferOwnership, isLoading: isTransferring } = useTransferOwnership({
    teamId,
    onSuccess: () => {
      setOpen(false);
      setPassword(""); // Clear password on success
    },
  });

  // Filter for admins only
  const adminMembers = membersData?.members.filter(
    (member) => member.managementRole === "WORKSPACE_ADMIN"
  ) ?? [];

  const handleTransfer = () => {
    if (selectedMemberId && confirmationText === "transfer ownership" && password) {
      transferOwnership(selectedMemberId, password);
    }
  };

  const isConfirmEnabled = 
    selectedMemberId !== "" && 
    confirmationText === "transfer ownership" &&
    password !== "" &&
    !isTransferring;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Transfer Ownership</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Transfer Team Ownership</DialogTitle>
          <DialogDescription>
            Transfer ownership of <strong>{teamName}</strong> to another member. This action is irreversible.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">Warning</h3>
                <div className="mt-2 text-sm text-amber-700">
                  <p>
                    You will lose owner privileges and be downgraded to an Admin. The new owner will have full control over the team.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="new-owner">Select New Owner</Label>
            <Select onValueChange={setSelectedMemberId} value={selectedMemberId}>
              <SelectTrigger id="new-owner">
                <SelectValue placeholder="Select a team admin" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingMembers ? (
                  <SelectItem value="loading" disabled>Loading members...</SelectItem>
                ) : adminMembers.length === 0 ? (
                  <SelectItem value="none" disabled>No eligible admins found</SelectItem>
                ) : (
                  adminMembers.map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      {member.user.name} ({member.user.email})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {adminMembers.length === 0 && !isLoadingMembers && (
              <p className="text-xs text-muted-foreground">
                Only Team Admins can become owners. Promote a member to Admin first.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">
              Enter your password to confirm
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
            />
            <p className="text-xs text-muted-foreground">
              Re-authentication is required for this security-sensitive action.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirm">
              Type <span className="font-mono font-bold">transfer ownership</span> to confirm
            </Label>
            <Input
              id="confirm"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="transfer ownership"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isTransferring}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleTransfer} 
            disabled={!isConfirmEnabled}
          >
            {isTransferring ? "Transferring..." : "I understand, transfer ownership"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
