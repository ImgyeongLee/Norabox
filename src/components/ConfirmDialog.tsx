'use client';

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { useI18n } from '@/i18n/client';

type ConfirmOptions = {
    title: string;
    body?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /** Red confirm button, and focus starts on Cancel. */
    danger?: boolean;
};
type Request = ConfirmOptions & { resolve: (ok: boolean) => void };

const ConfirmContext = createContext<(options: ConfirmOptions) => Promise<boolean>>(async () => false);

/**
 * In-app replacement for window.confirm(). Wrap the app once, then:
 *   const confirm = useConfirm();
 *   if (await confirm({ title: '…', danger: true })) { … }
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const { t } = useI18n();
    const dialog = useRef<HTMLDialogElement>(null);
    const [request, setRequest] = useState<Request | null>(null);
    const titleId = useId();
    const bodyId = useId();

    const confirm = useCallback(
        (options: ConfirmOptions) => new Promise<boolean>((resolve) => setRequest({ ...options, resolve })),
        [],
    );

    useEffect(() => {
        const d = dialog.current;
        if (request && d && !d.open) d.showModal();
    }, [request]);

    function close(ok: boolean) {
        request?.resolve(ok);
        dialog.current?.close();
        setRequest(null);
    }

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            <dialog
                ref={dialog}
                aria-labelledby={titleId}
                aria-describedby={request?.body ? bodyId : undefined}
                // Esc closes as "cancel".
                onCancel={(e) => {
                    e.preventDefault();
                    close(false);
                }}
                // A click on the backdrop (outside the panel) also cancels.
                onClick={(e) => e.target === dialog.current && close(false)}
                className="fixed inset-0 m-auto h-fit w-[min(28rem,calc(100%-2rem))] rounded-2xl border border-leaf/60 bg-pine p-0 text-lime shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
            >
                {request && (
                    <div className="p-6">
                        <h2 id={titleId} className="text-lg font-bold">
                            {request.title}
                        </h2>
                        {request.body && (
                            <p id={bodyId} className="mt-2 text-sm text-lime/70">
                                {request.body}
                            </p>
                        )}
                        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button type="button" className="btn-ghost" autoFocus={request.danger} onClick={() => close(false)}>
                                {request.cancelLabel ?? t.common.cancel}
                            </button>
                            <button
                                type="button"
                                autoFocus={!request.danger}
                                onClick={() => close(true)}
                                className={request.danger ? 'btn bg-danger text-pine hover:bg-danger/85' : 'btn-primary'}
                            >
                                {request.confirmLabel ?? t.common.confirm}
                            </button>
                        </div>
                    </div>
                )}
            </dialog>
        </ConfirmContext.Provider>
    );
}

export const useConfirm = () => useContext(ConfirmContext);
