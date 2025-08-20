"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { 
  Building2, 
  Users, 
  UserPlus, 
  Shield, 
  Crown, 
  MoreHorizontal,
  Mail,
  Calendar,
  Trash2
} from "lucide-react"
import { toast } from "sonner"
import { inviteUserToCompany, removeUserFromCompany, updateUserRole } from "@/actions/company-actions"
import { useRouter } from "next/navigation"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type CompanyMembership = {
  companyId: string
  userId: string
  role: 'MEMBER' | 'ADMIN' | 'OWNER'
  createdAt: Date
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
    createdAt: Date
  }
}

type Company = {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
  memberships: CompanyMembership[]
  _count: {
    boards: number
    memberships: number
  }
}

interface CompanySettingsContentProps {
  company: Company
  userRole: 'MEMBER' | 'ADMIN' | 'OWNER'
  currentUserId: string
}

export function CompanySettingsContent({ company, userRole, currentUserId }: CompanySettingsContentProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER')
  const [showInviteDialog, setShowInviteDialog] = useState(false)

  const canManageUsers = ['ADMIN', 'OWNER'].includes(userRole)
  const canChangeRoles = userRole === 'OWNER'

  const getRoleBadge = (role: 'MEMBER' | 'ADMIN' | 'OWNER') => {
    const config = {
      OWNER: { icon: Crown, variant: "default" as const, color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
      ADMIN: { icon: Shield, variant: "secondary" as const, color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
      MEMBER: { icon: Users, variant: "outline" as const, color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" }
    }
    
    const { icon: Icon, color } = config[role]
    return (
      <Badge variant="secondary" className={`text-xs ${color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {role}
      </Badge>
    )
  }

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) return

    startTransition(async () => {
      try {
        const result = await inviteUserToCompany(company.id, inviteEmail.trim(), inviteRole)
        if (result.success) {
          toast.success(`User ${inviteEmail} invited successfully!`)
          setInviteEmail("")
          setShowInviteDialog(false)
          router.refresh()
        } else {
          toast.error(result.error || "Failed to invite user")
        }
      } catch (error) {
        toast.error("Failed to invite user")
      }
    })
  }

  const handleRemoveUser = async (userId: string, userEmail: string) => {
    startTransition(async () => {
      try {
        const result = await removeUserFromCompany(company.id, userId)
        if (result.success) {
          toast.success(`User ${userEmail} removed successfully`)
          router.refresh()
        } else {
          toast.error(result.error || "Failed to remove user")
        }
      } catch (error) {
        toast.error("Failed to remove user")
      }
    })
  }

  const handleChangeRole = async (userId: string, newRole: 'MEMBER' | 'ADMIN' | 'OWNER') => {
    startTransition(async () => {
      try {
        const result = await updateUserRole(company.id, userId, newRole)
        if (result.success) {
          toast.success(`User role updated to ${newRole}`)
          router.refresh()
        } else {
          toast.error(result.error || "Failed to update user role")
        }
      } catch (error) {
        toast.error("Failed to update user role")
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Company Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Building2 className="h-6 w-6" />
            <div>
              <CardTitle className="text-xl">{company.name}</CardTitle>
              <CardDescription>
                {company._count.memberships} members • {company._count.boards} boards
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Created</Label>
              <p className="font-medium">
                {new Date(company.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Company ID</Label>
              <p className="font-mono text-xs bg-muted px-2 py-1 rounded">
                {company.id}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5" />
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  Manage who has access to this company
                </CardDescription>
              </div>
            </div>
            {canManageUsers && (
              <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                      Add a new member to {company.name}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter email address"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select value={inviteRole} onValueChange={(value: 'MEMBER' | 'ADMIN') => setInviteRole(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MEMBER">Member</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowInviteDialog(false)}
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleInviteUser}
                      disabled={!inviteEmail.trim() || isPending}
                    >
                      {isPending ? "Inviting..." : "Send Invite"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {company.memberships.map((membership) => (
              <div key={membership.userId} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={membership.user.image || ""} />
                    <AvatarFallback>
                      {membership.user.name?.charAt(0) || membership.user.email.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {membership.user.name || "Unnamed User"}
                      {membership.userId === currentUserId && (
                        <span className="text-muted-foreground text-sm ml-2">(You)</span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center">
                      <Mail className="h-3 w-3 mr-1" />
                      {membership.user.email}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {getRoleBadge(membership.role)}
                  
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date(membership.createdAt).toLocaleDateString()}
                  </div>

                  {canManageUsers && membership.userId !== currentUserId && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canChangeRoles && membership.role !== 'OWNER' && (
                          <>
                            {membership.role !== 'ADMIN' && (
                              <DropdownMenuItem 
                                onClick={() => handleChangeRole(membership.userId, 'ADMIN')}
                                disabled={isPending}
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                Make Admin
                              </DropdownMenuItem>
                            )}
                            {membership.role === 'ADMIN' && (
                              <DropdownMenuItem 
                                onClick={() => handleChangeRole(membership.userId, 'MEMBER')}
                                disabled={isPending}
                              >
                                <Users className="h-4 w-4 mr-2" />
                                Make Member
                              </DropdownMenuItem>
                            )}
                            <Separator />
                          </>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem 
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove Member
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove {membership.user.name || membership.user.email} from {company.name}? 
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveUser(membership.userId, membership.user.email)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                disabled={isPending}
                              >
                                {isPending ? "Removing..." : "Remove Member"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Role Permissions Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Role Permissions</CardTitle>
          <CardDescription>
            Understanding what each role can do
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Crown className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium">Owner</p>
                <p className="text-sm text-muted-foreground">
                  Full access to company settings, can manage all members and change roles
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <p className="font-medium">Admin</p>
                <p className="text-sm text-muted-foreground">
                  Can invite and remove members, manage boards and tasks
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Users className="h-5 w-5 text-gray-600 mt-0.5" />
              <div>
                <p className="font-medium">Member</p>
                <p className="text-sm text-muted-foreground">
                  Can view and edit boards they have access to, create and manage tasks
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}