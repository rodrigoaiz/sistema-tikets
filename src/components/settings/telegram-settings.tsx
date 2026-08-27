"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  disconnectTelegram,
  getTelegramConnectionStatus,
  sendTelegramTest,
  startTelegramPairing,
  updateTelegramPreferences,
} from "@/lib/actions/telegram";
import { Link2, Loader2, RefreshCw, Send, Unplug } from "lucide-react";

type TelegramSettingsProps = {
  botConfigured: boolean;
  linked: boolean;
  enabled: boolean;
  notifyStudentReplies: boolean;
  notifyInboxEmails: boolean;
};

export function TelegramSettings({
  botConfigured,
  linked: initialLinked,
  enabled: initialEnabled,
  notifyStudentReplies: initialNotifyStudentReplies,
  notifyInboxEmails: initialNotifyInboxEmails,
}: TelegramSettingsProps) {
  const [linked, setLinked] = useState(initialLinked);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [notifyStudentReplies, setNotifyStudentReplies] = useState(initialNotifyStudentReplies);
  const [notifyInboxEmails, setNotifyInboxEmails] = useState(initialNotifyInboxEmails);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isPairing, startPairing] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [isRefreshing, startRefreshing] = useTransition();
  const [isTesting, startTesting] = useTransition();
  const [isDisconnecting, startDisconnecting] = useTransition();

  function generatePairingCode() {
    startPairing(async () => {
      const result = await startTelegramPairing();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setPairingCode(result.data.code);
      toast.success("Código generado. Dura 15 minutos.");
    });
  }

  function refreshStatus() {
    startRefreshing(async () => {
      const result = await getTelegramConnectionStatus();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setLinked(result.data.linked);
      setEnabled(result.data.enabled);
      setNotifyStudentReplies(result.data.notifyStudentReplies);
      setNotifyInboxEmails(result.data.notifyInboxEmails);
      if (result.data.linked) {
        setPairingCode(null);
        toast.success("Cuenta de Telegram vinculada.");
      } else {
        toast.info("Aún no se detecta la vinculación.");
      }
    });
  }

  function savePreferences(next: {
    enabled: boolean;
    notifyStudentReplies: boolean;
    notifyInboxEmails: boolean;
  }) {
    startSaving(async () => {
      const result = await updateTelegramPreferences(next);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setEnabled(next.enabled);
      setNotifyStudentReplies(next.notifyStudentReplies);
      setNotifyInboxEmails(next.notifyInboxEmails);
      toast.success("Preferencias de Telegram actualizadas.");
    });
  }

  function sendTest() {
    startTesting(async () => {
      const result = await sendTelegramTest();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Mensaje de prueba enviado a Telegram.");
    });
  }

  function disconnect() {
    startDisconnecting(async () => {
      const result = await disconnectTelegram();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setLinked(false);
      setEnabled(false);
      setPairingCode(null);
      toast.success("Telegram desvinculado.");
    });
  }

  return (
    <section className="flex flex-col gap-4 border-t border-border pt-6">
      <div>
        <h3 className="text-sm font-medium">Notificaciones por Telegram</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Recibe avisos aunque no tengas abierta la aplicación. Las nuevas respuestas de alumnos
          se envían de inmediato.
        </p>
      </div>

      {!botConfigured ? (
        <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
          El administrador debe configurar <code>TELEGRAM_BOT_TOKEN</code> en el servidor antes de
          vincular una cuenta.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                linked ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"
              }`}
            >
              {linked ? "Cuenta vinculada" : "Cuenta no vinculada"}
            </span>
            <Button type="button" variant="outline" size="sm" onClick={generatePairingCode} disabled={isPairing}>
              {isPairing ? <Loader2 className="size-3.5 animate-spin" /> : <Link2 className="size-3.5" />}
              Generar código
            </Button>
            {pairingCode ? (
              <Button type="button" variant="outline" size="sm" onClick={refreshStatus} disabled={isRefreshing}>
                {isRefreshing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                Ya lo vinculé
              </Button>
            ) : null}
          </div>

          {pairingCode ? (
            <div className="rounded-md bg-muted/60 p-4 text-sm">
              <p>Abre en Telegram el bot creado con BotFather y envíale exactamente este mensaje:</p>
              <code className="mt-2 block rounded bg-background px-3 py-2 font-mono text-sm">
                /start {pairingCode}
              </code>
              <p className="mt-2 text-muted-foreground">
                El código es temporal. Después pulsa “Ya lo vinculé”.
              </p>
            </div>
          ) : null}

          {linked ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-row items-center gap-2 space-y-0">
                <Switch
                  checked={enabled}
                  disabled={isSaving}
                  onCheckedChange={(checked) =>
                    savePreferences({ enabled: checked, notifyStudentReplies, notifyInboxEmails })
                  }
                />
                <div>
                  <p className="text-sm font-medium">Avisos activos</p>
                  <p className="text-sm text-muted-foreground">Telegram recibirá los eventos seleccionados.</p>
                </div>
              </div>
              <div className="flex flex-col gap-3 pl-9">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    size="sm"
                    checked={notifyStudentReplies}
                    disabled={!enabled || isSaving}
                    onCheckedChange={(checked) =>
                      savePreferences({ enabled, notifyStudentReplies: checked, notifyInboxEmails })
                    }
                  />
                  Nuevas respuestas de alumnos en tickets
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    size="sm"
                    checked={notifyInboxEmails}
                    disabled={!enabled || isSaving}
                    onCheckedChange={(checked) =>
                      savePreferences({ enabled, notifyStudentReplies, notifyInboxEmails: checked })
                    }
                  />
                  Nuevos correos pendientes en la bandeja
                </label>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <Button type="button" variant="outline" size="sm" onClick={sendTest} disabled={isTesting}>
                  {isTesting ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  Enviar prueba
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={disconnect} disabled={isDisconnecting}>
                  {isDisconnecting ? <Loader2 className="size-3.5 animate-spin" /> : <Unplug className="size-3.5" />}
                  Desvincular
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
