import { useRef, useState } from "react";
import { Button } from "@/common/Button";
import Modal from "@/common/Modal";
import AddAuthor, { AddAuthorHandle, AddAuthorFormValues } from "./AddAuthor";
import AuthorItem from "./AuthorItem";
import { Card, CardContent, CardHeader, CardTitle } from "@/common/Card";
import { Plus } from "lucide-react";
import { useAuthors, useCreateAuthor, useUpdateAuthor, useDeleteAuthor } from "@/hooks/useAuthors";
import { Author } from "@/types/author";

const Authors = () => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [activeAuthor, setActiveAuthor] = useState<Author | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const formRef = useRef<AddAuthorHandle>(null);

  const { data: authors = [], isLoading, error } = useAuthors();
  const createAuthorMutation = useCreateAuthor();
  const updateAuthorMutation = useUpdateAuthor();
  const deleteAuthorMutation = useDeleteAuthor();

  const isSaving = createAuthorMutation.isPending || updateAuthorMutation.isPending;
  const isRemoving = deleteAuthorMutation.isPending ? activeAuthor?.id ?? null : null;

  const resetModalState = () => {
    setShowModal(false);
    setModalMode("add");
    setActiveAuthor(null);
    setSubmitError(null);
    formRef.current?.reset();
  };

  const handleModalClose = () => {
    if (isSaving) return;
    resetModalState();
  };

  const handleAddClick = () => {
    setModalMode("add");
    setActiveAuthor(null);
    setShowModal(true);
  };

  const handleEditAuthor = (author: Author) => {
    setModalMode("edit");
    setActiveAuthor(author);
    setShowModal(true);
  };

  const handleRemoveAuthor = (author: Author) => {
    setActiveAuthor(author);
    setShowDeleteModal(true);
  };

  const handleSaveAuthor = () => {
    formRef.current?.submit();
  };

  const handleAddAuthorSubmit = async (values: AddAuthorFormValues) => {
    try {
      setSubmitError(null);
      if (modalMode === "add") {
        await createAuthorMutation.mutateAsync(values.name);
      } else if (activeAuthor) {
        await updateAuthorMutation.mutateAsync({ ...activeAuthor, name: values.name });
      }
      resetModalState();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save author";
      setSubmitError(message);
    }
  };

  const confirmDeleteAuthor = async () => {
    if (!activeAuthor) return;
    try {
      await deleteAuthorMutation.mutateAsync(activeAuthor.id);
      setShowDeleteModal(false);
      setActiveAuthor(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove author";
      setSubmitError(message);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-3xl">Authors</CardTitle>
            <Button onClick={handleAddClick}>
              <Plus className="h-4 w-4 mr-2" />
              Add Author
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading authors...
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              Error loading authors: {error.message}
            </div>
          ) : authors.length > 0 ? (
            authors.map((author) => (
              <AuthorItem
                key={author.id}
                {...author}
                onEdit={handleEditAuthor}
                onRemove={handleRemoveAuthor}
                isRemoving={isRemoving === author.id}
              />
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No authors found
            </div>
          )}
        </CardContent>
      </Card>
      {showModal && (
        <Modal
          title={modalMode === "add" ? "Add Author" : "Edit Author"}
          open={showModal}
          handleClose={handleModalClose}
          handleSave={handleSaveAuthor}
          saving={isSaving}
          disableSave={isSaving}
          saveLabel="Save"
        >
          <AddAuthor
            ref={formRef}
            onSubmit={handleAddAuthorSubmit}
            isSubmitting={isSaving}
            submitError={submitError}
            initialValues={{ name: activeAuthor?.name ?? "" }}
          />
        </Modal>
      )}
      {showDeleteModal && activeAuthor && (
        <Modal
          title="Confirm Removal"
          open={showDeleteModal}
          handleClose={() => setShowDeleteModal(false)}
          handleSave={confirmDeleteAuthor}
          saving={isRemoving === activeAuthor.id}
          disableSave={isRemoving === activeAuthor.id}
          saveLabel="Yes, Remove"
        >
          <p>
            Are you sure you want to remove <strong>{activeAuthor.name}</strong>?
            This action cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
};

export default Authors;
