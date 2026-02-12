import { useRef, useState } from "react";
import { Button } from "@/common/Button";
import Modal from "@/common/Modal";
import AddUser, { AddUserHandle, AddUserFormValues } from "./AddUser";
import UserItem from "./UserItem";
import { Card, CardContent, CardHeader, CardTitle } from "@/common/Card";
import { Plus } from "lucide-react";
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useRoles } from "@/hooks/useUsers";
import { ManagedUser } from "@/types/managed-user";

const Users = () => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [activeUser, setActiveUser] = useState<ManagedUser | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const formRef = useRef<AddUserHandle>(null);

  const { data: users = [], isLoading, error } = useUsers();
  const { data: roles = [], isLoading: isLoadingRoles } = useRoles();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const isSaving = createUserMutation.isPending || updateUserMutation.isPending;
  const isRemoving = deleteUserMutation.isPending ? activeUser?.id ?? null : null;

  const resetModalState = () => {
    setShowModal(false);
    setModalMode("add");
    setActiveUser(null);
    setSubmitError(null);
    formRef.current?.reset();
  };

  const handleModalClose = () => {
    if (isSaving) return;
    resetModalState();
  };

  const handleAddClick = () => {
    setModalMode("add");
    setActiveUser(null);
    setShowModal(true);
  };

  const handleEditUser = (user: ManagedUser) => {
    setModalMode("edit");
    setActiveUser(user);
    setShowModal(true);
  };

  const handleRemoveUser = (user: ManagedUser) => {
    setActiveUser(user);
    setShowDeleteModal(true);
  };

  const handleSaveUser = () => {
    formRef.current?.submit();
  };

  const handleAddUserSubmit = async (values: AddUserFormValues) => {
    try {
      setSubmitError(null);
      if (modalMode === "add") {
        await createUserMutation.mutateAsync({
          username: values.username,
          email: values.email,
          password: values.password || "",
          roles: values.roles,
        });
      } else if (activeUser) {
        await updateUserMutation.mutateAsync({
          id: activeUser.id,
          username: values.username,
          email: values.email,
          password: values.password || undefined,
          roles: values.roles,
        });
      }
      resetModalState();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save user";
      setSubmitError(message);
    }
  };

  const confirmDeleteUser = async () => {
    if (!activeUser) return;
    try {
      await deleteUserMutation.mutateAsync(activeUser.id);
      setShowDeleteModal(false);
      setActiveUser(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove user";
      setSubmitError(message);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-3xl">User Management</CardTitle>
            <Button onClick={handleAddClick} disabled={isLoadingRoles}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading users...
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              Error loading users: {error.message}
            </div>
          ) : users.length > 0 ? (
            users.map((user) => (
              <UserItem
                key={user.id}
                {...user}
                onEdit={handleEditUser}
                onRemove={handleRemoveUser}
                isRemoving={isRemoving === user.id}
              />
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No users found
            </div>
          )}
        </CardContent>
      </Card>
      {showModal && (
        <Modal
          title={modalMode === "add" ? "Add User" : "Edit User"}
          open={showModal}
          handleClose={handleModalClose}
          handleSave={handleSaveUser}
          saving={isSaving}
          disableSave={isSaving}
          saveLabel="Save"
        >
          <AddUser
            ref={formRef}
            onSubmit={handleAddUserSubmit}
            isSubmitting={isSaving}
            submitError={submitError}
            initialValues={
              activeUser
                ? {
                    username: activeUser.username,
                    email: activeUser.email,
                    password: "",
                    roles: activeUser.roles,
                  }
                : undefined
            }
            availableRoles={roles}
            mode={modalMode}
          />
        </Modal>
      )}
      {showDeleteModal && activeUser && (
        <Modal
          title="Confirm Removal"
          open={showDeleteModal}
          handleClose={() => setShowDeleteModal(false)}
          handleSave={confirmDeleteUser}
          saving={isRemoving === activeUser.id}
          disableSave={isRemoving === activeUser.id}
          saveLabel="Yes, Remove"
        >
          <p>
            Are you sure you want to remove user <strong>{activeUser.username}</strong>?
            This action cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
};

export default Users;
