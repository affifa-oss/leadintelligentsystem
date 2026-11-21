import { Suspense, useState } from 'react'
import { LogOut } from 'lucide-react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/auth-context'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Misc'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function MainLayout() {
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const { pathname } = useLocation()
  const { logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen">
      <Sidebar open={open} onClose={() => setOpen(false)} onLogout={() => setConfirm(true)} />
      <div className="flex min-h-screen flex-col lg:pl-64">
        <Header onMenu={() => setOpen(true)} />
        <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Suspense fallback={<div className="grid h-64 place-items-center"><span className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-100 border-t-brand-600" aria-label="Loading" /></div>}>
            <div key={pathname} className="animate-page">
              <Outlet />
            </div>
          </Suspense>
        </main>
      </div>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        size="sm"
        title="Log out?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)}>Cancel</Button>
            <Button
              variant="danger"
              icon={<LogOut className="h-4 w-4" />}
              onClick={() => {
                logout()
                navigate('/login', { replace: true })
              }}
            >
              Log out
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">You will need to sign in again to access leads.</p>
      </Modal>
    </div>
  )
}
