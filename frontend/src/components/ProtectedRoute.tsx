import { Navigate } from "react-router-dom"

type Props = { children: JSX.Element; role?: "admin" | "user" | "owner" }

export default function ProtectedRoute({ children, role }: Props) {
  const raw = typeof window !== "undefined" ? localStorage.getItem("auth") : null
  const auth = raw ? JSON.parse(raw) as { user?: { role?: string } } : null
  if (!auth?.user) return <Navigate to="/signin" replace />
  if (role && auth.user.role !== role) return <Navigate to="/signin" replace />
  return children
}