import { ProfileForm } from "./profile-form"

export default function ProfilePage() {
  return (
    <div className="container mx-auto flex flex-1 justify-center px-4 py-10">
      <div className="w-full max-w-2xl rounded-2xl border bg-card p-6 shadow-sm md:p-8">
        <div className="mb-6 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Profile Settings</h1>
          <p className="text-sm text-muted-foreground">
            Update your optional profile details like username, phone, and profile image URL.
          </p>
        </div>
        <ProfileForm />
      </div>
    </div>
  )
}
