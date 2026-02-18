"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ChangePinDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ChangePinDialog({ open, onClose }: ChangePinDialogProps) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function reset() {
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setError("");
    setSuccess(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPin.length < 4) {
      setError("New PIN must be at least 4 digits");
      return;
    }

    if (newPin !== confirmPin) {
      setError("New PINs don't match");
      return;
    }

    if (newPin === currentPin) {
      setError("New PIN must be different from current PIN");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/change-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, newPin }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to change PIN");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-gold">
            {success ? "PIN Updated" : "Change Staff PIN"}
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <p className="text-green-500 font-medium text-sm">
                PIN changed successfully
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                All staff will need to use the new PIN
              </p>
            </div>
            <Button
              className="w-full bg-gold hover:bg-gold-dark text-black font-bold"
              onClick={handleClose}
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">
                Current PIN
              </label>
              <Input
                type="password"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                placeholder="Enter current PIN"
                className="h-12 text-center text-lg tracking-[0.3em] bg-secondary border-border"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">New PIN</label>
              <Input
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Enter new PIN"
                className="h-12 text-center text-lg tracking-[0.3em] bg-secondary border-border"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">
                Confirm New PIN
              </label>
              <Input
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Confirm new PIN"
                className="h-12 text-center text-lg tracking-[0.3em] bg-secondary border-border"
              />
            </div>

            {error && (
              <p className="text-destructive text-sm text-center">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-gold hover:bg-gold-dark text-black font-bold"
              disabled={loading || !currentPin || !newPin || !confirmPin}
            >
              {loading ? "Saving..." : "Change PIN"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
