import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

export default function PasswordInput({
  className = "",
  inputClassName = "px-3 py-3",
  ...props
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className={`relative ${className}`}>
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`w-full rounded-xl border border-[#D2DEFF] pr-11 outline-none focus:border-[#1C39BB] ${inputClassName}`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        className="tap-target absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-setu-muted transition-colors hover:text-[#1C39BB]"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
      </button>
    </div>
  )
}
