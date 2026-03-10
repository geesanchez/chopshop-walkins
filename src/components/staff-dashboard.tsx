"use client";

import { useState, useEffect } from "react";
import { useQueue } from "@/hooks/use-queue";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  callNext,
  completeCut,
  skipEntry,
  removeEntry,
  markArrived,
  toggleShopOpen,
  setActiveBarbers,
  setQueueCap,
  autoCleanup,
} from "@/lib/queue-actions";
import { ChangePinDialog } from "@/components/change-pin-dialog";
import type { QueueEntryWithService } from "@/lib/supabase/types";
import Image from "next/image";
import Link from "next/link";

export function StaffDashboard() {
  const { queue, barbers, shopSettings, loading, activeCount, error } = useQueue();
  const [completingEntry, setCompletingEntry] =
    useState<QueueEntryWithService | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showChangePin, setShowChangePin] = useState(false);
  const [removingEntry, setRemovingEntry] =
    useState<QueueEntryWithService | null>(null);
  const [skippingEntry, setSkippingEntry] =
    useState<QueueEntryWithService | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Run auto-cleanup every 60 seconds to expire stale entries
  useEffect(() => {
    const interval = setInterval(() => {
      autoCleanup().catch(() => {});
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error || !shopSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive font-medium">Failed to load dashboard</p>
          <p className="text-muted-foreground text-sm mt-2">{error || "Could not fetch shop settings"}</p>
        </div>
      </div>
    );
  }

  const waitingEntries = queue.filter((e) => e.status === "waiting");
  const inProgressEntries = queue.filter((e) => e.status === "in_progress");

  async function handleAction(
    action: () => Promise<void>,
    actionId: string
  ) {
    setActionLoading(actionId);
    setActionError(null);
    try {
      await action();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setActionError(message);
      setTimeout(() => setActionError(null), 5000);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCompleteCut(barberId: string) {
    if (!completingEntry) return;
    setActionLoading("complete");
    setActionError(null);
    try {
      await completeCut(
        completingEntry.id,
        barberId,
        completingEntry.customer_name,
        completingEntry.service_id,
        completingEntry.source,
        completingEntry.called_at
      );
      setCompletingEntry(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setActionError(message);
      setTimeout(() => setActionError(null), 5000);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Image
              src="/logo.jpeg"
              alt="The Chop Shop"
              width={48}
              height={48}
              className="rounded-full"
              sizes="48px"
            />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gold">Staff Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {activeCount} / {shopSettings.queue_cap} in queue
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-border text-muted-foreground"
            onClick={() => setShowChangePin(true)}
          >
            Change PIN
          </Button>
          <Button
            onClick={() => {
              if (shopSettings.is_open && activeCount > 0) {
                setShowCloseConfirm(true);
              } else {
                handleAction(
                  () => toggleShopOpen(shopSettings.id, !shopSettings.is_open),
                  "toggle"
                );
              }
            }}
            disabled={actionLoading === "toggle"}
            className={
              shopSettings.is_open
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"
            }
          >
            {shopSettings.is_open ? "Open — Close Shop" : "Closed — Open Shop"}
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {actionError && (
        <div role="alert" aria-live="polite" className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center justify-between">
          <p className="text-destructive text-sm font-medium">{actionError}</p>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive h-6 px-2"
            onClick={() => setActionError(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Active Barbers Control */}
      <Card className="mb-6 bg-card border-border">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="font-medium">Barbers on walk-ins</p>
            <p className="text-sm text-muted-foreground">
              Affects wait time estimates
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              className="h-11 w-11 text-lg border-border"
              disabled={
                shopSettings.active_barbers <= 1 ||
                actionLoading === "barbers"
              }
              onClick={() =>
                handleAction(
                  () =>
                    setActiveBarbers(
                      shopSettings.id,
                      shopSettings.active_barbers - 1
                    ),
                  "barbers"
                )
              }
            >
              -
            </Button>
            <span className="text-2xl font-bold text-gold w-8 text-center">
              {shopSettings.active_barbers}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-11 w-11 text-lg border-border"
              disabled={
                shopSettings.active_barbers >= barbers.length ||
                actionLoading === "barbers"
              }
              onClick={() =>
                handleAction(
                  () =>
                    setActiveBarbers(
                      shopSettings.id,
                      shopSettings.active_barbers + 1
                    ),
                  "barbers"
                )
              }
            >
              +
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 bg-card border-border">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="font-medium">Queue capacity</p>
            <p className="text-sm text-muted-foreground">
              Max walk-ins allowed in line
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              className="h-11 w-11 text-lg border-border"
              disabled={
                shopSettings.queue_cap <= 1 ||
                actionLoading === "queue-cap"
              }
              onClick={() =>
                handleAction(
                  () =>
                    setQueueCap(
                      shopSettings.id,
                      shopSettings.queue_cap - 1
                    ),
                  "queue-cap"
                )
              }
            >
              -
            </Button>
            <span className="text-2xl font-bold text-gold w-8 text-center">
              {shopSettings.queue_cap}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-11 w-11 text-lg border-border"
              disabled={
                shopSettings.queue_cap >= 30 ||
                actionLoading === "queue-cap"
              }
              onClick={() =>
                handleAction(
                  () =>
                    setQueueCap(
                      shopSettings.id,
                      shopSettings.queue_cap + 1
                    ),
                  "queue-cap"
                )
              }
            >
              +
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator className="mb-6" />

      {/* In Progress */}
      {inProgressEntries.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            In Chair
          </h2>
          <div className="grid gap-3">
            {inProgressEntries.map((entry) => {
              const duration = entry.services?.duration_minutes ?? 45;
              const elapsedMin = entry.called_at
                ? (Date.now() - new Date(entry.called_at).getTime()) / 60000
                : 0;
              const isOverdue = elapsedMin > duration;

              return (
                <Card key={entry.id} className={`bg-card ${isOverdue ? "border-yellow-500/60" : "border-gold/30"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-lg truncate max-w-[180px] sm:max-w-[250px]">
                          {entry.customer_name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {entry.services?.name}
                          </Badge>
                          <Badge className="bg-gold/20 text-gold border-gold/30 text-xs">
                            In Progress
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {Math.floor(elapsedMin)} min
                          </span>
                        </div>
                      </div>
                      <Button
                        onClick={() => setCompletingEntry(entry)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Done
                      </Button>
                    </div>
                    {isOverdue && (
                      <div className="mt-3 p-2 rounded-md bg-yellow-500/10 border border-yellow-500/30">
                        <p className="text-yellow-500 text-xs font-medium">
                          Over expected time ({duration} min) — mark as done?
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Waiting Queue */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Waiting ({waitingEntries.length})
        </h2>

        {waitingEntries.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Queue is empty</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {waitingEntries.map((entry, index) => (
              <Card key={entry.id} className="bg-card border-border">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-gold w-8 text-center">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold truncate max-w-[150px] sm:max-w-[200px]">{entry.customer_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {entry.services?.name}
                        </Badge>
                        {entry.source === "remote" && (
                          <Badge
                            variant="outline"
                            className={
                              entry.arrival_status === "on_my_way"
                                ? "border-yellow-500 text-yellow-500 text-xs"
                                : "border-green-500 text-green-500 text-xs"
                            }
                          >
                            {entry.arrival_status === "on_my_way"
                              ? "On My Way"
                              : "Here"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {entry.source === "remote" &&
                      entry.arrival_status === "on_my_way" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-500 text-green-500 hover:bg-green-500/10"
                          aria-label={`Mark ${entry.customer_name} as here`}
                          onClick={() =>
                            handleAction(
                              () => markArrived(entry.id),
                              `arrived-${entry.id}`
                            )
                          }
                          disabled={actionLoading === `arrived-${entry.id}`}
                        >
                          Here
                        </Button>
                      )}
                    <Button
                      size="sm"
                      className="bg-gold hover:bg-gold-dark text-black"
                      aria-label={`Call ${entry.customer_name}`}
                      onClick={() =>
                        handleAction(
                          () => callNext(entry.id),
                          `call-${entry.id}`
                        )
                      }
                      disabled={
                        actionLoading === `call-${entry.id}` ||
                        inProgressEntries.length >= shopSettings.active_barbers
                      }
                    >
                      Call
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-yellow-600 text-yellow-600 hover:bg-yellow-600/10"
                      aria-label={`Skip ${entry.customer_name}`}
                      onClick={() => setSkippingEntry(entry)}
                    >
                      Skip
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive text-destructive hover:bg-destructive/10"
                      aria-label={`Remove ${entry.customer_name}`}
                      onClick={() => setRemovingEntry(entry)}
                    >
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Change PIN Dialog */}
      <ChangePinDialog
        open={showChangePin}
        onClose={() => setShowChangePin(false)}
      />

      {/* Complete Cut Dialog — barber selection */}
      <Dialog
        open={!!completingEntry}
        onOpenChange={() => setCompletingEntry(null)}
      >
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-gold">
              Who completed this cut?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            {completingEntry?.customer_name} —{" "}
            {completingEntry?.services?.name}
          </p>
          <div className="grid gap-2">
            {barbers.map((barber) => (
              <Button
                key={barber.id}
                variant="secondary"
                className="h-14 text-lg justify-start"
                onClick={() => handleCompleteCut(barber.id)}
                disabled={actionLoading === "complete"}
              >
                {barber.name}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Skip Confirmation Dialog */}
      <AlertDialog
        open={!!skippingEntry}
        onOpenChange={() => setSkippingEntry(null)}
      >
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Skip this person?</AlertDialogTitle>
            <AlertDialogDescription>
              This will skip <span className="font-semibold text-foreground">{skippingEntry?.customer_name}</span> and remove them from the queue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-yellow-600 hover:bg-yellow-700 text-black"
              disabled={actionLoading === "skip"}
              onClick={() => {
                if (!skippingEntry) return;
                handleAction(
                  () => skipEntry(skippingEntry.id),
                  "skip"
                ).then(() => setSkippingEntry(null));
              }}
            >
              {actionLoading === "skip" ? "Skipping..." : "Skip"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Confirmation Dialog */}
      <AlertDialog
        open={!!removingEntry}
        onOpenChange={() => setRemovingEntry(null)}
      >
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from queue?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <span className="font-semibold text-foreground">{removingEntry?.customer_name}</span> from the queue. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={actionLoading === "remove"}
              onClick={() => {
                if (!removingEntry) return;
                handleAction(
                  () => removeEntry(removingEntry.id),
                  "remove"
                ).then(() => setRemovingEntry(null));
              }}
            >
              {actionLoading === "remove" ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Close Shop Confirmation Dialog */}
      <AlertDialog
        open={showCloseConfirm}
        onOpenChange={() => setShowCloseConfirm(false)}
      >
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Close the shop?</AlertDialogTitle>
            <AlertDialogDescription>
              There {activeCount === 1 ? "is" : "are"} still <span className="font-semibold text-foreground">{activeCount} {activeCount === 1 ? "person" : "people"}</span> in the queue. Closing the shop will <span className="font-semibold text-destructive">remove all entries</span> from the queue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={actionLoading === "toggle"}
              onClick={() => {
                handleAction(
                  () => toggleShopOpen(shopSettings.id, false),
                  "toggle"
                ).then(() => setShowCloseConfirm(false));
              }}
            >
              {actionLoading === "toggle" ? "Closing..." : "Close Shop"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
