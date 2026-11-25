import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  cloneElement,
  isValidElement,
  useId,
} from "react";
import { Check, CircleAlert, LoaderCircle, X } from "lucide-react";
import { userError } from "../lib/supabase";

export function SkipLink({ target }: { target: string }) {
  return (
    <a
      className="skip-link"
      href={`#${target}`}
      onClick={(e) => {
        e.preventDefault();
        const main = document.getElementById(target);
        if (main) {
          main.tabIndex = -1;
          main.focus({ preventScroll: true });
          main.scrollIntoView({ behavior: "instant" });
        }
      }}
    >
      Pular para o conteúdo
    </a>
  );
}

export function Loading({
  label = "Carregando conteúdo…",
}: {
  label?: string;
}) {
  return (
    <div role="status" className="loading">
      <LoaderCircle className="spin" size={22} />
      <span>{label}</span>
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <div role="alert" className="notice error">
      <CircleAlert size={20} />
      <div>
        <p>{userError(error)}</p>
        {retry && (
          <button className="text-button" onClick={retry}>
            Tentar novamente
          </button>
        )}
      </div>
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-symbol" aria-hidden="true">
        ✳
      </span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const generatedId = useId();
  const control =
    isValidElement<{ id?: string; "aria-describedby"?: string }>(children) &&
    typeof children.type === "string" &&
    ["input", "select", "textarea"].includes(children.type)
      ? children
      : null;
  const id = control?.props.id || generatedId;
  return (
    <div className="field">
      {control ? (
        <label htmlFor={id}>{label}</label>
      ) : (
        <span id={id}>{label}</span>
      )}
      {control ? (
        cloneElement(control, {
          id,
          ...(hint ? { "aria-describedby": `${id}-hint` } : {}),
        })
      ) : (
        <div role="group" aria-labelledby={id}>
          {children}
        </div>
      )}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const focused = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = oldOverflow;
      focused?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "modal-wide" : ""}`}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-header">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Fechar" onClick={onClose}>
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
type Notice = { text: string; error: boolean };
const ToastContext = createContext<(message: string, error?: boolean) => void>(
  () => {},
);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  return (
    <ToastContext.Provider
      value={(text, error = false) => setNotice({ text, error })}
    >
      {children}
      {notice && (
        <div
          className={`toast ${notice.error ? "error" : ""}`}
          role={notice.error ? "alert" : "status"}
        >
          {notice.error ? <CircleAlert size={18} /> : <Check size={18} />}
          <span>{notice.text}</span>
          <button
            aria-label="Dispensar aviso"
            className="icon-button"
            onClick={() => setNotice(null)}
          >
            <X size={17} />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
